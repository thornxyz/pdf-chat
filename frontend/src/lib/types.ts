import { createContext } from "react";

export interface Message {
    sender: "user" | "bot";
    text: string;
    timestamp: string;
}

export interface Document {
    filename: string;
    display_name: string;
}

export interface PdfContextType {
    currentPdfName: string | null;
    availableDocuments: Document[];
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

// Authentication types
export interface User {
    id: number;
    username: string;
    disabled: boolean;
}

export interface LoginCredentials {
    username: string;
    password: string;
}

export interface RegisterCredentials {
    username: string;
    password: string;
}

export interface AuthToken {
    access_token: string;
    token_type: string;
}

export interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (credentials: LoginCredentials) => Promise<void>;
    register: (credentials: RegisterCredentials) => Promise<void>;
    logout: () => void;
}

// Context creation
export const PdfContext = createContext<PdfContextType | undefined>(undefined);
export const AuthContext = createContext<AuthContextType | undefined>(undefined);
