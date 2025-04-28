import { useState } from "react";
import Chat from "./components/chat";
import Header from "./components/header";

function App() {
  const [currentPdfName, setCurrentPdfName] = useState<string | null>(null);

  return (
    <div>
      <Header onFileUpload={setCurrentPdfName} />
      <Chat currentPdfName={currentPdfName} />
    </div>
  );
}

export default App;
