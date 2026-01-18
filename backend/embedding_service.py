"""
Embedding service using Google Gemini native SDK.
Uses gemini-embedding-001 with task types for optimal RAG performance.
"""

import os
from typing import Optional
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

# Initialize the Google Genai client
client = genai.Client()

# Model configuration
EMBEDDING_MODEL = "gemini-embedding-001"
EMBEDDING_DIMENSIONS = 768  # Can be 768, 1536, or 3072


def embed_documents(texts: list[str], dimensions: int = EMBEDDING_DIMENSIONS) -> list[list[float]]:
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
    return [list(e.values) for e in result.embeddings]


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
    return list(result.embeddings[0].values)


def embed_batch(
    texts: list[str],
    task_type: str = "RETRIEVAL_DOCUMENT",
    dimensions: int = EMBEDDING_DIMENSIONS,
    batch_size: int = 100,
) -> list[list[float]]:
    """
    Batch embed texts with automatic chunking for large inputs.
    
    Args:
        texts: List of texts to embed
        task_type: RETRIEVAL_DOCUMENT, RETRIEVAL_QUERY, SEMANTIC_SIMILARITY, etc.
        dimensions: Output embedding dimensions
        batch_size: Number of texts per API call
    
    Returns:
        List of embedding vectors
    """
    all_embeddings = []
    
    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        result = client.models.embed_content(
            model=EMBEDDING_MODEL,
            contents=batch,
            config=types.EmbedContentConfig(
                task_type=task_type,
                output_dimensionality=dimensions,
            ),
        )
        all_embeddings.extend([list(e.values) for e in result.embeddings])
    
    return all_embeddings
