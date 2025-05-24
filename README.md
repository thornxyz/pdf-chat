# ChatPDF - PDF Question Answering System

A full-stack application that allows users to upload PDF documents and ask questions about their content. The backend processes the documents using Natural Language Processing (NLP) to answer the questions, and the frontend provides an intuitive interface for users to interact with the system.

## Technologies Used

### Backend

- **Framework**: FastAPI
- **Libraries**: LangChain, PyMuPDF, FAISS
- **Database**: SQLite for storing document metadata and chat history, FAISS for vector database storage. PDFs are stored on disk.
- **AI/ML**: Google Generative AI (Gemini 2.0 Flash for text generation, Gemini Embedding for embeddings)
- **Additional Libraries**: Python-dotenv, Pydantic, Python-multipart

### Frontend

- **Framework**: React.js (v19.0.0)
- **Language**: TypeScript
- **Build Tool**: Vite (v6.3.1)
- **Styling**: TailwindCSS (v4.1.4) with Typography plugin
- **Libraries**:
  - Axios for API communication
  - React Icons for UI icons
  - React Markdown for rendering markdown responses
  - React Select for document selection dropdown

## Installation

### Prerequisites

- Python 3.10+
- Node.js 16+
- npm or yarn

### Backend Setup

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Create a virtual environment and activate it:
   ```bash
   python -m venv venv
   # On Windows
   venv\Scripts\activate
   # On macOS/Linux
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file in the `backend` directory and add your Google API key:
   ```env
   GOOGLE_API_KEY=your_google_api_key_here
   ```
5. Start the backend server:
   ```bash
   uvicorn api:app --reload
   ```

### Environment Setup

The `.env` file is crucial for the application to function correctly. It should be placed in the `backend` directory and contain:

```env
GOOGLE_API_KEY=your_google_api_key_here
```

> **Note**: You can obtain a Google API key from the [Google AI Studio](https://aistudio.google.com/app/apikey). The application uses Google's Gemini models for both embeddings and text generation.

### Frontend Setup

1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   > **Note**: The frontend will be accessible at `http://localhost:5173` by default.

## Database Setup

The application uses SQLite for storing document metadata and chat history. The database is automatically initialized when the backend starts.

### Database Schema

- **`documents` Table**:

  - `id` (INTEGER): Primary key.
  - `filename` (TEXT): Name of the uploaded PDF file.
  - `upload_time` (TEXT): Timestamp of when the file was uploaded.

- **`chats` Table**:
  - `id` (INTEGER): Primary key.
  - `document_id` (INTEGER): Foreign key referencing the `documents` table.
  - `timestamp` (TEXT): Timestamp of the chat entry.
  - `question` (TEXT): The question asked by the user.
  - `answer` (TEXT): The answer provided by the system.

The database file is named `database.db` and is located in the `backend` directory. No manual setup is required; it will be created and initialized automatically when the backend server starts.

## Usage

1. **Start the Backend**:

   ```bash
   cd backend
   uvicorn api:app --reload
   ```

2. **Start the Frontend**:

   ```bash
   cd frontend
   npm run dev
   ```

3. **Access the Application**:

   - Open your browser to `http://localhost:5173`
   - Upload a PDF document using the green upload button
   - Select the uploaded document from the dropdown
   - Start asking questions about the PDF content

4. **Features**:
   - **Upload PDF**: Click the "+" button to upload new PDF files
   - **Select Document**: Use the dropdown to switch between uploaded documents
   - **Ask Questions**: Type questions in the chat input and press Enter
   - **Delete Documents**: Use the trash icon to delete documents and their data
   - **View History**: Chat history is automatically saved and restored

## API Documentation

### Base URL

The backend server runs at `http://localhost:8000`.

### Endpoints

#### 1. **Upload PDF**

- **URL**: `/upload/`
- **Method**: `POST`
- **Description**: Uploads a PDF document to the server and processes it for question answering.
- **Request Body**:
  - `file` (form-data): The PDF file to upload.
- **Response**:
  - `200 OK`: JSON object with a success message and the filename.
  - `400 Bad Request`: If the file is not a PDF.
  - `500 Internal Server Error`: If there is an error during file upload or processing.

#### 2. **Ask Question**

- **URL**: `/ask/`
- **Method**: `POST`
- **Description**: Submits a question about a specific PDF and retrieves an answer.
- **Request Body** (JSON):
  ```json
  {
    "pdf_name": "<string>",
    "question": "<string>"
  }
  ```
- **Response**:
  - `200 OK`: JSON object with the answer.
  - `404 Not Found`: If the specified PDF is not found.
  - `500 Internal Server Error`: If there is an error during question processing.

#### 3. **List Documents**

- **URL**: `/documents/`
- **Method**: `GET`
- **Description**: Retrieves a list of all uploaded PDF documents.
- **Response**:
  - `200 OK`: JSON array of document names.

#### 4. **Get Chat History**

- **URL**: `/chat-history/{pdf_name}`
- **Method**: `GET`
- **Description**: Retrieves the chat history (questions and answers) for a specific PDF.
- **Path Parameter**:
  - `pdf_name` (string): The name of the PDF file (URL encoded).
- **Response**:
  - `200 OK`: JSON array of chat history entries.
  - `404 Not Found`: If the specified PDF is not found.
  - `500 Internal Server Error`: If there is an error retrieving the chat history.

#### 5. **Delete Document**

