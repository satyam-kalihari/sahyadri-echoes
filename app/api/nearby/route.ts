
import { SarvamService } from "../../lib/sarvam";
import { GoogleGenerativeAI } from "@google/generative-ai";

const SARVAM_API_KEY = process.env.SARVAM_API_KEY || "";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

const sarvam = new SarvamService(SARVAM_API_KEY);
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Language code mapping (same as chat route)
const langMap: Record<string, string> = {
    "mr": "mr-IN",
    "hi": "hi-IN",
    "gu": "gu-IN",
    "en": "en-IN",
};

/**
 * Reverse geocode using OpenStreetMap Nominatim (free, no API key).
 */
async function reverseGeocode(lat: number, lng: number): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=12&addressdetails=1`;
        const res = await fetch(url, {
            headers: {
                "User-Agent": "SahyadriEchoes/1.0 (tourism-project)",
                "Accept-Language": "en",
            },
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error(`Nominatim error: ${res.status}`);

        const data = await res.json();
        // Build a readable place name from address components
        const addr = data.address || {};
        const parts = [
            addr.village || addr.town || addr.city || addr.county || "",
            addr.state_district || "",
            addr.state || "",
        ].filter(Boolean);

        return parts.join(", ") || data.display_name || "Unknown area";
    } catch (err: any) {
        clearTimeout(timeoutId);
        if (err?.name === "AbortError") {
            console.error("[Nearby] Reverse geocode timed out after 5s");
        } else {
            console.error("[Nearby] Reverse geocode failed:", err);
        }
        return "Unknown area";
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const rawLat = Number(body.latitude);
        const rawLng = Number(body.longitude);
        const language: string = body.language || "en";

        if (!Number.isFinite(rawLat) || !Number.isFinite(rawLng)) {
            return Response.json(
                { error: "latitude and longitude must be valid numbers" },
                { status: 400 }
            );
        }
        if (rawLat < -90 || rawLat > 90) {
            return Response.json(
                { error: "latitude must be between -90 and 90" },
                { status: 400 }
            );
        }
        if (rawLng < -180 || rawLng > 180) {
            return Response.json(
                { error: "longitude must be between -180 and 180" },
                { status: 400 }
            );
        }
        const latitude = rawLat;
        const longitude = rawLng;

        console.log(`[Nearby] Request: lat=${latitude}, lng=${longitude}, lang=${language}`);

        const sourceLangCode = langMap[language] || "en-IN";

        // --- Step 1: Reverse Geocode ---
        const placeName = await reverseGeocode(latitude, longitude);
        console.log(`[Nearby] Reverse geocoded: "${placeName}"`);

        // --- Step 2: Build LLM Prompt ---
        const systemPrompt = `You are "Sahyadri", a wise and poetic tourism guide for India, specializing in Maharashtra.
The user is currently located at: ${placeName} (coordinates: ${latitude}, ${longitude}).

STRICT RULES:
1. First, give a brief 2-3 line introduction about ${placeName} itself — its history, culture, or significance.
2. Then list 3-4 notable places, landmarks, temples, forts, or attractions STRICTLY within a 5-10 km radius of the user's current location in ${placeName}.
3. Do NOT suggest places that are far away (more than 10 km). Only mention what is genuinely nearby or within the same city/town.
4. For each nearby place, give the name and a single vivid, descriptive line.
5. Format as a numbered list.
6. Keep the total response under 120 words.
7. Respond in simple, plain English.
8. Do NOT use any markdown formatting — no asterisks (*), no bold (**), no hashtags (#), no underscores (_). Use only plain text.`;

        const userMessage = `I am currently at ${placeName}. Tell me about this place and what are the must-visit spots within 5-10 km of me?`;

        // --- Step 3: Call LLM (Gemini primary, HF fallback) ---
        let englishResponse = "";
        let success = false;
        let lastError: any;

        // Try Gemini first (most reliable)
        try {
            console.log("[Nearby] Trying Gemini gemini-2.0-flash...");
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            const result = await model.generateContent(
                `${systemPrompt}\n\nUser: ${userMessage}`
            );
            const text = result.response.text();
            if (text) {
                englishResponse = text;
                success = true;
                console.log("[Nearby] Gemini succeeded");
            }
        } catch (err) {
            console.warn("[Nearby] Gemini failed:", err);
            lastError = err;
        }

        // Fallback: HF Inference Router
        if (!success) {
            const hfModels = [
                "Qwen/Qwen2.5-72B-Instruct",
                "mistralai/Mistral-7B-Instruct-v0.3",
            ];

            for (const hfModel of hfModels) {
                try {
                    console.log(`[Nearby] Trying HF model: ${hfModel}`);
                    const response = await fetch(
                        "https://router.huggingface.co/v1/chat/completions",
                        {
                            method: "POST",
                            headers: {
                                Authorization: `Bearer ${process.env.HF_TOKEN}`,
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                                model: hfModel,
                                messages: [
                                    { role: "system", content: systemPrompt },
                                    { role: "user", content: userMessage },
                                ],
                                max_tokens: 350,
                                temperature: 0.7,
                            }),
                        }
                    );

                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(`HF API error: ${response.status} ${errorText}`);
                    }

                    const data = await response.json();
                    if (data.choices?.[0]?.message?.content) {
                        englishResponse = data.choices[0].message.content;
                        success = true;
                        break;
                    }
                } catch (err) {
                    console.warn(`[Nearby] HF Model ${hfModel} failed:`, err);
                    lastError = err;
                }
            }
        }

        if (!success) {
            throw lastError || new Error("All LLM providers failed.");
        }

        console.log(`[Nearby] LLM Response: "${englishResponse.substring(0, 100)}..."`);

        // --- Step 4: Translate if needed ---
        let finalText = englishResponse;

        if (language !== "en") {
            try {
                console.log(`[Nearby] Translating to ${language}...`);
                finalText = await sarvam.translate(englishResponse, "en-IN", sourceLangCode);
            } catch (e) {
                console.error("[Nearby] Translation failed:", e);
                // Fallback to English
            }
        }

        // --- Step 5: TTS ---
        let audioBase64 = "";
        if (finalText) {
            try {
                console.log(`[Nearby] Generating TTS for ${language}...`);
                audioBase64 = await sarvam.speak(finalText, sourceLangCode);
            } catch (e) {
                console.error("[Nearby] TTS failed:", e);
            }
        }

        return Response.json({
            role: "assistant",
            content: finalText,
            audio: audioBase64,
            englishContent: englishResponse,
            placeName,
        });
    } catch (error: any) {
        console.error("[Nearby] Fatal Error:", error);
        return Response.json(
            {
                role: "assistant",
                content: "I apologize, but I could not identify nearby places right now. Please try again later.",
            },
            { status: 500 }
        );
    }
}
