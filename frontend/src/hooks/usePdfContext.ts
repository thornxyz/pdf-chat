import { useContext } from "react";
import { PdfContext } from "../lib/types";

export const usePdfContext = () => {
    const context = useContext(PdfContext);
    if (context === undefined) {
        throw new Error("usePdfContext must be used within a PdfProvider");
    }
    return context;
};
