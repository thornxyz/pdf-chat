import { useContext } from "react";
import { PdfContext, PdfContextType } from "../lib/types";

export const usePdfContext = (): PdfContextType => {
    const context = useContext(PdfContext);
    if (context === undefined) {
        throw new Error("usePdfContext must be used within a PdfProvider");
    }
    return context;
};
