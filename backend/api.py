from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import List, Dict, Annotated
import pdf_processor
import database
import os
import traceback
from datetime import timedelta
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

app = FastAPI(title="PDF-Chat API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Authentication routes
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


class Question(BaseModel):
    pdf_name: str
    question: str


# Upload a PDF file, save it to disk, store in database, and process for vector search
@app.post("/upload/")
async def upload_pdf(
    file: UploadFile = File(...), current_user: User = Depends(get_current_user)
):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="File must be a PDF")

    try:
        # Create user-specific filename to prevent conflicts
        safe_filename = f"{current_user.id}_{file.filename}"
        file_path = os.path.join(pdf_processor.PDFS_DIR, safe_filename)
        content = await file.read()

        try:
            with open(file_path, "wb") as pdf_file:
                pdf_file.write(content)
        except Exception as e:
            if os.path.exists(file_path):
                os.remove(file_path)
            raise HTTPException(
                status_code=500, detail=f"Failed to save PDF file: {str(e)}"
            )

        database.insert_document(safe_filename, current_user.id)

        try:
            pdf_processor.process_pdf(safe_filename)
        except Exception as e:
            if os.path.exists(file_path):
                os.remove(file_path)
            raise HTTPException(
                status_code=500, detail=f"Failed to process PDF: {str(e)}"
            )

        return JSONResponse(
            content={
                "message": "PDF uploaded and processed successfully",
                "filename": safe_filename,
                "original_filename": file.filename,
            }
        )
    except Exception as e:
        print("Error during PDF upload:", traceback.format_exc())
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while handling the PDF: {str(e)}",
        )
    finally:
        await file.close()


# Process a question against a specific PDF using vector search and AI
@app.post("/ask/")
async def ask_question(query: Question, current_user: User = Depends(get_current_user)):
    try:
        # Check if user owns this document
        if not database.check_document_ownership(query.pdf_name, current_user.id):
            raise HTTPException(
                status_code=403, detail="You don't have access to this PDF"
            )

        pdf_path = os.path.join(pdf_processor.PDFS_DIR, query.pdf_name)
        if not os.path.exists(pdf_path):
            raise HTTPException(
                status_code=404, detail=f"PDF {query.pdf_name} not found"
            )

        vectorstore = pdf_processor.process_pdf(query.pdf_name)

        documents = pdf_processor.retrieve_docs(vectorstore, query.question)

        answer = pdf_processor.question_pdf(query.question, documents, query.pdf_name)

        return {"answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Get list of all uploaded documents from database
@app.get("/documents/")
async def list_documents(
    current_user: User = Depends(get_current_user),
) -> List[Dict]:
    documents = database.get_all_documents(current_user.id)
    # Return both safe filename and original filename for display
    return [
        {"filename": doc, "display_name": doc.split("_", 1)[1] if "_" in doc else doc}
        for doc in documents
    ]


# Get chat history for a specific PDF document
@app.get("/chat-history/{pdf_name}")
async def get_chat_history(
    pdf_name: str, current_user: User = Depends(get_current_user)
) -> List[Dict]:
    try:
        # URL decode the pdf_name parameter
        import urllib.parse

        decoded_pdf_name = urllib.parse.unquote(pdf_name)

        # Check if user owns this document
        if not database.check_document_ownership(decoded_pdf_name, current_user.id):
            raise HTTPException(
                status_code=403, detail="You don't have access to this PDF"
            )

        return database.load_chat_history(decoded_pdf_name)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Delete a PDF document and all associated data
@app.delete("/documents/{pdf_name}")
async def delete_document(
    pdf_name: str, current_user: User = Depends(get_current_user)
):
    try:
        import urllib.parse

        decoded_pdf_name = urllib.parse.unquote(pdf_name)

        # Check if user owns this document
        if not database.check_document_ownership(decoded_pdf_name, current_user.id):
            raise HTTPException(
                status_code=403, detail="You don't have access to this PDF"
            )

        try:
            database.delete_document(decoded_pdf_name, current_user.id)
        except Exception as db_error:
            print(f"Warning: Error during database deletion: {str(db_error)}")

        try:
            pdf_processor.delete_pdf(decoded_pdf_name)
        except Exception as fs_error:
            print(f"Warning: Error during file deletion: {str(fs_error)}")

        return JSONResponse(
            content={"message": f"Document {decoded_pdf_name} deleted successfully"}
        )
    except HTTPException:
        raise
    except Exception as e:
        print("Error during document deletion:", traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while deleting the document: {str(e)}",
        )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
