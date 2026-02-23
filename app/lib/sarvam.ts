
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
     * Split text into chunks of maxLen characters, breaking at sentence boundaries.
     */
    private chunkText(text: string, maxLen: number = 500): string[] {
        if (text.length <= maxLen) return [text];

        const chunks: string[] = [];
        let remaining = text;

        while (remaining.length > 0) {
            if (remaining.length <= maxLen) {
                chunks.push(remaining);
                break;
            }

            // Try to find a sentence boundary within the limit
            let splitIndex = -1;
            const delimiters = ['. ', '? ', '! ', '.\n', '?\n', '!\n', ', ', '; '];
            for (const delim of delimiters) {
                const idx = remaining.lastIndexOf(delim, maxLen);
                if (idx > 0 && idx > splitIndex) {
                    splitIndex = idx + delim.length;
                }
            }

            // If no good boundary found, split at last space
            if (splitIndex <= 0) {
                splitIndex = remaining.lastIndexOf(' ', maxLen);
            }

            // If still no good split point, hard split at maxLen
            if (splitIndex <= 0) {
                splitIndex = maxLen;
            }

            chunks.push(remaining.substring(0, splitIndex).trim());
            remaining = remaining.substring(splitIndex).trim();
        }

        return chunks.filter(c => c.length > 0);
    }

    /**
     * Text to Speech using Bulbul:v2
     * Automatically chunks text longer than 500 characters.
     */
    async speak(text: string, targetLang: string): Promise<string> {
        try {
            const chunks = this.chunkText(text, 500);
            const audioBase64Chunks: string[] = [];

            for (const chunk of chunks) {
                const response = await fetch(`${this.baseUrl}/text-to-speech`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'api-subscription-key': this.apiKey,
                    },
                    body: JSON.stringify({
                        inputs: [chunk],
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
                if (data.audios && data.audios[0]) {
                    audioBase64Chunks.push(data.audios[0]);
                }
            }

            // If only one chunk, return directly
            if (audioBase64Chunks.length <= 1) {
                return audioBase64Chunks[0] || "";
            }

            // Concatenate multiple base64 WAV chunks by merging raw PCM data
            // Each chunk is a base64 WAV; we decode, strip headers, merge PCM, rebuild WAV
            const pcmBuffers: Uint8Array[] = [];
            for (const b64 of audioBase64Chunks) {
                const binary = atob(b64);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) {
                    bytes[i] = binary.charCodeAt(i);
                }
                // WAV header is 44 bytes; PCM data starts after that
                if (bytes.length > 44) {
                    pcmBuffers.push(bytes.slice(44));
                }
            }

            // Merge all PCM data
            const totalPcmLength = pcmBuffers.reduce((sum, buf) => sum + buf.length, 0);
            const mergedPcm = new Uint8Array(totalPcmLength);
            let offset = 0;
            for (const buf of pcmBuffers) {
                mergedPcm.set(buf, offset);
                offset += buf.length;
            }

            // Build new WAV header (16-bit PCM, mono, 8000 Hz)
            const sampleRate = 8000;
            const numChannels = 1;
            const bitsPerSample = 16;
            const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
            const blockAlign = numChannels * (bitsPerSample / 8);
            const wavHeader = new ArrayBuffer(44);
            const view = new DataView(wavHeader);

            // RIFF header
            view.setUint32(0, 0x52494646, false); // "RIFF"
            view.setUint32(4, 36 + totalPcmLength, true);
            view.setUint32(8, 0x57415645, false); // "WAVE"
            // fmt chunk
            view.setUint32(12, 0x666D7420, false); // "fmt "
            view.setUint32(16, 16, true); // chunk size
            view.setUint16(20, 1, true); // PCM format
            view.setUint16(22, numChannels, true);
            view.setUint32(24, sampleRate, true);
            view.setUint32(28, byteRate, true);
            view.setUint16(32, blockAlign, true);
            view.setUint16(34, bitsPerSample, true);
            // data chunk
            view.setUint32(36, 0x64617461, false); // "data"
            view.setUint32(40, totalPcmLength, true);

            // Combine header + PCM data
            const finalWav = new Uint8Array(44 + totalPcmLength);
            finalWav.set(new Uint8Array(wavHeader), 0);
            finalWav.set(mergedPcm, 44);

            // Encode to base64
            let binaryStr = '';
            for (let i = 0; i < finalWav.length; i++) {
                binaryStr += String.fromCharCode(finalWav[i]);
            }
            return btoa(binaryStr);

        } catch (error) {
            console.error("Sarvam TTS Error:", error);
            throw error;
        }
    }
}
