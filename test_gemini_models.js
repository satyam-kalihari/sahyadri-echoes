
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config({ path: ".env.local" });

const apiKey = process.env.GEMINI_API_KEY;

const fs = require('fs');

async function listModelsRaw() {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.models) {
            const output = data.models.map(m => `- ${m.name} (${m.supportedGenerationMethods})`).join('\n');
            fs.writeFileSync('models.txt', output);
            console.log("Models written to models.txt");
        } else {
            console.log("No models found or error:", data);
        }
    } catch (error) {
        console.error("Error listing models:", error);
    }
}

listModelsRaw();
