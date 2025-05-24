import sqlite3
from typing import Dict, List, Optional, Callable, TypeVar, Any
from contextlib import contextmanager

DB_PATH = "database.db"

T = TypeVar("T")


@contextmanager
def get_db_connection():
    """Context manager for database connections"""
    conn = sqlite3.connect(DB_PATH)
    try:
        yield conn
    finally:
        conn.close()


def execute_db_operation(operation: Callable[[sqlite3.Connection], T]) -> T:
    """Execute a database operation with proper connection handling"""
    with get_db_connection() as conn:
        return operation(conn)


# Initialize the SQLite database with required tables
def initialize_database():
    def _initialize(conn: sqlite3.Connection):
        cursor = conn.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                filename TEXT NOT NULL,
                upload_time TEXT NOT NULL
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

    execute_db_operation(_initialize)


# Insert a new document record into the database
def insert_document(filename: str) -> None:
    def _insert(conn: sqlite3.Connection):
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO documents (filename, upload_time)
            VALUES (?, datetime('now'))
            """,
            (filename,),
        )
        conn.commit()

    execute_db_operation(_insert)


# Get the document ID for a given filename
def get_document_id(filename: str) -> int:
    def _get_id(conn: sqlite3.Connection) -> int:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM documents WHERE filename = ?", (filename,))
        document = cursor.fetchone()

        if not document:
            raise ValueError(f"Document {filename} not found in the database")

        return document[0]

    return execute_db_operation(_get_id)


# Save a chat interaction to the database
def save_chat_history(pdf_name: str, question: str, answer: str) -> None:
    def _save(conn: sqlite3.Connection):
        cursor = conn.cursor()
        document_id = get_document_id(pdf_name)

        cursor.execute(
            """
            INSERT INTO chats (document_id, timestamp, question, answer)
            VALUES (?, datetime('now'), ?, ?)
            """,
            (document_id, question, answer),
        )
        conn.commit()

    execute_db_operation(_save)


# Load chat history for a specific document
def load_chat_history(pdf_name: str) -> List[Dict]:
    def _load(conn: sqlite3.Connection) -> List[Dict]:
        cursor = conn.cursor()

        try:
            document_id = get_document_id(pdf_name)
        except ValueError:
            return []

        cursor.execute(
            """
            SELECT timestamp, question, answer FROM chats
            WHERE document_id = ?
            ORDER BY timestamp ASC
            """,
            (document_id,),
        )

        return [
            {"timestamp": row[0], "question": row[1], "answer": row[2]}
            for row in cursor.fetchall()
        ]

    return execute_db_operation(_load)


# Get all document filenames from the database
def get_all_documents() -> List[str]:
    def _get_all(conn: sqlite3.Connection) -> List[str]:
        cursor = conn.cursor()
        cursor.execute("SELECT filename FROM documents")
        return [row[0] for row in cursor.fetchall()]

    return execute_db_operation(_get_all)


# Delete a document and its associated chat history from the database
def delete_document(filename: str) -> None:
    def _delete(conn: sqlite3.Connection):
        cursor = conn.cursor()

        try:
            # Check if the document exists
            cursor.execute("SELECT id FROM documents WHERE filename = ?", (filename,))
            document = cursor.fetchone()

            if document:
                document_id = document[0]
                cursor.execute(
                    "DELETE FROM chats WHERE document_id = ?", (document_id,)
                )
                cursor.execute("DELETE FROM documents WHERE id = ?", (document_id,))
                conn.commit()
        except Exception as e:
            print(f"Error deleting document from database: {e}")

    execute_db_operation(_delete)


# Initialize database when module is imported
initialize_database()
