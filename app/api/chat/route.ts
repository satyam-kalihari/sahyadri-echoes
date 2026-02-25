
import { searchSangraha } from "../../lib/hf-stream";
import { SarvamService } from "../../lib/sarvam";
// import { GoogleGenerativeAI } from "@google/generative-ai";
import { OpenAI } from "openai";

const SARVAM_API_KEY = process.env.SARVAM_API_KEY || "";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

// Initialize Services
const sarvam = new SarvamService(SARVAM_API_KEY);
// const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
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

        // ... (Gemini/OpenAI commented out)

        console.log("[Chat] Calling Hugging Face Inference...");

        const models = [
            "microsoft/Phi-3.5-mini-instruct",
            "meta-llama/Llama-3.2-3B-Instruct",
            "HuggingFaceTB/SmolLM2-1.7B-Instruct"
        ];

        let englishResponse = "";
        let success = false;
        let lastError;

        for (const model of models) {
            try {
                console.log(`Trying model: ${model}`);
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
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`HF API error: ${response.status} ${errorText}`);
                }

                const data = await response.json();
                if (data.choices && data.choices.length > 0 && data.choices[0].message) {
                    englishResponse = data.choices[0].message.content || "";
                    success = true;
                    break;
                }
            } catch (err) {
                console.warn(`Model ${model} failed:`, err);
                lastError = err;
            }
        }

        if (!success) {
            throw lastError || new Error("All HF models failed.");
        }

        console.log(`[Chat] HF Response: "${englishResponse}"`);


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
