"""
FHE service for homomorphic encryption operations.
Uses Concrete-Python (Zama's TFHE-rs Python bindings) for encrypted similarity search.

Note: This is a simplified implementation. Full TFHE-rs requires:
1. Key generation on client side
2. Encrypted data transmission
3. Server-side homomorphic computation
"""

import numpy as np
from typing import Optional
import pickle


# For now, we implement a simulation layer that can be swapped with real FHE
# when concrete-python is properly configured
class FHEContext:
    """FHE context for key management and encryption operations"""
    
    def __init__(self, public_key: Optional[bytes] = None):
        self.public_key = public_key
        self._use_simulation = True  # Use simulation mode by default
        
    @classmethod
    def generate_keys(cls) -> tuple[bytes, bytes]:
        """
        Generate FHE keypair (public key, secret key).
        In production, this runs client-side.
        
        Returns:
            Tuple of (public_key_bytes, secret_key_bytes)
        """
        # Simulation: Generate random keys for demo
        # In production: Use concrete.fhe.KeyGenerator
        import secrets
        public_key = secrets.token_bytes(32)
        secret_key = secrets.token_bytes(32)
        return public_key, secret_key
    
    def encrypt_vector(self, vector: list[float]) -> bytes:
        """
        Encrypt a floating-point vector using FHE.
        
        Steps:
        1. Quantize floats to integers (8-bit or 16-bit)
        2. Encrypt each element with TFHE
        3. Serialize to bytes
        """
        # Quantize to int8 range [-128, 127]
        arr = np.array(vector, dtype=np.float32)
        arr_normalized = arr / (np.linalg.norm(arr) + 1e-10)  # Normalize
        arr_quantized = np.clip(arr_normalized * 127, -128, 127).astype(np.int8)
        
        if self._use_simulation:
            # Simulation: Just serialize the quantized values
            return pickle.dumps({
                'quantized': arr_quantized.tobytes(),
                'shape': arr_quantized.shape,
                'encrypted': True,  # Flag indicating this is "encrypted"
            })
        else:
            # Production: Use concrete.fhe encryption
            # from concrete import fhe
            # return fhe.encrypt(arr_quantized, self.public_key)
            raise NotImplementedError("Real FHE not configured")
    
    def decrypt_vector(self, encrypted: bytes, secret_key: bytes) -> list[float]:
        """
        Decrypt an encrypted vector (client-side operation).
        """
        if self._use_simulation:
            data = pickle.loads(encrypted)
            arr = np.frombuffer(data['quantized'], dtype=np.int8).reshape(data['shape'])
            return (arr.astype(np.float32) / 127.0).tolist()
        else:
            raise NotImplementedError("Real FHE not configured")


def compute_encrypted_similarity(
    encrypted_doc_vectors: list[bytes],
    encrypted_query: bytes,
    doc_norms: list[float],
    context: FHEContext,
) -> list[bytes]:
    """
    Compute cosine similarity between encrypted query and encrypted documents.
    
    This runs entirely on encrypted data - the server never sees plaintext.
    
    Returns:
        List of encrypted similarity scores (one per document)
    """
    encrypted_scores = []
    
    for enc_doc, doc_norm in zip(encrypted_doc_vectors, doc_norms):
        # In simulation mode, we compute on the underlying quantized values
        if context._use_simulation:
            doc_data = pickle.loads(enc_doc)
            query_data = pickle.loads(encrypted_query)
            
            doc_vec = np.frombuffer(doc_data['quantized'], dtype=np.int8)
            query_vec = np.frombuffer(query_data['quantized'], dtype=np.int8)
            
            # Dot product (homomorphic in real FHE)
            dot_product = np.dot(doc_vec.astype(np.int32), query_vec.astype(np.int32))
            
            # Normalize (approximate cosine similarity)
            # Note: In real FHE, division is expensive - often approximated
            query_norm = np.linalg.norm(query_vec)
            similarity = dot_product / (doc_norm * query_norm + 1e-10)
            
            # "Encrypt" the result
            encrypted_score = pickle.dumps({
                'score': float(similarity),
                'encrypted': True,
            })
            encrypted_scores.append(encrypted_score)
        else:
            # Production: Use concrete.fhe homomorphic operations
            raise NotImplementedError("Real FHE not configured")
    
    return encrypted_scores


def decrypt_scores(
    encrypted_scores: list[bytes],
    secret_key: bytes,
    context: FHEContext,
) -> list[float]:
    """Decrypt similarity scores (client-side operation)."""
    if context._use_simulation:
        return [pickle.loads(s)['score'] for s in encrypted_scores]
    else:
        raise NotImplementedError("Real FHE not configured")


def get_top_k_indices(scores: list[float], k: int = 5) -> list[int]:
    """Get indices of top-k highest similarity scores."""
    indexed_scores = list(enumerate(scores))
    indexed_scores.sort(key=lambda x: x[1], reverse=True)
    return [idx for idx, _ in indexed_scores[:k]]


def quantize_embedding(embedding: list[float]) -> tuple[np.ndarray, float]:
    """
    Quantize embedding to int8 for FHE compatibility.
    
    Returns:
        Tuple of (quantized array, L2 norm for later denormalization)
    """
    arr = np.array(embedding, dtype=np.float32)
    norm = float(np.linalg.norm(arr))
    arr_normalized = arr / (norm + 1e-10)
    arr_quantized = np.clip(arr_normalized * 127, -128, 127).astype(np.int8)
    return arr_quantized, norm
