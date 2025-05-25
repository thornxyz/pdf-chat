import Chat from "./components/chat";
import Header from "./components/header";
import { PdfProvider } from "./contexts/PdfContext";

function App() {
  return (
    <PdfProvider>
      <div className="bg-gray-100 min-h-screen flex flex-col">
        <Header />
        <Chat />
      </div>
    </PdfProvider>
  );
}

export default App;
