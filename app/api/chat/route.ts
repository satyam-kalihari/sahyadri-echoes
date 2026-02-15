import { searchSangraha } from "../../lib/hf-stream";
// Note: might need to install 'ai' package if not present?
// Actually, let's use standard Response for simplicity if 'ai' not installed, or check package.json.
// I installed langchain, @langchain/openai, @huggingface/inference.
// I did NOT install 'ai' (Vercel AI SDK).
// So I will implement custom streaming or just JSON response for now.

const HF_TOKEN = process.env.HF_TOKEN;

// Mock Chatbot Logic
function generateMockResponse(location: any, query: string, language: string): string {
    const lowerQuery = query.toLowerCase();
    const locName = location?.name || "Maharashtra";

    // General Greetings
    if (lowerQuery.includes("hello") || lowerQuery === "hi" || lowerQuery.startsWith("hi ") || lowerQuery.includes("namaskar")) {
        return `Namaskar! Welcome to ${locName}. How can I assist you today?`;
    }

    // Specific to Location
    if (locName.includes("Ajanta")) {
        if (lowerQuery.includes("history") || lowerQuery.includes("built")) {
            return "The Ajanta Caves date back to the 2nd century BCE to about 480 CE. They are a masterpiece of Buddhist religious art, featuring ancient paintings and rock-cut sculptures described as the finest surviving examples of Indian art.";
        }
        if (lowerQuery.includes("special") || lowerQuery.includes("famous")) {
            return "Ajanta is famous for its exquisite mural paintings that depict the life of Buddha (Jataka tales). The caves are a UNESCO World Heritage Site and are considered a masterpiece of Buddhist religious art.";
        }
    }

    if (locName.includes("Ellora")) {
        if (lowerQuery.includes("history") || lowerQuery.includes("built")) {
            return "Ellora is a UNESCO World Heritage Site featuring Buddhist, Hindu and Jain monuments, and artwork, dating from the 600–1000 CE period.";
        }
        if (lowerQuery.includes("special") || lowerQuery.includes("kailasa")) {
            return "The Kailasa temple (Cave 16) is the largest monolithic rock excavation in the world. It is a chariot shaped monument dedicated to Lord Shiva.";
        }
    }

    // General Queries
    if (lowerQuery.includes("time") || lowerQuery.includes("visit")) {
        return `The best time to visit ${locName} is generally from October to March when the weather is pleasant.`;
    }

    if (lowerQuery.includes("food") || lowerQuery.includes("eat")) {
        return "You can find authentic Maharashtrian cuisine nearby. Look for Puran Poli, Misal Pav, and Vada Pav.";
    }

    return `I am Sahyadri, your guide. I can tell you about the history and special features of ${locName}. Please ask me about its history or what makes it special.`;
}

export async function POST(req: Request) {
    try {
        const { messages, location, language } = await req.json();
        const lastMessage = messages[messages.length - 1];
        const userQuery = lastMessage.content;

        // 1. Retrieve Context (Optional - kept for future use)
        // const contextDocs = await searchSangraha(userQuery);

        // 2. Generate Mock Response
        await new Promise(resolve => setTimeout(resolve, 800)); // Simulate network delay
        const text = generateMockResponse(location, userQuery, language || "en");

        return Response.json({ role: "assistant", content: text });
    } catch (error) {
        console.error("Mock Chat API Error:", error);
        return Response.json({ error: "Failed to generate response." }, { status: 500 });
    }
}
