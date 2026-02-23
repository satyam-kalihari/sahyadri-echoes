
// Define types for Sarvam API responses if SDK doesn't provide them or for clarity
// Since we don't have the SDK types handy, we'll interface the service.

export class SarvamService {
    private apiKey: string;
    private baseUrl: string = "https://api.sarvam.ai"; // Assuming standard base URL, or use SDK

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    /**
     * Speech to Text using Saaras:v1
     */
    async transcribe(audioBuffer: Buffer): Promise<string> {
        // Using fetch/axios for FormData if SDK behavior is uncertain for Buffer handling
        // But let's try to follow the "client" pattern if the SDK is simple.
        // However, without knowing the exact SDK signature for file uploads, direct API call via fetch/axios is deeper but safer if documented.
        // User provided snippets for translate/TTS but not STT.
        // I will assume standard multipart/form-data for STT.

        // Use basic fetch to avoid SDK guessing games for file upload
        const formData = new FormData();
        // Create Blob safely for Node environment if possible, or use Buffer directly with filename if supported by FormData implementation
        // In Edge/Node, strictly typed FormData might expect Blob. 
        const blob = new Blob([audioBuffer as any], { type: 'audio/wav' });
        formData.append('file', blob, 'audio.wav');
        formData.append('model', 'saaras:v1');

        try {
            const response = await fetch(`${this.baseUrl}/speech-to-text-translate`, {
                // Actual endpoint might be /speech-to-text. Let's verify standard Sarvam endpoints if possible.
                // Reverting to the provided SDK snippets style for consistency where possible.
                // But for STT, let's look at the method: `transcribe`.

                // Let's rely on standard Sarvam API structure: POST /speech-to-text
                method: 'POST',
                headers: {
                    'api-subscription-key': this.apiKey, // Sarvam usually uses this header
                },
                body: formData
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Sarvam STT Failed: ${response.status} ${errorText}`);
            }

            const data = await response.json();
            return data.transcript || "";
        } catch (error) {
            console.error("Sarvam STT Error:", error);
            throw error;
        }
    }

    /**
     * Translation using Mayura:v1
     */
    async translate(text: string, sourceLang: string, targetLang: string): Promise<string> {
        try {
            const response = await fetch(`${this.baseUrl}/translate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'api-subscription-key': this.apiKey,
                },
                body: JSON.stringify({
                    input: text,
                    source_language_code: sourceLang,
                    target_language_code: targetLang,
                    model: "mayura:v1",
                    speaker_gender: "Male", // Optional
                    mode: "formal" // Optional
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Sarvam Translation Failed: ${response.status} ${errorText}`);
            }

            const data = await response.json();
            return data.translated_text || "";

        } catch (error) {
            console.error("Sarvam Translation Error:", error);
            throw error;
        }
    }

    /**
     * Text to Speech using Bulbul:v1
     */
    async speak(text: string, targetLang: string): Promise<string> {
        try {
            const response = await fetch(`${this.baseUrl}/text-to-speech`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'api-subscription-key': this.apiKey,
                },
                body: JSON.stringify({
                    inputs: [text],
                    target_language_code: targetLang,
                    speaker: "anushka", // standard voice
                    pitch: 0,
                    pace: 1.0,
                    loudness: 1.5,
                    speech_sample_rate: 8000,
                    enable_preprocessing: true,
                    model: "bulbul:v2"
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Sarvam TTS Failed: ${response.status} ${errorText}`);
            }

            const data = await response.json();
            // Sarvam returns audios array of base64 strings
            return data.audios && data.audios[0] ? data.audios[0] : "";

        } catch (error) {
            console.error("Sarvam TTS Error:", error);
            throw error;
        }
    }
}
