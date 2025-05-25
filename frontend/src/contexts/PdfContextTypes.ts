import { createContext } from "react";

export interface PdfContextType {
    currentPdfName: string | null;
    availableDocuments: string[];
    isLoadingDocuments: boolean;
    setCurrentPdfName: (pdfName: string | null) => void;
    refreshDocuments: () => Promise<void>;
}

export const PdfContext = createContext<PdfContextType | undefined>(undefined);
