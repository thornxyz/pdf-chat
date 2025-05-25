import { createContext } from "react";

export interface Message {
    sender: "user" | "bot";
    text: string;
    timestamp: string;
}

export interface PdfContextType {
    currentPdfName: string | null;
    availableDocuments: string[];
    isLoadingDocuments: boolean;
    setCurrentPdfName: (pdfName: string | null) => void;
    refreshDocuments: () => Promise<void>;
}

export interface PdfProviderProps {
    children: React.ReactNode;
}

export interface ChatHistoryEntry {
    question: string;
    answer: string;
    timestamp: string;
}

export interface DocumentSelectOption {
    value: string;
    label: string;
}

export interface UploadResponse {
    filename: string;
}

export interface AskResponse {
    answer: string;
}

// Context creation
export const PdfContext = createContext<PdfContextType | undefined>(undefined);
