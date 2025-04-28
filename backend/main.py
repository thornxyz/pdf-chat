import fitz
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.documents import Document
import os
import json
from datetime import datetime
from typing import Dict, List
from dotenv import load_dotenv

load_dotenv()

PDFS_DIR = "pdfs/"
VECTORSTORES_DIR = "vectorstores/"
CHATS_DIR = "chats/"

for directory in [PDFS_DIR, VECTORSTORES_DIR, CHATS_DIR]:
    os.makedirs(directory, exist_ok=True)

embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-exp-03-07")

model = ChatGoogleGenerativeAI(
    model="gemini-2.0-flash",
    temperature=0,
    max_tokens=None,
    timeout=None,
    max_retries=2,
)

template = """
You are an assistant that answers questions. Using the following retrieved information, answer the user question. If you don't know the answer, say that you don't know. Keep the answer as short as possible.
Question: {question} 
Context: {context} 
Answer:
"""


def get_vectorstore_path(pdf_name: str) -> str:
    base_name = os.path.splitext(pdf_name)[0]
    return os.path.join(VECTORSTORES_DIR, f"{base_name}.faiss")


def get_chat_history_path(pdf_name: str) -> str:
    base_name = os.path.splitext(pdf_name)[0]
    return os.path.join(CHATS_DIR, f"{base_name}.json")


def save_chat_history(pdf_name: str, question: str, answer: str):
    chat_file = get_chat_history_path(pdf_name)
    chat_entry = {
        "timestamp": datetime.now().isoformat(),
        "question": question,
        "answer": answer,
    }
    try:
        with open(chat_file, "r") as f:
            history = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        history = []
    history.append(chat_entry)
    with open(chat_file, "w") as f:
        json.dump(history, f, indent=2)


def load_chat_history(pdf_name: str) -> List[Dict]:
    chat_file = get_chat_history_path(pdf_name)
    try:
        with open(chat_file, "r") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []


def get_available_documents() -> List[str]:
    return [f for f in os.listdir(PDFS_DIR) if f.endswith(".pdf")]


def load_pdf_with_pymupdf(file_path):
    doc = fitz.open(file_path)
    documents = []
    for i, page in enumerate(doc):
        text = page.get_text()
        if text.strip():
            documents.append(Document(page_content=text, metadata={"page": i}))
    return documents


def process_pdf(file_name: str) -> FAISS:
    pdf_path = os.path.join(PDFS_DIR, file_name)
    vectorstore_path = get_vectorstore_path(file_name)
    if os.path.exists(vectorstore_path):
        return FAISS.load_local(
            vectorstore_path, embeddings, allow_dangerous_deserialization=True
        )
    documents = load_pdf_with_pymupdf(pdf_path)
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=2000, chunk_overlap=300, add_start_index=True
    )
    chunked_docs = text_splitter.split_documents(documents)
    db = FAISS.from_documents(chunked_docs, embeddings)
    db.save_local(vectorstore_path)
    return db


def upload_pdf(file):
    file_path = os.path.join(PDFS_DIR, file.name)
    with open(file_path, "wb") as f:
        f.write(file.getbuffer())
    return process_pdf(file.name)


def retrieve_docs(db, query, k=4):
    return db.similarity_search(query, k)


def question_pdf(question: str, documents, pdf_name: str) -> str:
    context = "\n\n".join([doc.page_content for doc in documents])
    prompt = ChatPromptTemplate.from_template(template)
    chain = prompt | model
    answer = chain.invoke({"question": question, "context": context})
    answer_text = str(answer.content) if hasattr(answer, "content") else str(answer)
    save_chat_history(pdf_name, question, answer_text)
    return answer_text
