# Chat-PDF

A full-stack application that allows users to upload PDF documents and have intelligent conversations with their content using AI. Built with React/TypeScript frontend and FastAPI Python backend.

## 🛠️ Tech Stack

### Frontend

- **React 19** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **Axios** for API communication
- **React Markdown** for message rendering

### Backend

- **FastAPI** for REST API
- **SQLAlchemy** for database ORM
- **LangChain** for AI integration
- **Google Gemini AI** for language model
- **FAISS** for vector storage
- **PyMuPDF** for PDF processing
- **JWT** for authentication

## 📋 Prerequisites

- **Node.js** (v18 or higher)
- **Python** (v3.8 or higher)
- **Google AI API Key** (for Gemini integration)

## 🚀 Quick Start

### 1. Clone the Repository

```powershell
git clone https://github.com/thornxyz/pdf-chat.git
cd pdf-chat
```

### 2. Backend Setup

```powershell
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment (Windows PowerShell)
.\venv\Scripts\Activate

# Install dependencies
pip install -r requirements.txt
```

> **Note for other platforms:**
>
> - **macOS/Linux**: `source venv/bin/activate`
> - **Windows CMD**: `venv\Scripts\activate.bat`

### 3. Environment Configuration

Create a `.env` file inside the `backend` directory and add the following:

```env
GOOGLE_API_KEY=your_google_ai_api_key_here
SECRET_KEY=your_generated_jwt_secret_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

#### To generate a Secure Secret Key using bash run:

```bash
openssl rand -hex 32
```

### 4. Frontend Setup

```powershell
# Navigate to frontend directory (from project root)
cd ..\frontend

# Install dependencies
npm install
```

### 5. Run the Application

Open **two separate terminal windows** and run:

**Terminal 1 - Backend Server:**

```powershell
# Navigate to backend directory
cd backend

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Start the backend server
python api.py
```

**Terminal 2 - Frontend Server:**

```powershell
# Navigate to frontend directory
cd frontend

# Start the development server
npm run dev
```

### 6. Access the Application

Once both servers are running:

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

### 7. First Time Setup

1. Open http://localhost:5173 in your browser
2. Click "Register" to create a new account
3. Upload a PDF document
4. Start asking questions about your PDF!

## 📝 API Endpoints

### Authentication

- `POST /auth/register` - User registration
- `POST /auth/token` - User login (returns JWT access token)
- `GET /auth/me` - Get current user information

### PDF Management

- `POST /upload/` - Upload PDF document
- `GET /documents/` - List user's uploaded PDFs
- `DELETE /documents/{pdf_name}` - Delete a specific PDF document

### Chat & Query

- `POST /ask/` - Ask a question about a specific PDF document
- `GET /chat-history/{pdf_name}` - Get chat history for a specific PDF document
