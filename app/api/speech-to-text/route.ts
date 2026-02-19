import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as Blob;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        const response = await fetch(
            "https://router.huggingface.co/models/openai/whisper-large-v3",
            {
                headers: {
                    Authorization: `Bearer ${process.env.HF_TOKEN}`,
                    "Content-Type": "application/octet-stream",
                },
                method: "POST",
                body: buffer,
            }
        );

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`HF API error: ${response.status} ${error}`);
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error("STT Error:", error);
        return NextResponse.json(
            { error: "Error processing audio" },
            { status: 500 }
        );
    }
}
