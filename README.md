A full-stack application that allows users to upload PDF documents and ask questions about their content. The backend processes the documents using Natural Language Processing (NLP) to answer the questions, and the frontend provides an intuitive interface for users to interact with the system.

## Technologies Used

### Backend

- **Framework**: FastAPI
- **Libraries**: LangChain, PyMuPDF, FAISS
- **Database**: SQLite for storing document metadata and chat history, FAISS for vector database storage. PDFs are stored on disk.
- **Other**: Google Generative AI for embeddings and NLP

### Frontend

- **Framework**: React.js
- **Language**: TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **Libraries**: Axios, React Icons, React Markdown

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
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the backend server:
   ```bash
   uvicorn api:app --reload
   ```

### Environment Setup

1. Create a `.env` file in the `backend` directory.
2. Add your Google API key to the `.env` file:
   ```env
   GOOGLE_API_KEY=your_google_api_key_here
   ```
   > **Note**: The `.env` file is crucial for the application to function correctly. Ensure it is in the same directory as the `main.py` file and contains all required environment variables.

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
  - `user_id` (TEXT): (Optional) ID of the user who uploaded the file.

- **`chats` Table**:
  - `id` (INTEGER): Primary key.
  - `document_id` (INTEGER): Foreign key referencing the `documents` table.
  - `timestamp` (TEXT): Timestamp of the chat entry.
  - `question` (TEXT): The question asked by the user.
  - `answer` (TEXT): The answer provided by the system.

The database file is named `database.db` and is located in the `backend` directory. No manual setup is required; it will be created and initialized automatically when the backend server starts.

## Usage

1. Open the frontend in your browser (default: `http://localhost:5173`).
2. Upload a PDF document.
3. Ask questions about the content of the uploaded PDF.
4. View the answers and chat history.

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
  - `pdf_name` (string): The name of the PDF file.
- **Response**:
  - `200 OK`: JSON array of chat history entries.
  - `404 Not Found`: If the specified PDF is not found.
  - `500 Internal Server Error`: If there is an error retrieving the chat history.

## High-Level Design (HLD)

The application is a full-stack system designed to process and interact with PDF documents. It consists of two main components: the backend and the frontend. Below is an overview of the architecture:

### Backend

- **PDF Processing**: Handles the upload and parsing of PDF documents. Extracts text and generates embeddings using Google Generative AI.
- **Question Answering**: Uses LangChain and FAISS to retrieve relevant content and answer user queries.
- **Database Management**: Stores metadata about uploaded PDFs and chat history in SQLite.
- **API Layer**: Exposes RESTful endpoints for the frontend to interact with the backend.

### Frontend

- **User Interface**: Built with React.js and styled using TailwindCSS. Provides an intuitive interface for uploading PDFs, asking questions, and viewing chat history.
- **State Management**: Manages application state using React hooks.
- **API Integration**: Communicates with the backend using Axios to fetch and display data.

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

   - `/upload/`: Handles PDF uploads.
   - `/ask/`: Processes user questions and returns answers.
   - `/documents/`: Lists all uploaded PDFs.
   - `/chat-history/{pdf_name}`: Retrieves chat history for a specific PDF.

2. **PDF Processing**:

   - Extracts text using PyMuPDF.
   - Generates embeddings using Google Generative AI.

3. **Database**:

   - SQLite database with `documents` and `chats` tables.

4. **Vector Store**:
   - FAISS for storing and querying embeddings.

#### Interactions

- **PDF Upload**: Validates file type, extracts text, generates embeddings, and stores metadata.
- **Question Answering**: Retrieves relevant embeddings, generates a response, and logs the interaction.

### Frontend

#### Key Components

1. **Components**:

   - `App.tsx`: Main application component.
   - `chat.tsx`: Displays chat history and input field for questions.
   - `header.tsx`: Displays the application header.

2. **Pages**:

   - `index.html`: Entry point for the application.

3. **API Integration**:

   - Uses Axios to interact with backend endpoints.

4. **Styling**:
   - TailwindCSS for responsive and modern UI design.

#### Interactions

- **PDF Upload**: Sends the file to the backend and updates the document list.
- **Question Submission**: Sends the question to the backend and updates the chat history.

## Complete Source Code Documentation

### Backend

- **`api.py`**:

  - Defines all API endpoints.
  - Handles PDF uploads, question answering, and chat history retrieval.

- **`main.py`**:

  - Entry point for the backend application.
  - Initializes the FastAPI app and database.

- **`database.db`**:

  - SQLite database file for storing metadata and chat history.

- **`vectorstores/`**:
  - Stores FAISS index files for embeddings.

### Frontend

- **`src/`**:

  - Contains all React components and application logic.

- **`components/`**:

  - `chat.tsx`: Manages chat interactions.
  - `header.tsx`: Displays the application header.

- **`public/`**:

  - Contains static assets like images and icons.

- **`vite.config.ts`**:
  - Configuration file for the Vite build tool.

### Key Interactions

1. **PDF Upload**:

   - Frontend sends the file to `/upload/`.
   - Backend processes the file and updates the database.

2. **Question Answering**:

   - Frontend sends a question to `/ask/`.
   - Backend retrieves relevant content and generates an answer.

3. **Chat History**:
   - Frontend fetches chat history from `/chat-history/{pdf_name}`.
   - Backend retrieves and returns the chat history from the database.
