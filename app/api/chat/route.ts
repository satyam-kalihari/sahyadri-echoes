

import { searchSangraha } from "../../lib/hf-stream";

const HF_TOKEN = process.env.HF_TOKEN;

export async function POST(req: Request) {
    try {
        const { messages, location, language } = await req.json();
        const lastMessage = messages[messages.length - 1];
        const userQuery = lastMessage.content;

        // 1. Retrieve Context
        let contextText = "";
        try {
            const contextDocs = await searchSangraha(userQuery);
            contextText = contextDocs.map(d => d.text).join("\n");
        } catch (err) {
            console.warn("Context retrieval failed, proceeding without context:", err);
        }

        // 2. Construct System Instructions
        let langName = "English";
        switch (language) {
            case "mr": langName = "Marathi (मराठी)"; break;
            case "hi": langName = "Hindi (हिंदी)"; break;
            case "gu": langName = "Gujarati (ગુજરાતી)"; break;
            default: langName = "English";
        }

        const systemInstructions = `You are "Sahyadri", a wise and poetic storyteller guide for Maharashtra tourism.
You are currently guiding a traveler at: ${location?.name || "Unknown Location in Maharashtra"}.
Language: ${langName}.
Reply ONLY in the requested language.
Keep your response cinematic, engaging, and under 150 words.

Context:
${contextText}`;

        // 3. Generate Response with Fallback
        const models = [
            "microsoft/Phi-3.5-mini-instruct",
            "meta-llama/Llama-3.2-3B-Instruct",
            "HuggingFaceTB/SmolLM2-1.7B-Instruct"
        ];

        let resultText = "";
        let success = false;
        let lastError;

        for (const model of models) {
            try {
                console.log(`Trying model: ${model}`);
                const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
                    headers: {
                        Authorization: `Bearer ${HF_TOKEN}`,
                        "Content-Type": "application/json",
                    },
                    method: "POST",
                    body: JSON.stringify({
                        model: model,
                        messages: [
                            { role: "system", content: systemInstructions },
                            { role: "user", content: userQuery }
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
                    resultText = data.choices[0].message.content;
                    success = true;
                    break; // Exit loop on success
                } else {
                    throw new Error("Invalid response format from HF Router");
                }

            } catch (err) {
                console.warn(`Model ${model} failed:`, err);
                lastError = err;
                // Continue to next model
            }
        }

        if (!success) {
            throw lastError || new Error("All models failed.");
        }

        return Response.json({
            role: "assistant",
            content: resultText.replace(/\*/g, "").trim()
        });

    } catch (error) {
        console.error("Chat API Fatal Error:", error);
        // Fallback response if API fails completely to keep UI usable
        return Response.json({
            role: "assistant",
            content: "I apologize, the connection to the archives is weak right now. Please try asking again in a moment. (API usage limit or timeout)"
        });
    }
}
