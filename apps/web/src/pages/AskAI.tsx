import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mic, Send, Sparkles } from "lucide-react";
import { chatMessages } from "@/lib/dummyData";

const prompts = [
  "Summarise my portfolio",
  "Analyse this week's trades",
  "Summarise market conditions",
  "Why did my score change?",
  "Best stock to hold now?",
];

const AskAI = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState(chatMessages);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages((prev) => [
      ...prev,
      { role: "user", text: input },
      { role: "ai", text: "I'm analyzing your query. This is a prototype — real AI responses would appear here with detailed stock insights and recommendations based on your portfolio data." },
    ]);
    setInput("");
  };

  const handlePrompt = (prompt: string) => {
    setMessages((prev) => [
      ...prev,
      { role: "user", text: prompt },
      { role: "ai", text: "Your portfolio score is 67 — moderate. HDFCBANK is your strongest holding at 82. ZOMATO is your weakest at 41 and flagging low sentiment. TATAMOTORS has strong fundamentals but sentiment is dragging the score. Consider reviewing ZOMATO before adding more capital." },
    ]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-48px)] md:h-[calc(100vh-56px)] max-w-2xl mx-auto">
      {/* Top Bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1a1a1a]">
        <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-[#1a1a1a] rounded-lg"><ArrowLeft size={18} /></button>
        <Sparkles size={16} className="text-primary" />
        <span className="text-sm font-medium">Ask AI</span>
      </div>

      {/* Prompt Chips */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 py-3 border-b border-[#1a1a1a]/50">
        {prompts.map((p) => (
          <button
            key={p}
            onClick={() => handlePrompt(p)}
            className="whitespace-nowrap px-3 py-1.5 rounded-full bg-[#1a1a1a] text-[10px] text-[#999] hover:text-[#F0F0F0] hover:bg-[#222] transition-colors"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-hide">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
              msg.role === "user"
                ? "bg-[#222] text-[#F0F0F0] rounded-br-sm"
                : "bg-[#111111] border border-[#1a1a1a] text-[#ccc] rounded-bl-sm"
            }`}>
              {msg.role === "ai" && (
                <Sparkles size={12} className="text-primary inline mr-1.5 -mt-0.5" />
              )}
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      {/* Input Bar */}
      <div className="px-4 py-3 border-t border-[#1a1a1a] bg-[#0D0D0D]">
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#111111] border border-[#1a1a1a]">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask anything about any stock or your portfolio..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#444]"
          />
          <button className="p-1.5 text-[#666] hover:text-[#999]"><Mic size={16} /></button>
          <button onClick={handleSend} className="p-1.5 text-primary hover:text-primary/80"><Send size={16} /></button>
        </div>
      </div>
    </div>
  );
};

export default AskAI;
