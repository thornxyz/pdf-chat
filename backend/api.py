from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import main
import os
from typing import List

app = FastAPI(title="PDF Question Answering API")


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

        with open(file_path, "wb") as pdf_file:
            pdf_file.write(content)

        vectorstore = main.process_pdf(file.filename)

        return JSONResponse(
            content={
                "message": "PDF uploaded and processed successfully",
                "filename": file.filename,
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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
    return main.get_available_documents()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
