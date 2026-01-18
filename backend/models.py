from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    ForeignKey,
    LargeBinary,
    Float,
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    fhe_public_key = Column(LargeBinary, nullable=True)  # FHE public key for encryption

    # Relationship to documents (users can own documents)
    documents = relationship(
        "Document", back_populates="user", cascade="all, delete-orphan"
    )


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    upload_time = Column(DateTime, default=func.now(), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Relationships
    user = relationship("User", back_populates="documents")
    chats = relationship(
        "Chat", back_populates="document", cascade="all, delete-orphan"
    )
    chunks = relationship(
        "EncryptedChunk", back_populates="document", cascade="all, delete-orphan"
    )


class EncryptedChunk(Base):
    """Stores encrypted document chunks with their FHE-encrypted embeddings"""
    __tablename__ = "encrypted_chunks"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    chunk_text = Column(Text, nullable=False)  # Plaintext chunk for retrieval
    encrypted_embedding = Column(LargeBinary, nullable=True)  # TFHE ciphertext
    embedding_norm = Column(Float, nullable=True)  # Pre-computed L2 norm

    # Relationship
    document = relationship("Document", back_populates="chunks")


class Chat(Base):
    __tablename__ = "chats"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    timestamp = Column(DateTime, default=func.now(), nullable=False)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)

    # Relationship to document
    document = relationship("Document", back_populates="chats")

