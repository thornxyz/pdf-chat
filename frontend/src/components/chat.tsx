import { useState, useRef, useEffect } from "react";
import { IoMdSend } from "react-icons/io";
import { MdDescription } from "react-icons/md";
import { FiUser } from "react-icons/fi";
import { Streamdown } from "streamdown";
import { createMathPlugin } from "@streamdown/math";
import { usePdfContext } from "../hooks/usePdfContext";
import { Message, ChatHistoryEntry } from "../lib/types";
import api, { API_BASE_URL } from "../lib/api";

const mathPlugin = createMathPlugin({ singleDollarTextMath: true });

function Chat() {
  const { currentPdfName } = usePdfContext();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const loadChatHistory = async () => {
      if (!currentPdfName) {
        setMessages([]);
        return;
      }

      try {
        const encodedPdfName = encodeURIComponent(currentPdfName);
        const response = await api.get(`/chat-history/${encodedPdfName}`);
        const history = response.data;

        if (history.length === 0) {
          const welcomeMessage: Message = {
            sender: "bot",
            text: `Hello! I'm ready to help you with **${currentPdfName}**. Feel free to ask me anything about this document - I can answer questions, summarize content, or help you find specific information.`,
            timestamp: new Date().toLocaleString(),
          };
          setMessages([welcomeMessage]);
        } else {
          const formattedMessages = history
            .map((entry: ChatHistoryEntry) => [
              {
                sender: "user" as const,
                text: entry.question,
                timestamp: entry.timestamp,
              },
              {
                sender: "bot" as const,
                text: entry.answer,
                timestamp: entry.timestamp,
              },
            ])
            .flat();
          setMessages(formattedMessages);
        }
      } catch (error) {
        console.error("Error loading chat history:", error);
        const welcomeMessage: Message = {
          sender: "bot",
          text: `Hello! I'm ready to help you with **${currentPdfName}**. Feel free to ask me anything about this document - I can answer questions, summarize content, or help you find specific information.`,
          timestamp: new Date().toLocaleString(),
        };
        setMessages([welcomeMessage]);
      }
    };

    loadChatHistory();
  }, [currentPdfName]);

  const handleSend = async () => {
    if (!input.trim() || !currentPdfName) return;

    const question = input;
    const userMessage: Message = {
      sender: "user",
      text: question,
      timestamp: new Date().toLocaleString(),
    };
    const botMessage: Message = {
      sender: "bot",
      text: "",
      timestamp: new Date().toLocaleString(),
    };
    setMessages((prev) => [...prev, userMessage, botMessage]);
    setInput("");
    setIsLoading(true);
    setIsStreaming(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/ask/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          pdf_name: currentPdfName,
          question,
        }),
      });

      if (!response.ok || !response.body) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to stream response");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        let boundaryIndex = buffer.indexOf("\n\n");

        while (boundaryIndex !== -1) {
          const chunk = buffer.slice(0, boundaryIndex);
          buffer = buffer.slice(boundaryIndex + 2);

          const lines = chunk.split("\n");
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.replace("data: ", "");
            if (data === "[DONE]") {
              setIsStreaming(false);
              continue;
            }

            if (data.startsWith("[ERROR]")) {
              throw new Error(data.replace("[ERROR]", "").trim());
            }

            if (data) {
              let delta = data;
              try {
                const parsed = JSON.parse(data) as { delta?: string };
                if (typeof parsed.delta === "string") {
                  delta = parsed.delta;
                }
              } catch {
                // fallback to raw data
              }

              setMessages((prev) => {
                const updated = [...prev];
                const lastIndex = updated.length - 1;
                if (lastIndex >= 0 && updated[lastIndex].sender === "bot") {
                  updated[lastIndex] = {
                    ...updated[lastIndex],
                    text: updated[lastIndex].text + delta,
                  };
                }
                return updated;
              });
            }
          }

          boundaryIndex = buffer.indexOf("\n\n");
        }
      }
    } catch (error) {
      console.error("Error asking question:", error);
      const errorMessage: Message = {
        sender: "bot",
        text: "Sorry, I encountered an error while processing your question.",
        timestamp: new Date().toLocaleString(),
      };
      setMessages((prev) => {
        const updated = [...prev];
        const lastIndex = updated.length - 1;
        if (lastIndex >= 0 && updated[lastIndex].sender === "bot") {
          updated[lastIndex] = errorMessage;
        } else {
          updated.push(errorMessage);
        }
        return updated;
      });
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
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
    <div className="flex text-sm md:text-base items-center flex-col h-screen">
      <div className="w-full flex-1 overflow-y-auto px-4 py-6 space-y-6 scrollbar-modern">
        {!currentPdfName ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-slate-500">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600/10">
                <MdDescription size={32} className="text-indigo-500" />
              </div>
              <p className="text-lg font-semibold text-slate-700 mb-2">
                Welcome to PDF Chat
              </p>
              <p className="text-sm text-slate-500">
                Upload a PDF from the sidebar to start chatting.
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex items-start gap-3 sm:gap-4 px-1 sm:px-6 ${msg.sender === "user" ? "justify-end" : "justify-start"
                  }`}
              >
                {msg.sender === "user" ? (
                  <div className="flex items-end gap-3">
                    <div className="hidden sm:flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-slate-700">
                      <FiUser size={18} />
                    </div>
                    <div className="max-w-[75ch] rounded-2xl rounded-tr-sm bg-indigo-600 text-white px-4 py-3 shadow-sm">
                      <div className="font-medium leading-relaxed">
                        {msg.text}
                      </div>
                      <div className="mt-2 text-[11px] text-indigo-100/90 text-right">
                        {new Date(msg.timestamp).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        {new Date(msg.timestamp).toLocaleTimeString(undefined, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-end gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10">
                      <img src="/vite.svg" width={18} />
                    </div>
                    <div className="max-w-[75ch] rounded-2xl rounded-tl-sm bg-white/90 px-4 py-3 shadow-sm ring-1 ring-slate-200/60">
                      <div className="text-slate-900 prose prose-sm sm:prose !max-w-5xl">
                        <Streamdown
                          isAnimating={isStreaming}
                          plugins={{ math: mathPlugin }}
                        >
                          {msg.text}
                        </Streamdown>
                      </div>
                      <div className="mt-2 text-[11px] text-slate-500 text-right">
                        {new Date(msg.timestamp).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        {new Date(msg.timestamp).toLocaleTimeString(undefined, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start gap-3 px-1 sm:px-6">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10">
                  <img src="/vite.svg" width={18} />
                </div>
                <div className="rounded-2xl rounded-tl-sm bg-white/90 px-4 py-3 shadow-sm ring-1 ring-slate-200/60 text-slate-600">
                  Thinking...
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="w-full p-3 sm:p-6">
        <div className="flex items-center bg-white/90 rounded-2xl drop-shadow-lg ring-1 ring-slate-200/60 mx-4 sm:mx-8 py-2.5 px-3 sm:px-5 sm:py-4">
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
            className="flex-1 outline-none bg-transparent disabled:opacity-50 text-slate-800 placeholder:text-slate-400"
          />
          <button
            onClick={handleSend}
            disabled={!currentPdfName || isLoading}
            className="ml-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white shadow-md hover:bg-indigo-700 transition disabled:opacity-50"
          >
            <IoMdSend size={25} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default Chat;
