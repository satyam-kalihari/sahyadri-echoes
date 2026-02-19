
import { useState, useRef } from "react";

export function useAudioRecorder() {
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            chunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (error) {
            console.error("Error accessing microphone:", error);
            alert("Could not access microphone. Please check permissions.");
        }
    };

    const stopRecording = (): Promise<Blob | null> => {
        return new Promise((resolve) => {
            if (!mediaRecorderRef.current) {
                resolve(null);
                return;
            }

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: "audio/wav" });
                chunksRef.current = [];
                setIsRecording(false);

                // Stop all tracks to release microphone
                mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());

                resolve(blob);
            };

            mediaRecorderRef.current.stop();
        });
    };

    return {
        isRecording,
        startRecording,
        stopRecording
    };
}
