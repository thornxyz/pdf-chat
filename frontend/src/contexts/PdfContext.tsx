import React, { useState, useEffect } from "react";
import axios from "axios";
import { PdfContext, PdfContextType, PdfProviderProps } from "../lib/types";

export const PdfProvider: React.FC<PdfProviderProps> = ({ children }) => {
  const [currentPdfName, setCurrentPdfNameState] = useState<string | null>(
    localStorage.getItem("currentPdfName")
  );
  const [availableDocuments, setAvailableDocuments] = useState<string[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);

  const fetchDocuments = async () => {
    try {
      setIsLoadingDocuments(true);
      const response = await axios.get("http://localhost:8000/documents/");
      setAvailableDocuments(response.data);

      // Check if the current PDF still exists after loading documents
      const storedPdfName = localStorage.getItem("currentPdfName");
      if (storedPdfName && !response.data.includes(storedPdfName)) {
        setCurrentPdfNameState(null);
        localStorage.removeItem("currentPdfName");
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setIsLoadingDocuments(false);
    }
  };

  const setCurrentPdfName = (pdfName: string | null) => {
    setCurrentPdfNameState(pdfName);
    if (pdfName) {
      localStorage.setItem("currentPdfName", pdfName);
    } else {
      localStorage.removeItem("currentPdfName");
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const value: PdfContextType = {
    currentPdfName,
    availableDocuments,
    isLoadingDocuments,
    setCurrentPdfName,
    refreshDocuments: fetchDocuments,
  };

  return <PdfContext.Provider value={value}>{children}</PdfContext.Provider>;
};
