from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pdf_processor
import database
import os
from typing import List, Dict
import traceback

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


# Upload a PDF file, save it to disk, store in database, and process for vector search
@app.post("/upload/")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="File must be a PDF")

    try:
        file_path = os.path.join(pdf_processor.PDFS_DIR, file.filename)
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

        database.insert_document(file.filename)

        try:
            pdf_processor.process_pdf(file.filename)
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


# Process a question against a specific PDF using vector search and AI
@app.post("/ask/")
async def ask_question(query: Question):
    try:
        pdf_path = os.path.join(pdf_processor.PDFS_DIR, query.pdf_name)
        if not os.path.exists(pdf_path):
            raise HTTPException(
                status_code=404, detail=f"PDF {query.pdf_name} not found"
            )

        vectorstore = pdf_processor.process_pdf(query.pdf_name)

        documents = pdf_processor.retrieve_docs(vectorstore, query.question)

        answer = pdf_processor.question_pdf(query.question, documents, query.pdf_name)

        return {"answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Get list of all uploaded documents from database
@app.get("/documents/")
async def list_documents() -> List[str]:
    return database.get_all_documents()


# Get chat history for a specific PDF document
@app.get("/chat-history/{pdf_name}")
async def get_chat_history(pdf_name: str) -> List[Dict]:
    try:
        # URL decode the pdf_name parameter
        import urllib.parse

        decoded_pdf_name = urllib.parse.unquote(pdf_name)
        return database.load_chat_history(decoded_pdf_name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Delete a PDF document and all associated data
@app.delete("/documents/{pdf_name}")
async def delete_document(pdf_name: str):
    try:
        import urllib.parse

        decoded_pdf_name = urllib.parse.unquote(pdf_name)

        try:
            database.delete_document(decoded_pdf_name)
        except Exception as db_error:
            print(f"Warning: Error during database deletion: {str(db_error)}")

        try:
            pdf_processor.delete_pdf(decoded_pdf_name)
        except Exception as fs_error:
            print(f"Warning: Error during file deletion: {str(fs_error)}")

        return JSONResponse(
            content={"message": f"Document {decoded_pdf_name} deleted successfully"}
        )
    except Exception as e:
        print("Error during document deletion:", traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while deleting the document: {str(e)}",
        )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
