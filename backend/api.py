from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import main
import os
from typing import List, Dict
import traceback
import sqlite3

app = FastAPI(title="PDF-Chat API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Question(BaseModel):
    pdf_name: str
    question: str


@app.post("/upload/")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="File must be a PDF")

    try:
        file_path = os.path.join(main.PDFS_DIR, file.filename)
        content = await file.read()

        try:
            with open(file_path, "wb") as pdf_file:
                pdf_file.write(content)
        except Exception as e:
            if os.path.exists(file_path):
                os.remove(file_path)
            raise HTTPException(
                status_code=500, detail=f"Failed to save PDF file: {str(e)}"
            )

        conn = sqlite3.connect(main.DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO documents (filename, upload_time, user_id)
            VALUES (?, datetime('now'), NULL)
            """,
            (file.filename,),
        )
        conn.commit()
        conn.close()

        try:
            vectorstore = main.process_pdf(file.filename)
        except Exception as e:
            if os.path.exists(file_path):
                os.remove(file_path)
            raise HTTPException(
                status_code=500, detail=f"Failed to process PDF: {str(e)}"
            )

        return JSONResponse(
            content={
                "message": "PDF uploaded and processed successfully",
                "filename": file.filename,
            }
        )
    except Exception as e:
        print("Error during PDF upload:", traceback.format_exc())
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while handling the PDF: {str(e)}",
        )
    finally:
        await file.close()


@app.post("/ask/")
async def ask_question(query: Question):
    try:
        if not os.path.exists(os.path.join(main.PDFS_DIR, query.pdf_name)):
            raise HTTPException(
                status_code=404, detail=f"PDF {query.pdf_name} not found"
            )

        vectorstore = main.process_pdf(query.pdf_name)

        documents = main.retrieve_docs(vectorstore, query.question)

        answer = main.question_pdf(query.question, documents, query.pdf_name)

        return {"answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/documents/")
async def list_documents() -> List[str]:
    conn = sqlite3.connect(main.DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT filename FROM documents")
    documents = [row[0] for row in cursor.fetchall()]
    conn.close()
    return documents


@app.get("/chat-history/{pdf_name}")
async def get_chat_history(pdf_name: str) -> List[Dict]:
    try:
        return main.load_chat_history(pdf_name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
