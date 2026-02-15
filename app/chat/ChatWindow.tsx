"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, User, Bot, Loader2 } from "lucide-react";
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
            content: "Namaskar! I am Sahyadri. Select a location on the map, and I shall tell you its story."
        }
    ]);
    const [language, setLanguage] = useState<"en" | "mr">("en");
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Greeting update on location change
    useEffect(() => {
        if (location) {
            const greeting = language === "en"
                ? `You have arrived at ${location.name}. ${location.description} What would you like to know?`
                : `${location.name} येथे आपले स्वागत आहे. ${location.description} तुम्हाला काय जाणून घ्यायला आवडेल?`;

            setMessages(prev => [
                ...prev,
                { role: "assistant", content: greeting }
            ]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location?.id]);

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
            setMessages(prev => [...prev, { role: "assistant", content: language === "en" ? "I apologize, the winds are strong and I cannot hear you clearly. Please try again." : "क्षमस्व, वारे खूप जोरात आहेत आणि मला तुमचे बोलणे स्पष्ट ऐकू येत नाही. कृपया पुन्हा प्रयत्न करा." }]);
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
                <button
                    onClick={() => setLanguage(prev => prev === "en" ? "mr" : "en")}
                    className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-full text-xs text-white/80 transition-colors border border-white/5 font-medium"
                >
                    {language === "en" ? "English" : "मराठी"}
                </button>
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
                            <span className="text-xs text-slate-400">{language === "en" ? "Consulting the archives..." : "अभिलेखागाराचा सल्ला घेत आहे..."}</span>
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
                        placeholder={language === "en" ? "Ask about this place..." : "या ठिकाणाबद्दल विचारा..."}
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
