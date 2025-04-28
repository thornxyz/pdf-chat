import { useState, useRef, useEffect } from "react";
import { IoMdSend } from "react-icons/io";

interface Message {
  sender: "user" | "bot";
  text: string;
}

function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const handleSend = () => {
    if (!input.trim()) return;

    setMessages((prev) => [
      ...prev,
      { sender: "user", text: input },
      { sender: "bot", text: `Echo: ${input}` },
    ]);
    setInput("");
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
    <div className="flex flex-col h-[87vh]">
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {messages.map((msg, index) => (
          <div key={index} className="flex items-start gap-4">
            {msg.sender === "user" ? (
              <div className="w-8 h-8 flex items-center justify-center rounded-full bg-purple-300 text-white font-bold">
                S
              </div>
            ) : (
              <div className="w-8 h-8 flex items-center justify-center rounded-full bg-green-100">
                <span className="text-green-500 font-bold">ai</span>
              </div>
            )}

            <div className="max-w-2xl text-gray-800">{msg.text}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4">
        <div className="flex items-center bg-white rounded-sm drop-shadow-sm mx-8 px-5 py-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Send a message..."
            className="flex-1 outline-none bg-transparent"
          />
          <button
            onClick={handleSend}
            className="text-gray-500 hover:text-green-600 transition cursor-pointer"
          >
            <IoMdSend size={25} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default Chat;
