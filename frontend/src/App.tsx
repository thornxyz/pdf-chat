import { useState } from "react";
import Chat from "./components/chat";
import Sidebar from "./components/Sidebar";
import Auth from "./components/Auth";
import { PdfProvider } from "./contexts/PdfContext";
import { AuthProvider } from "./contexts/AuthContext";
import { useAuth } from "./hooks/useAuth";

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50">
        <div className="flex items-center gap-3 rounded-full bg-white/80 px-6 py-3 shadow-lg ring-1 ring-slate-200/60">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-600 border-t-transparent"></div>
          <span className="text-sm font-medium text-slate-600">Loading workspace</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Auth />;
  }

  return (
    <PdfProvider>
      <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-white to-indigo-50">
        <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
        <div className="flex-1 flex flex-col md:ml-0">
          <Chat />
        </div>
      </div>
    </PdfProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
