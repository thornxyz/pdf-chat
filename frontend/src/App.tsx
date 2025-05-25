import Chat from "./components/chat";
import Header from "./components/header";
import Auth from "./components/Auth";
import { PdfProvider } from "./contexts/PdfContext";
import { AuthProvider } from "./contexts/AuthContext";
import { useAuth } from "./hooks/useAuth";

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Auth />;
  }

  return (
    <PdfProvider>
      <div className="bg-gray-100 min-h-screen flex flex-col">
        <Header />
        <Chat />
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
