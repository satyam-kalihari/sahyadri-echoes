
import { useState, useRef, useEffect, useCallback } from "react";

interface UseAudioRecorderOptions {
    /** RMS threshold below which audio is considered "silence" (0–1 scale). Default: 0.015 */
    silenceThreshold?: number;
    /** Milliseconds of continuous silence before auto-stopping. Default: 1800 */
    silenceDuration?: number;
    /** Minimum recording time in ms before silence detection kicks in. Default: 800 */
    minRecordingTime?: number;
}

export function useAudioRecorder(options: UseAudioRecorderOptions = {}) {
    const {
        silenceThreshold = 0.015,
        silenceDuration = 1800,
        minRecordingTime = 800,
    } = options;

    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const silenceCheckRef = useRef<number | null>(null); // requestAnimationFrame ID
    const recordingStartTimeRef = useRef<number>(0);
    const onAutoStopRef = useRef<((blob: Blob) => void) | null>(null);
    const isStoppingRef = useRef(false);

    // Cleanup silence detection
    const cleanupSilenceDetection = useCallback(() => {
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
        }
        if (silenceCheckRef.current) {
            cancelAnimationFrame(silenceCheckRef.current);
            silenceCheckRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close().catch(() => { });
            audioContextRef.current = null;
        }
        analyserRef.current = null;
    }, []);

    const stopRecording = useCallback((): Promise<Blob | null> => {
        return new Promise((resolve) => {
            if (isStoppingRef.current) {
                resolve(null);
                return;
            }

            cleanupSilenceDetection();

            if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== "recording") {
                mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
                setIsRecording(false);
                resolve(null);
                return;
            }

            isStoppingRef.current = true;

            mediaRecorderRef.current.onstop = () => {
                const mimeType = mediaRecorderRef.current?.mimeType || "audio/webm";
                const blob = new Blob(chunksRef.current, { type: mimeType });
                chunksRef.current = [];
                setIsRecording(false);
                isStoppingRef.current = false;

                // Stop all tracks to release microphone
                mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());

                resolve(blob);
            };

            mediaRecorderRef.current.stop();
        });
    }, [cleanupSilenceDetection]);

    // Start silence detection loop
    const startSilenceDetection = useCallback(() => {
        const analyser = analyserRef.current;
        if (!analyser) return;

        const dataArray = new Float32Array(analyser.fftSize);
        let isSilent = false;

        const checkSilence = () => {
            if (!analyserRef.current || !mediaRecorderRef.current || mediaRecorderRef.current.state !== "recording") {
                return;
            }

            analyser.getFloatTimeDomainData(dataArray);

            // Calculate RMS (root mean square) for volume level
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i] * dataArray[i];
            }
            const rms = Math.sqrt(sum / dataArray.length);

            const elapsed = Date.now() - recordingStartTimeRef.current;

            if (rms < silenceThreshold && elapsed > minRecordingTime) {
                // Audio is quiet
                if (!isSilent) {
                    isSilent = true;
                    silenceTimerRef.current = setTimeout(async () => {
                        // Still silent after the duration — auto-stop
                        if (mediaRecorderRef.current?.state === "recording") {
                            console.log("[AudioRecorder] Auto-stopping after silence");
                            const blob = await stopRecording();
                            if (blob && onAutoStopRef.current) {
                                onAutoStopRef.current(blob);
                            }
                        }
                    }, silenceDuration);
                }
            } else {
                // Audio detected — reset silence timer
                isSilent = false;
                if (silenceTimerRef.current) {
                    clearTimeout(silenceTimerRef.current);
                    silenceTimerRef.current = null;
                }
            }

            silenceCheckRef.current = requestAnimationFrame(checkSilence);
        };

        silenceCheckRef.current = requestAnimationFrame(checkSilence);
    }, [silenceThreshold, silenceDuration, minRecordingTime, stopRecording]);

    const startRecording = useCallback(async (onAutoStop?: (blob: Blob) => void) => {
        if (isStoppingRef.current) return;
        if (mediaRecorderRef.current?.state === "recording") return;

        onAutoStopRef.current = onAutoStop || null;
        let stream: MediaStream | null = null;

        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            chunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            // Set up audio analysis for silence detection
            const audioContext = new AudioContext();
            audioContextRef.current = audioContext;
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 2048;
            source.connect(analyser);
            analyserRef.current = analyser;

            mediaRecorderRef.current.start();
            recordingStartTimeRef.current = Date.now();
            setIsRecording(true);

            // Begin monitoring for silence
            startSilenceDetection();

        } catch (error) {
            // Clean up any acquired stream to prevent mic leak
            if (stream) {
                stream.getTracks().forEach(t => t.stop());
            }
            if (audioContextRef.current) {
                audioContextRef.current.close().catch(() => { });
                audioContextRef.current = null;
            }
            analyserRef.current = null;
            mediaRecorderRef.current = null;
            chunksRef.current = [];
            setIsRecording(false);

            console.error("Error accessing microphone:", error);
            throw error;
        }
    }, [startSilenceDetection]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            cleanupSilenceDetection();
            if (mediaRecorderRef.current) {
                mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [cleanupSilenceDetection]);

    return {
        isRecording,
        startRecording,
        stopRecording
    };
}