- **URL**: `/documents/{pdf_name}`
- **Method**: `DELETE`
- **Description**: Deletes a PDF document and all associated data (chat history, vector store).
- **Path Parameter**:
  - `pdf_name` (string): The name of the PDF file (URL encoded).
- **Response**:
  - `200 OK`: JSON object with a success message.
  - `500 Internal Server Error`: If there is an error during deletion.

## High-Level Design (HLD)

The application is a full-stack system designed to process and interact with PDF documents. It consists of two main components: the backend and the frontend. Below is an overview of the architecture:

### Backend

- **PDF Processing**: Handles the upload and parsing of PDF documents. Extracts text using PyMuPDF and generates embeddings using Google Generative AI (Gemini Embedding model).
- **Question Answering**: Uses LangChain and FAISS to retrieve relevant content and answer user queries using Google's Gemini 2.0 Flash model.
- **Database Management**: Stores metadata about uploaded PDFs and chat history in SQLite.
- **API Layer**: Exposes RESTful endpoints for the frontend to interact with the backend.
- **Vector Storage**: Uses FAISS for efficient similarity search of document embeddings.

### Frontend

- **User Interface**: Built with React.js and styled using TailwindCSS v4. Provides an intuitive interface for uploading PDFs, asking questions, and viewing chat history.
- **State Management**: Manages application state using React hooks with local storage for persistence.
- **API Integration**: Communicates with the backend using Axios to fetch and display data.
- **Document Management**: Includes features for selecting, uploading, and deleting PDF documents.
- **Responsive Design**: Fully responsive interface that works on desktop and mobile devices.

### Interaction Flow

1. User uploads a PDF via the frontend.
2. The backend processes the PDF, extracts text, and stores embeddings in FAISS.
3. User submits a question about the PDF.
4. The backend retrieves relevant content and generates an answer.
5. The frontend displays the answer and updates the chat history.

## Low-Level Design (LLD)

### Backend

#### Key Components

1. **API Endpoints**:

   - `/upload/`: Handles PDF uploads and processing.
   - `/ask/`: Processes user questions and returns answers.
   - `/documents/`: Lists all uploaded PDFs.
   - `/chat-history/{pdf_name}`: Retrieves chat history for a specific PDF.
   - `/documents/{pdf_name}`: Deletes a PDF and associated data.

2. **PDF Processing** (`pdf_processor.py`):

   - Extracts text using PyMuPDF (fitz library).
   - Generates embeddings using Google Generative AI Embedding model.
   - Chunks documents using RecursiveCharacterTextSplitter (2000 chars, 300 overlap).
   - Stores embeddings in FAISS vector database.

3. **Database** (`database.py`):

   - SQLite database with `documents` and `chats` tables.
   - Context manager for safe database operations.
   - Automatic database initialization on startup.

4. **Vector Store**:
   - FAISS for storing and querying document embeddings.
   - Each PDF gets its own vector store file.
   - Supports similarity search for relevant document retrieval.

#### Interactions

- **PDF Upload**: Validates file type, extracts text, generates embeddings, and stores metadata.
- **Question Answering**: Retrieves relevant embeddings, generates a response, and logs the interaction.

### Frontend

#### Key Components

1. **Components**:

   - `App.tsx`: Main application component with state management.
   - `chat.tsx`: Chat interface with message display and input handling.
   - `header.tsx`: Navigation header with document selection and upload.

2. **Features**:

   - Document upload with drag-and-drop support.
   - Document selection dropdown with search.
   - Real-time chat interface with markdown support.
   - Persistent chat history across sessions.
   - Document deletion functionality.
   - Responsive design for mobile and desktop.

3. **API Integration**:

   - Uses Axios for HTTP requests to backend.
   - Handles file uploads with FormData.
   - URL encoding for document names with special characters.

4. **Styling**:
   - TailwindCSS v4 for modern, responsive design.
   - Typography plugin for markdown rendering.
   - Custom responsive breakpoints and utility classes.

#### Interactions

- **PDF Upload**: Sends the file to the backend and updates the document list.
- **Question Submission**: Sends the question to the backend and updates the chat history.

## Complete Source Code Documentation

### Backend

- **`api.py`**:

  - Main FastAPI application with all API endpoints.
  - CORS middleware configuration for frontend communication.
  - Error handling and response formatting.

- **`pdf_processor.py`**:

  - PDF text extraction using PyMuPDF.
  - Document chunking and embedding generation.
  - FAISS vector store management.
  - Question answering using LangChain and Google Gemini.

- **`database.py`**:

  - SQLite database operations with context managers.
  - Database schema initialization.
  - CRUD operations for documents and chat history.

- **`requirements.txt`**:

  - Complete list of Python dependencies.

- **File Structure**:
  - `pdfs/`: Directory for storing uploaded PDF files.
  - `vectorstores/`: Directory for FAISS index files.
  - `database.db`: SQLite database file.

### Frontend

- **`src/`**: Contains all React components and application logic.

- **Components**:

  - `App.tsx`: Main app with state management and API integration.
  - `chat.tsx`: Chat interface with message handling and markdown rendering.
  - `header.tsx`: Header with file upload, document selection, and deletion.

- **Configuration**:

  - `vite.config.ts`: Vite build configuration with TailwindCSS.
  - `package.json`: Dependencies and build scripts.
  - `tsconfig.json`: TypeScript configuration.
  - `index.html`: Application entry point.

- **Assets**:
  - `public/`: Contains SVG icons (ai.svg, user.svg, Logo.svg).
