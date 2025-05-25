import React, { useState, useEffect } from "react";
import {
  PdfContext,
  PdfContextType,
  PdfProviderProps,
  Document,
} from "../lib/types";
import api from "../lib/api";

export const PdfProvider: React.FC<PdfProviderProps> = ({ children }) => {
  const [currentPdfName, setCurrentPdfNameState] = useState<string | null>(
    localStorage.getItem("currentPdfName")
  );
  const [availableDocuments, setAvailableDocuments] = useState<Document[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);

  const fetchDocuments = async () => {
    try {
      setIsLoadingDocuments(true);
      const response = await api.get<Document[]>("/documents/");
      setAvailableDocuments(response.data);

      // Check if the current PDF still exists after loading documents
      const storedPdfName = localStorage.getItem("currentPdfName");
      if (
        storedPdfName &&
        !response.data.some((doc) => doc.filename === storedPdfName)
      ) {
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
