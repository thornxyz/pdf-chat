from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from typing import Dict, List, Optional, cast
from contextlib import contextmanager
import os
from models import Base, Document, Chat, User, EncryptedChunk

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


# ============== User FHE Key Management ==============


def update_user_fhe_key(user_id: int, public_key: bytes) -> None:
    """Store user's FHE public key"""
    with get_db_session() as session:
        session.query(User).filter(User.id == user_id).update(
            {User.fhe_public_key: public_key}
        )


def get_user_fhe_key(user_id: int) -> Optional[bytes]:
    """Retrieve user's FHE public key"""
    with get_db_session() as session:
        result = session.query(User.fhe_public_key).filter(User.id == user_id).scalar()
        return result


# ============== Document Management ==============


def insert_document(filename: str, user_id: int) -> int:
    """Insert a new document record and return its ID"""
    with get_db_session() as session:
        document = Document(filename=filename, user_id=user_id)
        session.add(document)
        session.flush()  # Get the ID
        return cast(int, document.id)


def get_document_id(filename: str) -> int:
    """Get the document ID for a given filename"""
    with get_db_session() as session:
        document = session.query(Document).filter(Document.filename == filename).first()
        if not document:
            raise ValueError(f"Document {filename} not found in the database")
        document_id: int = cast(int, document.id)
        return document_id


def get_all_documents(user_id: int) -> List[str]:
    """Get all document filenames for a specific user"""
    with get_db_session() as session:
        documents = (
            session.query(Document.filename).filter(Document.user_id == user_id).all()
        )
        filenames = [doc[0] for doc in documents]
    return filenames


def delete_document(filename: str, user_id: int) -> None:
    """Delete a document and its associated data (chunks, chats)"""
    with get_db_session() as session:
        document = (
            session.query(Document)
            .filter(Document.filename == filename, Document.user_id == user_id)
            .first()
        )
        if document:
            session.delete(document)


def check_document_ownership(filename: str, user_id: int) -> bool:
    """Check if a document belongs to a specific user"""
    with get_db_session() as session:
        document = (
            session.query(Document)
            .filter(Document.filename == filename, Document.user_id == user_id)
            .first()
        )
        return document is not None


# ============== Encrypted Chunks ==============


def insert_encrypted_chunk(
    document_id: int,
    chunk_index: int,
    chunk_text: str,
    encrypted_embedding: bytes,
    embedding_norm: float,
) -> None:
    """Store an encrypted document chunk with its FHE-encrypted embedding"""
    with get_db_session() as session:
        chunk = EncryptedChunk(
            document_id=document_id,
            chunk_index=chunk_index,
            chunk_text=chunk_text,
            encrypted_embedding=encrypted_embedding,
            embedding_norm=embedding_norm,
        )
        session.add(chunk)


def get_encrypted_chunks(document_id: int) -> List[Dict]:
    """Get all encrypted chunks for a document"""
    with get_db_session() as session:
        chunks = (
            session.query(EncryptedChunk)
            .filter(EncryptedChunk.document_id == document_id)
            .order_by(EncryptedChunk.chunk_index)
            .all()
        )
        return [
            {
                "id": chunk.id,
                "chunk_index": chunk.chunk_index,
                "chunk_text": chunk.chunk_text,
                "encrypted_embedding": chunk.encrypted_embedding,
                "embedding_norm": chunk.embedding_norm,
            }
            for chunk in chunks
        ]


# ============== Chat History ==============


def save_chat_history(pdf_name: str, question: str, answer: str) -> None:
    """Save a chat interaction to the database"""
    with get_db_session() as session:
        document = session.query(Document).filter(Document.filename == pdf_name).first()
        if not document:
            raise ValueError(f"Document {pdf_name} not found in the database")
        chat = Chat(document_id=document.id, question=question, answer=answer)
        session.add(chat)


def load_chat_history(pdf_name: str) -> List[Dict]:
    """Load chat history for a specific document"""
    with get_db_session() as session:
        document = session.query(Document).filter(Document.filename == pdf_name).first()
        if not document:
            return []
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


# Initialize database when module is imported
initialize_database()
