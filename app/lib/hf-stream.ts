const HF_TOKEN = process.env.HF_TOKEN;

// Using a lightweight model for embedding/similarity or direct text generation if dataset API allows
// For "Zero-Download", we technically use the Datasets Server API (https://huggingface.co/docs/datasets-server/index)
// Fetching rows from 'ai4bharat/sangraha'

export async function searchSangraha(query: string) {
    // Placeholder: Real implementation would query the dataset API
    // Since we can't easily run semantic search on the dataset server without a hosted endpoint,
    // we will standard search or fetch specific rows based on keywords.

    // For this hackathon/demo, we might mock this or use a simple keyword filter on a subset if searching is hard.
    // Ideally: Use HF Inference API "Feature Extraction" on the query, but we need the dataset indexed.

    // fallback: Return mock data relevant to Maharashtra if API fails or is too complex for 5 mins
    // But let's try to fetch from the dataset "search" endpoint if available.

    // https://datasets-server.huggingface.co/search?dataset=ai4bharat%2Fsangraha&config=default&split=train&query=...
    // Note: search endpoint might not be enabled for all datasets.

    console.log(`Searching Sangraha for: ${query}`);

    // MOCK DATA for "Sahyadri Echoes"
    return [
        { text: "The Ajanta Caves are 30 rock-cut Buddhist cave monuments which date from the 2nd century BCE to about 480 CE." },
        { text: "Ellora is a UNESCO World Heritage Site located in the Aurangabad district of Maharashtra, India." },
        { text: "Shivaji Maharaj forts like Raigad and Pratapgad stand as testaments to the Maratha Empire's glory." }
    ];
}
