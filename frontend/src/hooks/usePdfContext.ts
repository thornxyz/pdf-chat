import { useContext } from "react";
import { PdfContext } from "../contexts/PdfContextTypes";

export const usePdfContext = () => {
    const context = useContext(PdfContext);
    if (context === undefined) {
        throw new Error("usePdfContext must be used within a PdfProvider");
    }
    return context;
};
