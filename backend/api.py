from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import List, Dict, Annotated
import database
import os
import json
import traceback
from datetime import timedelta
import fitz  # PyMuPDF for PDF text extraction
from auth import (
    authenticate_user,
    create_access_token,
    get_current_user,
    Token,
    User,
    UserCreate,
    create_user,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)
import embedding_service
import fhe_service
from google import genai
from backend.llm_config import CHAT_MODEL

app = FastAPI(title="PDF-Chat API (FHE-RAG)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Google Genai client for LLM responses
genai_client = genai.Client()

# Directory for storing PDFs
PDFS_DIR = "../data/pdfs/"
os.makedirs(PDFS_DIR, exist_ok=True)


# Pydantic models
class Question(BaseModel):
    pdf_name: str
    question: str


class FHEKeyUpload(BaseModel):
    public_key: str  # Base64 encoded public key


# ============== Authentication Routes ==============


@app.post("/auth/register", response_model=User)
async def register(user_create: UserCreate):
    try:
        user = create_user(user_create)
        return user
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")


@app.post("/auth/token", response_model=Token)
async def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
):
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return Token(access_token=access_token, token_type="bearer")


@app.get("/auth/me", response_model=User)
async def read_users_me(
    current_user: Annotated[User, Depends(get_current_user)],
):
    return current_user


# ============== FHE Key Management ==============


@app.post("/fhe/generate-keys")
async def generate_fhe_keys():
    """Generate FHE keypair (for demo - in production, do this client-side)"""
    import base64

    public_key, secret_key = fhe_service.FHEContext.generate_keys()
    return {
        "public_key": base64.b64encode(public_key).decode(),
        "secret_key": base64.b64encode(secret_key).decode(),
        "message": "Store secret_key securely client-side. Upload public_key via /fhe/upload-key",
    }


@app.post("/fhe/upload-key")
async def upload_fhe_public_key(
    key_data: FHEKeyUpload,
    current_user: User = Depends(get_current_user),
):
    """Store user's FHE public key for encrypting their embeddings"""
    import base64

    try:
        public_key_bytes = base64.b64decode(key_data.public_key)
        database.update_user_fhe_key(current_user.id, public_key_bytes)
        return {"message": "FHE public key stored successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid key format: {str(e)}")


# ============== Document Upload ==============


def extract_text_from_pdf(file_path: str) -> List[str]:
    """Extract text from PDF and split into chunks"""
    doc = fitz.open(file_path)
    chunks = []

    for page in doc:
        text = str(page.get_text())
        if text.strip():
            # Split into ~1000 char chunks with overlap
            words = text.split()
            chunk_words = []
            current_len = 0

            for word in words:
                chunk_words.append(word)
                current_len += len(word) + 1

                if current_len >= 1000:
                    chunks.append(" ".join(chunk_words))
                    # Keep last 100 chars for overlap
                    overlap_start = max(0, len(chunk_words) - 20)
                    chunk_words = chunk_words[overlap_start:]
                    current_len = sum(len(w) + 1 for w in chunk_words)

            if chunk_words:
                chunks.append(" ".join(chunk_words))

    doc.close()
    return chunks


