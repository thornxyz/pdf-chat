import fitz
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.documents import Document
import os
from typing import List
import shutil
from dotenv import load_dotenv
from database import save_chat_history
import time

load_dotenv()

if "GOOGLE_API_KEY" not in os.environ:
    raise EnvironmentError("GOOGLE_API_KEY not found in environment variables")

# Directory setup
PDFS_DIR = "../data/pdfs/"
VECTORSTORES_DIR = "../data/vectorstores/"

for directory in [PDFS_DIR, VECTORSTORES_DIR]:
    os.makedirs(directory, exist_ok=True)

# Initialize Google Gemini API
try:
    embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-exp-03-07")
    model = ChatGoogleGenerativeAI(model="gemini-3-flash-preview")
except Exception as e:
    raise RuntimeError(f"Failed to initialize Google Gemini API: {str(e)}")


# Prompt template for question answering
template = """
You are an assistant that answers questions in **Markdown format**. Using the following retrieved information, answer the user question. If you don't know the answer, say that you don't know. Keep the answer as concise and well-formatted as possible using Markdown.
Question: {question}
Context: {context}
Answer (in Markdown):
"""


# Get the path for storing the vector store for a given PDF
def get_vectorstore_path(pdf_name: str) -> str:
    base_name = os.path.splitext(pdf_name)[0]
    return os.path.join(VECTORSTORES_DIR, f"{base_name}.faiss")


# Get list of available PDF files in the PDFS_DIR
def get_available_documents() -> List[str]:
    try:
        return [f for f in os.listdir(PDFS_DIR) if f.endswith(".pdf")]
    except Exception as e:
        print(f"Error listing documents: {e}")
        return []


# Load and extract text from PDF using PyMuPDF
def load_pdf_with_pymupdf(file_path: str) -> List[Document]:
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"PDF file not found: {file_path}")

    try:
        doc = fitz.open(file_path)
        documents = []
        for i, page in enumerate(doc):
            try:
                text = page.get_text()
                if text.strip():
                    documents.append(Document(page_content=text, metadata={"page": i}))
            except Exception as e:
                print(f"Error extracting text from page {i}: {e}")
        return documents
    except Exception as e:
        raise RuntimeError(f"Failed to open or process PDF file: {str(e)}")
    finally:
        if "doc" in locals():
            doc.close()


# Process a PDF file and create/load its vector store
def process_pdf(file_name: str) -> FAISS:
    pdf_path = os.path.join(PDFS_DIR, file_name)
    vectorstore_path = get_vectorstore_path(file_name)

    try:
        # Check if vector store already exists
        if os.path.exists(vectorstore_path):
            return FAISS.load_local(
                vectorstore_path, embeddings, allow_dangerous_deserialization=True
            )

        # Load and process PDF
        documents = load_pdf_with_pymupdf(pdf_path)
        if not documents:
            raise ValueError("No text content could be extracted from the PDF")

        # Large chunk size to reduce total number of requests
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=7000, chunk_overlap=100, add_start_index=True
        )
        chunked_docs = text_splitter.split_documents(documents)

        if not chunked_docs:
            raise ValueError("No text chunks were generated from the PDF")

        db = None
        batch_size = 5  # 5 requests per minute allowed
        batch = []

        for i, doc in enumerate(chunked_docs, 1):
            batch.append(doc)

            # When batch is full or it's the last doc
            if len(batch) == batch_size or i == len(chunked_docs):
                print(f"Embedding batch: docs {i - len(batch) + 1} to {i}")
                batch_db = FAISS.from_documents(batch, embeddings)

                if db is None:
                    db = batch_db
                else:
                    db.merge_from(batch_db)

                batch = []  # Reset batch

                if i != len(chunked_docs):  # Avoid sleep after final batch
                    print("Sleeping for 60 seconds to respect rate limits...")
                    time.sleep(60)

        db.save_local(vectorstore_path)
        return db

    except Exception as e:
        if os.path.exists(vectorstore_path):
            shutil.rmtree(vectorstore_path)
        raise RuntimeError(f"Failed to process PDF: {str(e)}")


# Retrieve relevant documents from the vector store
def retrieve_docs(db: FAISS, query: str, k: int = 4) -> List[Document]:
    if not db:
        raise ValueError("Vector store is not initialized")
    try:
        return db.similarity_search(query, k)
    except Exception as e:
        raise RuntimeError(f"Error searching for similar documents: {str(e)}")


# Generate an answer to a question based on retrieved documents
def question_pdf(question: str, documents: List[Document], pdf_name: str) -> str:
    if not documents:
        return "I couldn't find any relevant information in the PDF to answer your question."

    try:
        # Combine document content
        context = "\n\n".join([doc.page_content for doc in documents])

        # Create prompt and chain
        prompt = ChatPromptTemplate.from_template(template)
        chain = prompt | model

        # Generate answer
        answer = chain.invoke({"question": question, "context": context})
        answer_text = str(answer.content) if hasattr(answer, "content") else str(answer)

        # Save to chat history
        save_chat_history(pdf_name, question, answer_text)

        return answer_text
    except Exception as e:
        error_msg = f"Error generating answer: {str(e)}"
        print(error_msg)
        return "I encountered an error while trying to answer your question. Please try again."


# Delete a PDF file and its associated vector store
def delete_pdf(pdf_name: str) -> None:
    pdf_path = os.path.join(PDFS_DIR, pdf_name)
    vectorstore_path = get_vectorstore_path(pdf_name)

    if os.path.exists(pdf_path):
        try:
            os.remove(pdf_path)
        except Exception as e:
            print(f"Error deleting PDF file {pdf_path}: {e}")

    if os.path.exists(vectorstore_path):
        try:
            shutil.rmtree(vectorstore_path)
        except Exception as e:
            print(f"Error deleting vector store {vectorstore_path}: {e}")
