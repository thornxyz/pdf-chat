from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    ForeignKey,
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

Base = declarative_base()


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    upload_time = Column(DateTime, default=func.now(), nullable=False)

    chats = relationship(
        "Chat", back_populates="document", cascade="all, delete-orphan"
    )


class Chat(Base):
    __tablename__ = "chats"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    timestamp = Column(DateTime, default=func.now(), nullable=False)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)

    # Relationship to document
    document = relationship("Document", back_populates="chats")
