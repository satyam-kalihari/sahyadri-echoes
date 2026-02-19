"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, User, Bot, Loader2, ChevronDown, Languages } from "lucide-react";
import { MapLocation } from "../map/MapView";

interface Message {
    role: "user" | "assistant";
    content: string;
}

interface ChatWindowProps {
    location: MapLocation | null;
}

export default function ChatWindow({ location }: ChatWindowProps) {
    const [messages, setMessages] = useState<Message[]>([
        {
            role: "assistant",
            content: "Namaskar! I am Bharat Yatri. Select a location on the map, and I shall tell you its story."
        }
    ]);
    const [language, setLanguage] = useState<"en" | "mr" | "hi" | "gu">("en");
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Speak last message if it's from assistant and not the initial greeting (unless we want that too)
    // We only speak when isLoading flips from true to false, to avoid speaking on load
    const prevLoading = useRef(isLoading);
    useEffect(() => {
        if (prevLoading.current && !isLoading) {
            const lastMsg = messages[messages.length - 1];
            if (lastMsg.role === "assistant") {
                speakText(lastMsg.content);
            }
        }
        prevLoading.current = isLoading;
    }, [isLoading, messages]);

    const speakText = (text: string) => {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);

        // Try to find a suitable voice
        const voices = window.speechSynthesis.getVoices();
        let voice = null;

        if (language === "en") {
            // Prefer Indian English if available, or just English
            voice = voices.find(v => v.lang === "en-IN") || voices.find(v => v.lang.startsWith("en"));
        } else {
            // For Marathi/Hindi/Gujarati, try to find a matching or Indian voice
            voice = voices.find(v => v.lang.includes("hi") || v.lang.includes("mr") || v.lang.includes("gu") || v.lang.includes("IN"));
        }

        if (voice) utterance.voice = voice;

        // Set locale
        if (language === "mr") utterance.lang = "mr-IN";
        else if (language === "hi") utterance.lang = "hi-IN";
        else if (language === "gu") utterance.lang = "gu-IN";
        else utterance.lang = "en-IN";

        utterance.pitch = 1.0;
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
    };

    // Greeting update on location change
    useEffect(() => {
        if (location) {
            let greeting = "";
            switch (language) {
                case "mr":
                    greeting = `${location.name} येथे आपले स्वागत आहे. ${location.description} तुम्हाला काय जाणून घ्यायला आवडेल?`;
                    break;
                case "hi":
                    greeting = `${location.name} में आपका स्वागत है। ${location.description} आप क्या जानना चाहेंगे?`;
                    break;
                case "gu":
                    greeting = `${location.name} માં તમારું સ્વાગત છે. ${location.description} તમે શું જાણવા માંગો છો?`;
                    break;
                default: // en
                    greeting = `You have arrived at ${location.name}. ${location.description} What would you like to know?`;
            }

            setMessages(prev => [
                ...prev,
                { role: "assistant", content: greeting }
            ]);
            speakText(greeting);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location?.id]);

    const getLanguageLabel = (lang: string) => {
        switch (lang) {
            case "mr": return "मराठी";
            case "hi": return "हिंदी";
            case "gu": return "ગુજરાતી";
            default: return "English";
        }
    };

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = { role: "user", content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [...messages, userMessage],
                    location: location,
                    language: language
                })
            });

            if (!response.ok) throw new Error("Failed to fetch");

            const data = await response.json();
            setMessages(prev => [...prev, { role: "assistant", content: data.content }]);
        } catch (error) {
            console.error(error);
            let errorMsg = "I apologize, the winds are strong and I cannot hear you clearly. Please try again.";
            if (language === "mr") errorMsg = "क्षमस्व, वारे खूप जोरात आहेत आणि मला तुमचे बोलणे स्पष्ट ऐकू येत नाही. कृपया पुन्हा प्रयत्न करा.";
            if (language === "hi") errorMsg = "क्षमा करें, हवाएं बहुत तेज हैं और मैं आपको स्पष्ट रूप से नहीं सुन पा रहा हूँ। कृपया पुनः प्रयास करें।";
            if (language === "gu") errorMsg = "માફ કરશો, પવનો ખૂબ જોરદાર છે અને હું તમને સ્પષ્ટ રીતે સાંભળી શકતો નથી. કૃપા કરીને ફરી પ્રયાસ કરો.";
            setMessages(prev => [...prev, { role: "assistant", content: errorMsg }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md h-[500px] flex flex-col bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
                <div>
                    <h3 className="font-serif text-lg text-white/90 tracking-wide">Sahyadri Guide</h3>
                    <span className="text-xs text-teal-400 font-mono uppercase">{location?.name || "Maharashtra"}</span>
                </div>

                <div className="relative">
                    <button
                        onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-full text-xs text-white/90 transition-all border border-white/5 font-medium"
                    >
                        <Languages className="w-3 h-3 text-teal-400" />
                        {getLanguageLabel(language)}
                        <ChevronDown className={`w-3 h-3 opacity-60 transition-transform ${isLangMenuOpen ? "rotate-180" : ""}`} />
                    </button>

                    <AnimatePresence>
                        {isLangMenuOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                transition={{ duration: 0.1 }}
                                className="absolute right-0 top-full mt-2 w-32 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-xl z-50 flex flex-col py-1"
                            >
                                {["en", "mr", "hi", "gu"].map((lang) => (
                                    <button
                                        key={lang}
                                        onClick={() => {
                                            setLanguage(lang as any);
                                            setIsLangMenuOpen(false);
                                        }}
                                        className={`w-full text-left px-4 py-2 text-xs transition-colors hover:bg-white/10 ${language === lang
                                            ? "text-teal-400 font-medium bg-teal-900/20"
                                            : "text-slate-300"
                                            }`}
                                    >
                                        {getLanguageLabel(lang)}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/20">
                {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] rounded-2xl p-3 text-sm leading-relaxed ${m.role === "user"
                            ? "bg-teal-900/50 text-white rounded-br-none border border-teal-500/30"
                            : "bg-white/10 text-slate-200 rounded-bl-none border border-white/5"
                            }`}>
                            {m.content}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-white/5 rounded-2xl p-3 flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
                            <span className="text-xs text-slate-400">
                                {language === "en" && "Consulting the archives..."}
                                {language === "mr" && "इतिहासाच्या शोधात..."}
                                {language === "hi" && "इतिहास की तलाश में..."}
                                {language === "gu" && "ઇતિહાસની શોધમાં..."}
                            </span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/10 bg-black/40">
                <div className="flex items-center gap-2 bg-white/5 rounded-xl px-4 py-2 border border-white/10 focus-within:border-teal-500/50 transition-colors">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                        placeholder={
                            language === "en" ? "Ask about this place..." :
                                language === "mr" ? "या ठिकाणाबद्दल विचारा..." :
                                    language === "hi" ? "इस जगह के बारे में पूछें..." :
                                        "આ જગ્યા વિશે પૂછો..."
                        }
                        className="flex-1 bg-transparent border-none outline-none text-white placeholder-slate-500 text-sm"
                        disabled={isLoading}
                    />
                    <button
                        onClick={handleSend}
                        disabled={isLoading || !input.trim()}
                        className="p-2 rounded-lg hover:bg-white/10 text-teal-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
