import { useState, useEffect } from "react";
import axios from "axios";
import Chat from "./components/chat";
import Header from "./components/header";

function App() {
  const [currentPdfName, setCurrentPdfName] = useState<string | null>(
    localStorage.getItem("currentPdfName")
  );
  const [availableDocuments, setAvailableDocuments] = useState<string[]>([]);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const response = await axios.get("http://localhost:8000/documents/");
        setAvailableDocuments(response.data);
      } catch (error) {
        console.error("Error fetching documents:", error);
      }
    };

    fetchDocuments();
  }, []);

  useEffect(() => {
    if (currentPdfName) {
      localStorage.setItem("currentPdfName", currentPdfName);
    } else {
      localStorage.removeItem("currentPdfName");
    }
  }, [currentPdfName]);

  return (
    <div className="bg-gray-100 min-h-screen flex flex-col">
      <Header
        onFileUpload={setCurrentPdfName}
        availableDocuments={availableDocuments}
        currentPdfName={currentPdfName}
      />
      <Chat currentPdfName={currentPdfName} />
    </div>
  );
}

export default App;
