import fitz
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.documents import Document
import os
from datetime import datetime
from typing import Dict, List
from dotenv import load_dotenv
import sqlite3

DB_PATH = "database.db"


def initialize_database():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            upload_time TEXT NOT NULL,
            user_id TEXT
        )
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS chats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            document_id INTEGER NOT NULL,
            timestamp TEXT NOT NULL,
            question TEXT NOT NULL,
            answer TEXT NOT NULL,
            FOREIGN KEY (document_id) REFERENCES documents (id)
        )
        """
    )

    conn.commit()
    conn.close()


initialize_database()

if not load_dotenv():
    raise EnvironmentError("Failed to load .env file.")

if "GOOGLE_API_KEY" not in os.environ:
    raise EnvironmentError("GOOGLE_API_KEY not found in environment variables")

PDFS_DIR = "pdfs/"
VECTORSTORES_DIR = "vectorstores/"

for directory in [PDFS_DIR, VECTORSTORES_DIR]:
    os.makedirs(directory, exist_ok=True)

try:
    embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-exp-03-07")
    model = ChatGoogleGenerativeAI(
        model="gemini-2.0-flash",
        temperature=0,
        max_tokens=None,
        timeout=None,
        max_retries=2,
    )
except Exception as e:
    raise RuntimeError(f"Failed to initialize Google Gemini API: {str(e)}")

template = """
You are an assistant that answers questions in **Markdown format**. Using the following retrieved information, answer the user question. If you don't know the answer, say that you don't know. Keep the answer as concise and well-formatted as possible using Markdown.
Question: {question}
Context: {context}
Answer (in Markdown):
"""


def get_vectorstore_path(pdf_name: str) -> str:
    base_name = os.path.splitext(pdf_name)[0]
    return os.path.join(VECTORSTORES_DIR, f"{base_name}.faiss")


def save_chat_history(pdf_name: str, question: str, answer: str):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM documents WHERE filename = ?", (pdf_name,))
    document = cursor.fetchone()
    if not document:
        raise ValueError(f"Document {pdf_name} not found in the database")

    document_id = document[0]

    cursor.execute(
        """
        INSERT INTO chats (document_id, timestamp, question, answer)
        VALUES (?, datetime('now'), ?, ?)
        """,
        (document_id, question, answer),
    )

    conn.commit()
    conn.close()


def load_chat_history(pdf_name: str) -> List[Dict]:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM documents WHERE filename = ?", (pdf_name,))
    document = cursor.fetchone()
    if not document:
        return []

    document_id = document[0]

    cursor.execute(
        """
        SELECT timestamp, question, answer FROM chats
        WHERE document_id = ?
        ORDER BY timestamp ASC
        """,
        (document_id,),
    )

    chats = [
        {"timestamp": row[0], "question": row[1], "answer": row[2]}
        for row in cursor.fetchall()
    ]

    conn.close()
    return chats


def get_available_documents() -> List[str]:
    try:
        return [f for f in os.listdir(PDFS_DIR) if f.endswith(".pdf")]
    except Exception as e:
        print(f"Error listing documents: {e}")
        return []


def load_pdf_with_pymupdf(file_path):
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


def process_pdf(file_name: str) -> FAISS:
    pdf_path = os.path.join(PDFS_DIR, file_name)
    vectorstore_path = get_vectorstore_path(file_name)

    try:
        if os.path.exists(vectorstore_path):
            return FAISS.load_local(
                vectorstore_path, embeddings, allow_dangerous_deserialization=True
            )

        documents = load_pdf_with_pymupdf(pdf_path)
        if not documents:
            raise ValueError("No text content could be extracted from the PDF")

        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=2000, chunk_overlap=300, add_start_index=True
        )
        chunked_docs = text_splitter.split_documents(documents)

        if not chunked_docs:
            raise ValueError("No text chunks were generated from the PDF")

        db = FAISS.from_documents(chunked_docs, embeddings)
        db.save_local(vectorstore_path)
        return db
    except Exception as e:
        if os.path.exists(vectorstore_path):
            import shutil

            shutil.rmtree(vectorstore_path)
        raise RuntimeError(f"Failed to process PDF: {str(e)}")


def retrieve_docs(db, query, k=4):
    if not db:
        raise ValueError("Vector store is not initialized")
    try:
        return db.similarity_search(query, k)
    except Exception as e:
        raise RuntimeError(f"Error searching for similar documents: {str(e)}")


def question_pdf(question: str, documents, pdf_name: str) -> str:
    if not documents:
        return "I couldn't find any relevant information in the PDF to answer your question."

    try:
        context = "\n\n".join([doc.page_content for doc in documents])
        prompt = ChatPromptTemplate.from_template(template)
        chain = prompt | model
        answer = chain.invoke({"question": question, "context": context})
        answer_text = str(answer.content) if hasattr(answer, "content") else str(answer)
        save_chat_history(pdf_name, question, answer_text)
        return answer_text
    except Exception as e:
        error_msg = f"Error generating answer: {str(e)}"
        print(error_msg)
        return "I encountered an error while trying to answer your question. Please try again."
