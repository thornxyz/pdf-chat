import { useState, useEffect } from "react";
import axios from "axios";
import Chat from "./components/chat";
import Header from "./components/header";

function App() {
  const [currentPdfName, setCurrentPdfName] = useState<string | null>(null);
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
  }, [currentPdfName]); // Refetch when a new document is uploaded

  return (
    <div>
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