@app.post("/upload/")
async def upload_pdf(
    file: UploadFile = File(...), current_user: User = Depends(get_current_user)
):
    """Upload PDF, extract text, generate embeddings, encrypt, and store"""
    if not file.filename or not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="File must be a PDF")

    file_path = None
    try:
        # Save PDF file
        safe_filename = f"{current_user.id}_{file.filename}"
        file_path = os.path.join(PDFS_DIR, safe_filename)
        content = await file.read()

        with open(file_path, "wb") as pdf_file:
            pdf_file.write(content)

        # Extract text chunks
        chunks = extract_text_from_pdf(file_path)
        if not chunks:
            os.remove(file_path)
            raise HTTPException(status_code=400, detail="No text content found in PDF")

        # Insert document record
        doc_id = database.insert_document(safe_filename, current_user.id)

        # Generate embeddings using Google API
        embeddings = embedding_service.embed_documents(chunks)

        # Get user's FHE public key (or use default for demo)
        public_key = database.get_user_fhe_key(current_user.id)
        fhe_context = fhe_service.FHEContext(public_key)

        # Encrypt and store each chunk
        for i, (chunk_text, embedding) in enumerate(zip(chunks, embeddings)):
            # Quantize and compute norm for similarity search
            _, norm = fhe_service.quantize_embedding(embedding)

            # Encrypt the embedding
            encrypted_embedding = fhe_context.encrypt_vector(embedding)

            # Store in database
            database.insert_encrypted_chunk(
                document_id=doc_id,
                chunk_index=i,
                chunk_text=chunk_text,
                encrypted_embedding=encrypted_embedding,
                embedding_norm=norm,
            )

        return JSONResponse(
            content={
                "message": "PDF uploaded and processed with FHE encryption",
                "filename": safe_filename,
                "original_filename": file.filename,
                "chunks_processed": len(chunks),
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        print("Error during PDF upload:", traceback.format_exc())
        if file_path and os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while handling the PDF: {str(e)}",
        )
    finally:
        if file_path and os.path.exists(file_path):
            os.remove(file_path)
        await file.close()


# ============== Question Answering with FHE ==============


@app.post("/ask/")
async def ask_question(query: Question, current_user: User = Depends(get_current_user)):
    """Answer questions using FHE-encrypted similarity search"""
    try:
        # Check document ownership
        if not database.check_document_ownership(query.pdf_name, current_user.id):
            raise HTTPException(
                status_code=403, detail="You don't have access to this PDF"
            )

        # Get encrypted chunks for this document
        doc_id = database.get_document_id(query.pdf_name)
        chunks_data = database.get_encrypted_chunks(doc_id)

        if not chunks_data:
            raise HTTPException(status_code=404, detail="No indexed content found")

        # Generate query embedding
        query_embedding = embedding_service.embed_query(query.question)

        # Get user's FHE context
        public_key = database.get_user_fhe_key(current_user.id)
        fhe_context = fhe_service.FHEContext(public_key)

        # Encrypt query embedding
        encrypted_query = fhe_context.encrypt_vector(query_embedding)

        # Compute encrypted similarity scores
        encrypted_embeddings = [c["encrypted_embedding"] for c in chunks_data]
        norms = [c["embedding_norm"] for c in chunks_data]

        encrypted_scores = fhe_service.compute_encrypted_similarity(
            encrypted_embeddings, encrypted_query, norms, fhe_context
        )

        # In real FHE, client would decrypt. Here we use simulation.
        # Get user's secret key for decryption (in production: done client-side)
        scores = fhe_service.decrypt_scores(encrypted_scores, b"", fhe_context)

        # Get top-k chunks
        top_k_indices = fhe_service.get_top_k_indices(scores, k=4)
        relevant_chunks = [chunks_data[i]["chunk_text"] for i in top_k_indices]

        # Build context and generate answer using Gemini
        context = "\n\n".join(relevant_chunks)

        response = genai_client.models.generate_content(
            model=CHAT_MODEL,
            contents=f"""You are an assistant that answers questions in Markdown format. 
Using the following retrieved information, answer the user question. 
If you don't know the answer, say that you don't know.

Question: {query.question}

Context:
{context}

Answer (in Markdown):""",
        )

        answer = response.text or ""

        # Save to chat history
        database.save_chat_history(query.pdf_name, query.question, answer)

        return {"answer": answer, "chunks_used": len(relevant_chunks)}

    except HTTPException:
        raise
    except Exception as e:
        print("Error during question:", traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ask/stream")
async def ask_question_stream(
    query: Question, current_user: User = Depends(get_current_user)
):
    """Stream answer tokens using server-sent events."""
    # Do all validations and retrieval up front to allow proper HTTP errors
    if not database.check_document_ownership(query.pdf_name, current_user.id):
        raise HTTPException(status_code=403, detail="You don't have access to this PDF")

    doc_id = database.get_document_id(query.pdf_name)
    chunks_data = database.get_encrypted_chunks(doc_id)

    if not chunks_data:
        raise HTTPException(status_code=404, detail="No indexed content found")

    query_embedding = embedding_service.embed_query(query.question)

    public_key = database.get_user_fhe_key(current_user.id)
    fhe_context = fhe_service.FHEContext(public_key)

    encrypted_query = fhe_context.encrypt_vector(query_embedding)

    encrypted_embeddings = [c["encrypted_embedding"] for c in chunks_data]
    norms = [c["embedding_norm"] for c in chunks_data]

    encrypted_scores = fhe_service.compute_encrypted_similarity(
        encrypted_embeddings, encrypted_query, norms, fhe_context
    )

    scores = fhe_service.decrypt_scores(encrypted_scores, b"", fhe_context)

    top_k_indices = fhe_service.get_top_k_indices(scores, k=4)
    relevant_chunks = [chunks_data[i]["chunk_text"] for i in top_k_indices]

    context = "\n\n".join(relevant_chunks)

    prompt = f"""You are an assistant that answers questions in Markdown format. 
Using the following retrieved information, answer the user question. 
If you don't know the answer, say that you don't know.

Question: {query.question}

Context:
{context}

Answer (in Markdown):"""

    def event_stream():
        answer_parts: list[str] = []
        try:
            stream = genai_client.models.generate_content_stream(
                model=CHAT_MODEL,
                contents=prompt,
            )

            for chunk in stream:
                text = getattr(chunk, "text", None) or ""
                if not text:
                    continue
                answer_parts.append(text)
                payload = json.dumps({"delta": text})
                yield f"data: {payload}\n\n"

            answer = "".join(answer_parts)
            database.save_chat_history(query.pdf_name, query.question, answer)
            yield "data: [DONE]\n\n"
        except Exception as e:
            error_msg = str(e)
            yield f"data: [ERROR] {error_msg}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


# ============== Document Management ==============


@app.get("/documents/")
async def list_documents(
    current_user: User = Depends(get_current_user),
) -> List[Dict]:
    documents = database.get_all_documents(current_user.id)
    return [
        {"filename": doc, "display_name": doc.split("_", 1)[1] if "_" in doc else doc}
        for doc in documents
    ]


@app.get("/chat-history/{pdf_name}")
async def get_chat_history(
    pdf_name: str, current_user: User = Depends(get_current_user)
) -> List[Dict]:
    import urllib.parse

    decoded_pdf_name = urllib.parse.unquote(pdf_name)

    if not database.check_document_ownership(decoded_pdf_name, current_user.id):
        raise HTTPException(status_code=403, detail="You don't have access to this PDF")

    return database.load_chat_history(decoded_pdf_name)


@app.delete("/documents/{pdf_name}")
async def delete_document(
    pdf_name: str, current_user: User = Depends(get_current_user)
):
    import urllib.parse

    decoded_pdf_name = urllib.parse.unquote(pdf_name)

    if not database.check_document_ownership(decoded_pdf_name, current_user.id):
        raise HTTPException(status_code=403, detail="You don't have access to this PDF")

    try:
        database.delete_document(decoded_pdf_name, current_user.id)
    except Exception as db_error:
        print(f"Warning: Error during database deletion: {str(db_error)}")

    # Delete PDF file
    pdf_path = os.path.join(PDFS_DIR, decoded_pdf_name)
    if os.path.exists(pdf_path):
        os.remove(pdf_path)

    return JSONResponse(
        content={"message": f"Document {decoded_pdf_name} deleted successfully"}
    )
