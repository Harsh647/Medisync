"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const systemPrompt = `You are Medisync, a friendly AI health assistant for MediSync app. 
- Answer health questions clearly and simply
- Suggest when to see a doctor
- Provide medication information
- Help with symptom understanding
- Keep responses concise (2-4 sentences)
- Always remind users you are not a replacement for professional medical advice
- Be warm and supportive in tone`;

export default function ChatBot() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi! I'm Medisync, your health assistant. How can I help you today?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey || apiKey === "your_gemini_api_key_here") {
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: "I'm not configured yet. Please add a Gemini API key to use the chatbot." 
        }]);
        setIsLoading(false);
        return;
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${systemPrompt}\n\nUser: ${userMessage}` }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 500 },
          }),
        }
      );

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't generate a response.";

      setMessages(prev => [...prev, { role: "assistant", content: text }]);
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "Sorry, I encountered an error. Please try again." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const suggestions = [
    "What are normal blood sugar levels?",
    "How to manage diabetes?",
    "When should I see a doctor?",
    "Side effects of Metformin?",
  ];

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-gradient-to-r from-teal-500 to-blue-500 rounded-lg flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Medisync</h2>
          <p className="text-xs text-slate-600">AI Health Assistant</p>
        </div>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto space-y-3 mb-4 min-h-[200px] max-h-[300px]">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`flex items-start gap-2 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${msg.role === "user" ? "bg-teal-500/20" : "bg-blue-500/20"}`}>
                {msg.role === "user" ? (
                  <User className="w-3.5 h-3.5 text-teal-400" />
                ) : (
                  <Bot className="w-3.5 h-3.5 text-blue-400" />
                )}
              </div>
              <div className={`px-3 py-2 rounded-2xl text-sm ${msg.role === "user" ? "bg-teal-500/20 text-white" : "bg-slate-800 text-slate-300"}`}>
                {msg.content}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center">
                <Bot className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <div className="px-3 py-2 rounded-2xl bg-slate-800">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div className="mb-3">
          <p className="text-xs text-slate-500 mb-2">Try asking:</p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => setInput(s)}
                className="text-xs px-2.5 py-1.5 bg-slate-800 text-slate-400 rounded-lg hover:bg-slate-700 hover:text-white transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="flex items-center gap-2 bg-slate-800 rounded-xl px-3 py-2 mt-auto">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Ask about health..."
          className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none"
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || isLoading}
          className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center hover:bg-teal-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  );
}
