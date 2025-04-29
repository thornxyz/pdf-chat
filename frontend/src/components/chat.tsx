import { useState, useRef, useEffect } from "react";
import { IoMdSend } from "react-icons/io";
import axios from "axios";

interface Message {
  sender: "user" | "bot";
  text: string;
}

interface ChatProps {
  currentPdfName: string | null;
}

function Chat({ currentPdfName }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const handleSend = async () => {
    if (!input.trim() || !currentPdfName) return;

    const userMessage: Message = { sender: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await axios.post("http://localhost:8000/ask/", {
        pdf_name: currentPdfName,
        question: input,
      });

      const botMessage: Message = { sender: "bot", text: response.data.answer };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Error asking question:", error);
      const errorMessage: Message = {
        sender: "bot",
        text: "Sorry, I encountered an error while processing your question.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex text-sm md:text-base items-center flex-col h-[87vh]">
      <div className="w-screen flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {messages.map((msg, index) => (
          <div key={index} className="flex items-start gap-4 px-1 sm:px-6">
            {msg.sender === "user" ? (
              <>
                <img src="/user.svg" />
                <div className="font-semibold mt-2 text-gray-800">
                  {msg.text}
                </div>
              </>
            ) : (
              <>
                <img src="/ai.svg" />
                <div className=" text-gray-800">{msg.text}</div>
              </>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex items-start gap-4 px-1 sm:px-6">
            <img src="/ai.svg" />
            <div className=" text-gray-800">Thinking...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="w-full p-4">
        <div className="flex items-center bg-white rounded-sm drop-shadow-sm mx-8 px-5 py-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              currentPdfName
                ? "Ask a question about the PDF..."
                : "Please upload a PDF first"
            }
            disabled={!currentPdfName || isLoading}
            className="flex-1 outline-none bg-transparent disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!currentPdfName || isLoading}
            className="text-gray-500 hover:text-green-600 transition cursor-pointer disabled:opacity-50"
          >
            <IoMdSend size={25} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default Chat;
