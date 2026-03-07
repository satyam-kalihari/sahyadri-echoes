
import { searchSangraha } from "../../lib/hf-stream";
import { SarvamService } from "../../lib/sarvam";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { OpenAI } from "openai";

const SARVAM_API_KEY = process.env.SARVAM_API_KEY || "";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

// Initialize Services
const sarvam = new SarvamService(SARVAM_API_KEY);
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

export async function POST(req: Request) {
    try {
        let userQuery = "";
        let audioBuffer: Buffer | null = null;
        let language = "en";
        let locationName = "Unknown Location";

        // Parse Request (Support both JSON and FormData)
        const contentType = req.headers.get("content-type") || "";

        if (contentType.includes("multipart/form-data")) {
            const formData = await req.formData();
            const file = formData.get("audio") as Blob | null;
            if (file) {
                const arrayBuffer = await file.arrayBuffer();
                audioBuffer = Buffer.from(arrayBuffer);
            }
            userQuery = (formData.get("text") as string) || "";
            language = (formData.get("language") as string) || "en";
            locationName = (formData.get("location") as string) || "Unknown Location";
        } else {
            const body = await req.json();
            const messages = body.messages || [];
            if (messages.length > 0) {
                userQuery = messages[messages.length - 1]?.content || "";
            }
            language = body.language || "en";
            locationName = body.location?.name || "Unknown Location";
        }

        console.log(`[Chat] Request: Lang=${language}, Loc=${locationName}, HasAudio=${!!audioBuffer}, Text=${userQuery}`);

        // Map frontend language codes to Sarvam/General BCP-47 codes
        const langMap: Record<string, string> = {
            "mr": "mr-IN",
            "hi": "hi-IN",
            "gu": "gu-IN",
            "en": "en-IN"
        };
        const sourceLangCode = langMap[language] || "en-IN";

        // --- Step 1: Input Processing (STT) ---
        if (audioBuffer) {
            console.log(`[Chat] Transcribing audio (${audioBuffer.length} bytes)...`);
            try {
                const transcript = await sarvam.transcribe(audioBuffer, sourceLangCode);
                if (transcript) {
                    userQuery = transcript;
                    console.log(`[Chat] Transcribed: "${userQuery}"`);
                } else {
                    console.warn("[Chat] Transcription returned empty string");
                }
            } catch (e: any) {
                console.error("[Chat] Transcription failed:", e?.message || e);
                // Fallback: If text was also provided, use it. If not, error.
                if (!userQuery) throw new Error("Audio transcription failed and no text provided.");
            }
        }

        if (!userQuery.trim()) {
            return Response.json({ role: "assistant", content: "I could not hear you. Please try again." });
        }

        // --- Step 2: Input Translation (to English) ---
        let englishQuery = userQuery;

        // Determine if translation is needed (if language is not English)
        if (language !== "en") {
            try {
                console.log(`[Chat] Translating input from ${language} to en...`);
                englishQuery = await sarvam.translate(userQuery, sourceLangCode, "en-IN");
                console.log(`[Chat] Translated Query: "${englishQuery}"`);
            } catch (e) {
                console.error("[Chat] Input translation failed:", e);
                // Proceed with original text, hope model understands
            }
        }

        // --- Step 3: Intelligence (OpenAI/HF) ---
        // Retrieve Context
        let contextText = "";
        try {
            const contextDocs = await searchSangraha(englishQuery);
            if (contextDocs && Array.isArray(contextDocs)) {
                contextText = contextDocs.map(d => d.text).join("\n");
            }
        } catch (err) {
            console.warn("[Chat] Context retrieval failed:", err);
        }

        // Sanitize inputs to prevent injection or formatting issues in the prompt
        const sanitizedLocation = locationName.replace(/[`${}]/g, "").trim().substring(0, 100);
        const sanitizedContext = contextText.replace(/[`$]/g, "").substring(0, 2000); // Limit context length

        // Construct Prompt
        const systemPrompt = `You are "Sahyadri", a wise and poetic storyteller guide for Maharashtra tourism.
You are currently guiding a traveler at: ${sanitizedLocation}.

IMPORTANT RULES:
- ONLY provide information about ${sanitizedLocation}. Do NOT mention or discuss any other place unless the user explicitly asks for a comparison.
- If the retrieved context below mentions places other than ${sanitizedLocation}, IGNORE those parts entirely.
- If the user asks about a different place, politely redirect them: "I am currently your guide at ${sanitizedLocation}. Shall I tell you more about this place?"
- Keep the response cinematic, engaging, and under 100 words.
- Provide the response in simple English.

Retrieved context (use ONLY parts relevant to ${sanitizedLocation}):
${sanitizedContext}
`;

        console.log("[Chat] Calling LLM (Gemini primary, HF fallback)...");

        let englishResponse = "";
        let success = false;
        let lastError;
        let modelSource = "unknown";

        // Try Gemini first
        try {
            console.log("[Chat] Trying Gemini gemini-2.0-flash...");
            const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            const result = await geminiModel.generateContent(
                `${systemPrompt}\n\nUser: [Location: ${sanitizedLocation}] ${englishQuery}`
            );
            const text = result.response.text();
            if (text) {
                englishResponse = text;
                modelSource = "Gemini/gemini-2.0-flash";
                success = true;
                console.log("[Chat] Gemini succeeded");
            }
        } catch (err) {
            console.warn("[Chat] Gemini failed:", err);
            lastError = err;
        }

        // Fallback: HF Inference Router
        if (!success) {
            const models = [
                "Qwen/Qwen2.5-72B-Instruct",
                "mistralai/Mistral-7B-Instruct-v0.3",
            ];

            for (const model of models) {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000);
                try {
                    console.log(`[Chat] Trying HF model: ${model}`);
                    const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${process.env.HF_TOKEN}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            model: model,
                            messages: [
                                { role: "system", content: systemPrompt },
                                { role: "user", content: `[Location: ${sanitizedLocation}] ${englishQuery}` }
                            ],
                            max_tokens: 250,
                            temperature: 0.7,
                        }),
                        signal: controller.signal,
                    });
                    clearTimeout(timeoutId);

                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(`HF API error: ${response.status} ${errorText}`);
                    }

                    const data = await response.json();
                    if (data.choices && data.choices.length > 0 && data.choices[0].message) {
                        englishResponse = data.choices[0].message.content || "";
                        modelSource = `HF/${model}`;
                        success = true;
                        break;
                    }
                } catch (err: any) {
                    clearTimeout(timeoutId);
                    if (err?.name === "AbortError") {
                        console.warn(`[Chat] HF Model ${model} timed out after 15s`);
                    } else {
                        console.warn(`[Chat] HF Model ${model} failed:`, err);
                    }
                    lastError = err;
                }
            }
        }

        if (!success) {
            throw lastError || new Error("All LLM providers failed.");
        }

        console.log(`[Chat] Response from ${modelSource}: "${englishResponse}"`);


        // --- Step 4: Output Processing (Translation + TTS) ---
        let finalResponseText = englishResponse;
        let audioBase64 = "";

        if (language !== "en") {
            try {
                console.log(`[Chat] Translating response to ${language}...`);
                finalResponseText = await sarvam.translate(englishResponse, "en-IN", sourceLangCode);
                console.log(`[Chat] Final Response: "${finalResponseText}"`);
            } catch (e) {
                console.error("[Chat] Output translation failed:", e);
                // Fallback to English
            }
        }

        // Generate Audio (TTS)
        // Only generate audio if we have a valid response
        if (finalResponseText) {
            try {
                console.log(`[Chat] Generating TTS for ${language}...`);
                // Use the mapped language code for TTS
                audioBase64 = await sarvam.speak(finalResponseText, sourceLangCode);
            } catch (e) {
                console.error("[Chat] TTS failed:", e);
            }
        }

        return Response.json({
            role: "assistant",
            content: finalResponseText,
            audio: audioBase64, // Frontend needs to play this
            englishContent: englishResponse // Optional: for debugging
        });

    } catch (error: any) {
        console.error("[Chat] Fatal Error:", error);
        return Response.json({
            role: "assistant",
            content: "I apologize, but I am unable to connect right now. Please try again later."
        }, { status: 500 });
    }
}
