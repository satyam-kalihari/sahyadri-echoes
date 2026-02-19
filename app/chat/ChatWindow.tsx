
"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, User, Bot, Loader2, ChevronDown, Languages, Mic, Square } from "lucide-react";
import { MapLocation } from "../map/MapView";
import { useAudioRecorder } from "../hooks/useAudioRecorder";

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
    const { isRecording, startRecording, stopRecording } = useAudioRecorder();
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Cleanup audio on unmount
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    const playAudio = (base64Audio: string) => {
        if (!base64Audio) return;
        try {
            if (audioRef.current) {
                audioRef.current.pause();
            }
            const audio = new Audio(`data:audio/wav;base64,${base64Audio}`);
            audioRef.current = audio;
            audio.play().catch(e => console.error("Audio playback error:", e));
        } catch (e) {
            console.error("Failed to create audio element", e);
        }
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
            // Note: We are not speaking this greeting via Sarvam to save API calls, 
            // unless we want to trigger a "greet" API. For now, text only for initial greeting.
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

    const handleSend = async (audioBlob?: Blob) => {
        if ((!input.trim() && !audioBlob) || isLoading) return;

        // Optimistic UI update only for text
        if (!audioBlob) {
            const userMessage: Message = { role: "user", content: input };
            setMessages(prev => [...prev, userMessage]);
            setInput("");
        } else {
            // For audio, we might show a "Processing audio..." placeholder or just wait
            // Let's rely on the loading state
        }

        setIsLoading(true);

        try {
            const formData = new FormData();

            if (audioBlob) {
                formData.append("audio", audioBlob, "recording.wav");
                // When sending audio, we might not have text yet.
                // The API will transcribe it.
            } else {
                formData.append("text", input);
                // Attach history for context if needed, but the current API mainly looks at the current prompt
                // The API can handle messages array in JSON, but mixed FormData is tricky.
                // Let's send the last text query. The API is stateless regarding history mostly/uses simplistic context.
                // To support history with Sarvam, we'd need to send history in formData stringified?
                // For simplicity as per spec, we just send the current "text" or "audio".
            }

            formData.append("language", language);
            formData.append("location", location?.name || "Unknown");
            // Also append messages if we want history, but the API spec example was looking at "req.body.messages".
            // Our updated route handles both. 
            // If we use FormData, route expects 'text' field for the query.
            // Let's append previous messages as JSON string if we want to be fancy, but the route implemented: 
            // `userQuery = (formData.get("text") as string)`. 
            // So it only takes the single turn. That is fine for this task.

            const response = await fetch("/api/chat", {
                method: "POST",
                body: formData, // fetch automatically sets Content-Type to multipart/form-data
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("API Error:", response.status, errorText);
                throw new Error(`Failed to fetch: ${response.status} ${errorText}`);
            }

            const data = await response.json();

            // If we sent audio, we didn't show the user's message yet.
            // We could show the transcribed text if returned?
            // The API doesn't return the transcribed text in the simplified response structure in the spec.
            // Wait, I added `englishContent` and logic to `userQuery`.
            // But I didn't return the *original* transcribed text in the final JSON explicitly in the spec.
            // However, the user experience is better if they see what they said.
            // But for now, let's just show the assistant response.

            setMessages(prev => [...prev, { role: "assistant", content: data.content }]);

            // Play Audio
            if (data.audio) {
                playAudio(data.audio);
            }

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

    const handleMicClick = async () => {
        if (isRecording) {
            // Stop recording
            const blob = await stopRecording();
            if (blob) {
                handleSend(blob);
            }
        } else {
            // Start recording
            try {
                await startRecording();
            } catch (error) {
                console.error("Failed to start recording:", error);
                // Optionally show a toast or message
                setMessages(prev => [...prev, { role: "assistant", content: "Could not access microphone. Please check permissions." }]);
            }
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
                                {isRecording ? "Listening..." :
                                    (language === "en" ? "Consulting the archives..." :
                                        language === "mr" ? "इतिहासाच्या शोधात..." :
                                            language === "hi" ? "इतिहास की तलाश में..." :
                                                "ઇતિહાસની શોધમાં...")}
                            </span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/10 bg-black/40">
                <div className="flex items-center gap-2 bg-white/5 rounded-xl px-2 py-2 border border-white/10 focus-within:border-teal-500/50 transition-colors">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                        placeholder={
                            isRecording ? "Listening..." :
                                (language === "en" ? "Ask about this place..." :
                                    language === "mr" ? "या ठिकाणाबद्दल विचारा..." :
                                        language === "hi" ? "इस जगह के बारे में पूछें..." :
                                            "આ જગ્યા વિશે પૂછો...")
                        }
                        className="flex-1 bg-transparent border-none outline-none text-white placeholder-slate-500 text-sm px-2"
                        disabled={isLoading || isRecording}
                    />

                    {/* Mic Button */}
                    <button
                        onClick={handleMicClick}
                        disabled={isLoading && !isRecording}
                        className={`p-2 rounded-lg transition-all ${isRecording
                            ? "bg-red-500/20 text-red-500 hover:bg-red-500/30 animate-pulse"
                            : "hover:bg-white/10 text-teal-400"
                            }`}
                    >
                        {isRecording ? <Square className="w-4 h-4 fill-current" /> : <Mic className="w-4 h-4" />}
                    </button>

                    {/* Send Button */}
                    <button
                        onClick={() => handleSend()}
                        disabled={isLoading || isRecording || !input.trim()}
                        className="p-2 rounded-lg hover:bg-white/10 text-teal-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
