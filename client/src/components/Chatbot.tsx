import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  BotMessageSquare,
  X,
  MessageCircle,
  Loader2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { apiSendChatMessage } from "../services/api";

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
}

function Chatbot() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      text: "Hi! I'm your SportSphere assistant. How can I help you today?",
      sender: "bot",
      timestamp: new Date(),
    },
  ]);

  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Only for players
  if (!user || user.role !== "player") {
    return null;
  }

  // Send Message Handler
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputMessage,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      // Response from API
      const response = await apiSendChatMessage(inputMessage);

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.success
          ? response.message
          : "Sorry, I couldn't process your request.",
        sender: "bot",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error: any) {
      //console.log("Chatbot error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Something went wrong. Please try again.",
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Chatbot Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-7 right-7 z-50 w-14 h-14 rounded-full bg-primary border-2 border-transparent hover:border-white text-background shadow-lg hover:shadow-xl 
                     transition-all duration-300 flex items-center justify-center group"
        >
          <MessageCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
        </button>
      )}

      {/* Chatbot */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[80vw]  h-[600px] flex flex-col bg-card border-2 border-primary/10 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="p-4 flex items-center justify-between bg-gradient-to-r from-secondary/20 to-primary/10 backdrop-blur border-b border-primary/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-background/20 backdrop-blur flex items-center justify-center">
                <BotMessageSquare className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">
                  SportSphere Assistance
                </h3>
                <p className="text-xs text-white/50">Always here to help</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-full hover:bg-background/20 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-primary hover:text-white" />
            </button>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background/50 scrollbar-hide">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                    message.sender === "user"
                      ? "bg-primary text-background"
                      : "bg-card border border-primary/20 text-foreground"
                  }`}
                >
                  <p className="text-sm break-words">{message.text}</p>
                  <span
                    className={`text-xs mt-1 block ${
                      message.sender === "user"
                        ? "text-background/70"
                        : "text-muted-foreground"
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            ))}

            {/* Loading */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-card border border-primary/20 text-foreground rounded-2xl px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                      <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                      <span className="w-2 h-2 bg-primary rounded-full animate-bounce"></span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-card/80 backdrop-blur border-t border-primary/20">
            <div className="flex items-end gap-2">
              <textarea
                value={inputMessage}
                onChange={(e) => {
                  setInputMessage(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height =
                    Math.min(e.target.scrollHeight, 150) + "px";
                }}
                onKeyPress={handleKeyPress}
                placeholder="Ask about coach bookings..."
                rows={1}
                className="min-h-[42px] max-h-[150px] flex-1 px-4 py-2.5 rounded-xl border border-primary/20 bg-background focus:outline-none focus:border-primary focus:ring-2
                focus:ring-primary/20 transition-all text-sm resize-none overflow-y-auto scrollbar-hide"
                disabled={isLoading}
              />

              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="w-10 h-10 rounded-xl bg-primary hover:bg-primary/90 text-background flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Chatbot;
