from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from typing import Dict, List
from contextlib import contextmanager
import os
from models import Base, Document, Chat

os.makedirs("../data", exist_ok=True)

DB_PATH = "sqlite:///../data/database.db"

engine = create_engine(DB_PATH, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@contextmanager
def get_db_session():
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


# Initialize the SQLite database with required tables
def initialize_database():
    Base.metadata.create_all(bind=engine)


# Insert a new document record into the database
def insert_document(filename: str) -> None:
    with get_db_session() as session:
        document = Document(filename=filename)
        session.add(document)


# Get the document ID for a given filename
def get_document_id(filename: str) -> int:
    with get_db_session() as session:
        document = session.query(Document).filter(Document.filename == filename).first()
        if not document:
            raise ValueError(f"Document {filename} not found in the database")
        return document.id


# Save a chat interaction to the database
def save_chat_history(pdf_name: str, question: str, answer: str) -> None:
    with get_db_session() as session:
        document = session.query(Document).filter(Document.filename == pdf_name).first()
        if not document:
            raise ValueError(f"Document {pdf_name} not found in the database")

        chat = Chat(document_id=document.id, question=question, answer=answer)
        session.add(chat)


# Load chat history for a specific document
def load_chat_history(pdf_name: str) -> List[Dict]:
    with get_db_session() as session:
        document = session.query(Document).filter(Document.filename == pdf_name).first()
        if not document:
            return []

        # Get all chats for this document ordered by timestamp
        chats = (
            session.query(Chat)
            .filter(Chat.document_id == document.id)
            .order_by(Chat.timestamp.asc())
            .all()
        )

        return [
            {
                "timestamp": chat.timestamp.isoformat(),
                "question": chat.question,
                "answer": chat.answer,
            }
            for chat in chats
        ]


# Get all document filenames from the database
def get_all_documents() -> List[str]:
    with get_db_session() as session:
        documents = session.query(Document).all()
        return [doc.filename for doc in documents]


# Delete a document and its associated chat history from the database
def delete_document(filename: str) -> None:
    with get_db_session() as session:
        try:
            document = (
                session.query(Document).filter(Document.filename == filename).first()
            )
            if document:
                session.delete(document)
        except Exception as e:
            print(f"Error deleting document from database: {e}")
            raise


# Initialize database when module is imported
initialize_database()
