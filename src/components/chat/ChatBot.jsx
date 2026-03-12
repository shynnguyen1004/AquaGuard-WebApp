import { useState, useRef, useEffect } from "react";

const quickReplies = [
  "What should I do during a flood?",
  "How to report an emergency?",
  "Where is the nearest shelter?",
  "How to contact rescue teams?",
];

const botResponses = {
  "what should i do during a flood": {
    text: "During a flood, you should:\n\n1. Move to higher ground immediately\n2. Avoid walking or driving through flood water\n3. Stay away from power lines\n4. Listen to emergency broadcasts\n5. If trapped, go to the highest point and signal for help\n\nVisit our Safety Protocols page for more detailed guidelines.",
    icon: "emergency",
  },
  "how to report an emergency": {
    text: "To report an emergency:\n\n1. Go to the Rescue Requests page\n2. Click 'New Request'\n3. Fill in your location, description, and upload scene photos\n4. Select urgency level and submit\n\nFor immediate help, call Police (113), Fire (114), or Ambulance (115).",
    icon: "report",
  },
  "where is the nearest shelter": {
    text: "You can find the nearest shelter by:\n\n1. Go to the Live Flood Map page\n2. Use the 'Find Shelter' quick action\n3. The map will show safe zones marked in green\n\nCurrently, shelters are active in Hai Chau, Cam Le, and Ngu Hanh Son districts.",
    icon: "home_pin",
  },
  "how to contact rescue teams": {
    text: "To contact rescue teams:\n\n• Emergency Hotline: 113 (Police), 114 (Fire), 115 (Ambulance)\n• Use the SOS button on the Dashboard or Map page\n• Submit a Rescue Request through the app\n\nRescue teams are currently deployed across Da Nang area.",
    icon: "local_fire_department",
  },
};

function getResponse(message) {
  const lower = message.toLowerCase().trim();

  for (const [key, value] of Object.entries(botResponses)) {
    if (lower.includes(key) || key.includes(lower)) {
      return value;
    }
  }

  if (lower.includes("flood") || lower.includes("water")) {
    return botResponses["what should i do during a flood"];
  }
  if (lower.includes("shelter") || lower.includes("safe")) {
    return botResponses["where is the nearest shelter"];
  }
  if (lower.includes("emergency") || lower.includes("help") || lower.includes("sos") || lower.includes("report")) {
    return botResponses["how to report an emergency"];
  }
  if (lower.includes("rescue") || lower.includes("team") || lower.includes("contact") || lower.includes("call")) {
    return botResponses["how to contact rescue teams"];
  }
  if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) {
    return {
      text: "Hello! I'm AquaGuard Assistant. I can help you with:\n\n• Flood safety guidelines\n• Emergency reporting\n• Finding shelters\n• Contacting rescue teams\n\nHow can I assist you?",
      icon: "waving_hand",
    };
  }

  return {
    text: "I'm not sure I understand. I can help with:\n\n• Flood safety tips\n• Emergency reporting\n• Shelter locations\n• Rescue team contacts\n\nTry asking about one of these topics, or use the quick replies below!",
    icon: "help",
  };
}

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      from: "bot",
      text: "Hi! 👋 I'm AquaGuard Assistant. How can I help you today?",
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

  const sendMessage = (text) => {
    if (!text.trim()) return;

    const userMsg = { from: "user", text: text.trim(), time: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const response = getResponse(text);
      setMessages((prev) => [
        ...prev,
        { from: "bot", text: response.text, icon: response.icon, time: new Date() },
      ]);
      setIsTyping(false);
    }, 800 + Math.random() * 700);
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
        <div className="fixed bottom-24 right-4 sm:right-6 z-50 w-[340px] sm:w-[380px] max-h-[520px] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden chat-widget">
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
              <p className="text-white font-bold text-sm">AquaGuard Assistant</p>
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
                    <span className="material-symbols-outlined text-primary text-sm filled-icon">
                      {msg.icon || "smart_toy"}
                    </span>
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
              disabled={!input.trim()}
              className="size-10 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <span className="material-symbols-outlined text-lg">send</span>
            </button>
          </form>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`fixed bottom-6 right-4 sm:right-6 z-50 size-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-110 ${isOpen
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
