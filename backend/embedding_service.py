"""
Embedding service using Google Gemini native SDK.
Uses gemini-embedding-001 with task types for optimal RAG performance.
"""

from dotenv import load_dotenv
from google import genai
from google.genai import types
from backend.llm_config import EMBEDDING_MODEL, EMBEDDING_DIMENSIONS

load_dotenv()

# Initialize the Google Genai client
client = genai.Client()


def embed_documents(
    texts: list[str], dimensions: int = EMBEDDING_DIMENSIONS
) -> list[list[float]]:
    """
    Generate embeddings for document chunks using RETRIEVAL_DOCUMENT task type.

    Args:
        texts: List of text chunks to embed
        dimensions: Output embedding dimensions (768, 1536, or 3072)

    Returns:
        List of embedding vectors
    """
    if not texts:
        return []

    result = client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=texts,
        config=types.EmbedContentConfig(
            task_type="RETRIEVAL_DOCUMENT",
            output_dimensionality=dimensions,
        ),
    )
    return [list(e.values or []) for e in result.embeddings or []]


def embed_query(query: str, dimensions: int = EMBEDDING_DIMENSIONS) -> list[float]:
    """
    Generate embedding for a query using RETRIEVAL_QUERY task type.

    Args:
        query: The search query text
        dimensions: Output embedding dimensions (768, 1536, or 3072)

    Returns:
        Embedding vector for the query
    """
    result = client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=[query],
        config=types.EmbedContentConfig(
            task_type="RETRIEVAL_QUERY",
            output_dimensionality=dimensions,
        ),
    )
    return list((result.embeddings[0].values if result.embeddings else []) or [])
