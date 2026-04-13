import { useState, useRef, useEffect } from "react";

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const SYSTEM_PROMPT = `You are AquaGuard Assistant — a helpful, concise AI chatbot for the AquaGuard flood disaster management platform.

About AquaGuard: AquaGuard is a flood disaster rescue and management team dedicated to protecting communities. The web platform provides real-time flood monitoring, rescue coordination, live flood mapping, shelter information, and safety education — focused on Da Nang, Vietnam.

Rules:
- Keep answers SHORT (2-4 sentences max for simple questions, up to 6 for complex ones)
- Use bullet points for lists
- Be friendly and professional
- For emergencies, always mention: Police 113, Fire 114, Ambulance 115
- You can answer general knowledge questions too, but keep it brief
- Respond in the same language the user writes in (Vietnamese or English)`;

const quickReplies = [
  "What is AquaGuard?",
  "What should I do during a flood?",
  "How to report an emergency?",
  "Where is the nearest shelter?",
  "How to contact rescue teams?",
];

async function getAIResponse(chatMessages) {
  try {
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...chatMessages
        .filter((m) => m.from !== "system")
        .map((m) => ({
          role: m.from === "user" ? "user" : "assistant",
          content: m.text,
        })),
    ];

    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages,
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!res.ok) throw new Error(`API error: ${res.status}`);

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error("No response text");

    return text;
  } catch (err) {
    console.error("Groq API error:", err);
    return null;
  }
}

// Fallback responses when API is unavailable
const fallbackResponses = {
  aquaguard: "AquaGuard is a flood disaster rescue and management team. Our platform provides real-time flood monitoring, rescue coordination, and safety education for communities in Da Nang, Vietnam.",
  flood: "During a flood: move to higher ground, avoid flood water, stay away from power lines, and listen to emergency broadcasts. Visit our Safety Protocols page for more details.",
  shelter: "Go to the Live Flood Map page and use 'Find Shelter' to see safe zones. Shelters are active in Hai Chau, Cam Le, and Ngu Hanh Son districts.",
  emergency: "For emergencies: call Police (113), Fire (114), or Ambulance (115). You can also submit a Rescue Request through the app.",
  rescue: "Contact rescue teams via: Police 113, Fire 114, Ambulance 115. Or use the SOS button on the Dashboard, or submit a Rescue Request.",
};

function getFallback(message) {
  const lower = message.toLowerCase();
  for (const [key, value] of Object.entries(fallbackResponses)) {
    if (lower.includes(key)) return value;
  }
  return "I'm having trouble connecting right now. For emergencies, call Police (113), Fire (114), or Ambulance (115). Please try again later!";
}

export default function ChatBot({ externalOpen, onExternalToggle }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = externalOpen !== undefined ? externalOpen : internalOpen;
  const setIsOpen = onExternalToggle || setInternalOpen;
  const [messages, setMessages] = useState([
    {
      from: "bot",
      text: "Hi! 👋 I'm AquaGuard Assistant powered by AI. Ask me anything about flood safety, rescue, or any other question!",
      time: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const sendMessage = async (text) => {
    if (!text.trim() || isTyping) return;

    const userMsg = { from: "user", text: text.trim(), time: new Date() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setIsTyping(true);

    let responseText = await getAIResponse(updatedMessages);
    if (!responseText) {
      responseText = getFallback(text);
    }

    setMessages((prev) => [
      ...prev,
      { from: "bot", text: responseText, time: new Date() },
    ]);
    setIsTyping(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const formatTime = (date) =>
    date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  return (
    <>
      {/* Chat Window */}
      {isOpen && (
        <div className="fixed inset-0 lg:inset-auto lg:bottom-24 lg:right-6 z-[1100] lg:w-[380px] lg:max-h-[520px] flex flex-col bg-white dark:bg-slate-900 lg:rounded-2xl shadow-2xl lg:border border-slate-200 dark:border-slate-700 overflow-hidden chat-widget">
          <style>{`
            .chat-widget ::-webkit-scrollbar { width: 5px; height: 5px; }
            .chat-widget ::-webkit-scrollbar-track { background: transparent; }
            .chat-widget ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.25); border-radius: 9999px; }
            .chat-widget ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.4); }
          `}</style>

          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-primary/80 px-4 py-3 flex items-center gap-3">
            <div className="size-9 rounded-full bg-white/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-xl filled-icon">smart_toy</span>
            </div>
            <div className="flex-1">
              <p className="text-white font-bold text-sm">AquaGuard AI</p>
              <p className="text-white/70 text-[10px]">Online • Ready to help</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="size-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[280px] max-h-[340px] bg-slate-50 dark:bg-slate-900/50">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2 ${msg.from === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.from === "bot" && (
                  <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="material-symbols-outlined text-primary text-sm filled-icon">smart_toy</span>
                  </div>
                )}
                <div
                  className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${msg.from === "user"
                      ? "bg-primary text-white rounded-br-md"
                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-bl-md shadow-sm border border-slate-100 dark:border-slate-700"
                    }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>
                  <p className={`text-[9px] mt-1.5 ${msg.from === "user" ? "text-white/60" : "text-slate-400"}`}>
                    {formatTime(msg.time)}
                  </p>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-2">
                <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-primary text-sm filled-icon">smart_toy</span>
                </div>
                <div className="bg-white dark:bg-slate-800 px-4 py-3 rounded-2xl rounded-bl-md shadow-sm border border-slate-100 dark:border-slate-700">
                  <div className="flex gap-1">
                    <span className="size-1.5 bg-slate-400 rounded-full animate-bounce" />
                    <span className="size-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.15s]" />
                    <span className="size-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.3s]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Replies */}
          <div className="px-3 py-2 flex gap-1.5 overflow-x-auto border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
            {quickReplies.map((reply) => (
              <button
                key={reply}
                onClick={() => sendMessage(reply)}
                className="flex-shrink-0 text-[10px] font-medium px-2.5 py-1.5 rounded-full bg-primary/5 text-primary border border-primary/20 hover:bg-primary/10 transition-colors whitespace-nowrap"
              >
                {reply}
              </button>
            ))}
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 text-sm bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-slate-400"
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="size-10 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <span className="material-symbols-outlined text-lg">send</span>
            </button>
          </form>
        </div>
      )}

      {/* Floating Button — desktop only */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`fixed bottom-6 right-6 z-[1100] size-14 rounded-full shadow-xl hidden lg:flex items-center justify-center transition-all duration-300 hover:scale-110 ${isOpen
            ? "bg-slate-700 hover:bg-slate-600"
            : "bg-gradient-to-br from-primary to-primary/80 hover:shadow-primary/30 hover:shadow-2xl"
          }`}
      >
        <span className={`material-symbols-outlined text-white text-2xl filled-icon transition-transform duration-300 ${isOpen ? "rotate-90" : ""}`}>
          {isOpen ? "close" : "chat"}
        </span>
        {!isOpen && (
          <span className="absolute top-0 right-0 size-4 bg-danger rounded-full border-2 border-white flex items-center justify-center">
            <span className="text-[8px] text-white font-bold">1</span>
          </span>
        )}
      </button>
    </>
  );
}
