import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: 'Gemini API key not configured.' }, { status: 500 });
    }

    try {
        const formData = await request.formData();
        const audioFile = formData.get('audio') as File | null;

        if (!audioFile) {
            return NextResponse.json({ error: 'No audio file found.' }, { status: 400 });
        }

        // Convert the audio file to a base64 string
        const audioBuffer = await audioFile.arrayBuffer();
        const audioBase64 = Buffer.from(audioBuffer).toString('base64');
    
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

        const payload = {
            contents: [
                {
                    parts: [
                        { text: "Transcribe this audio:" },
                        {
                            inline_data: {
                                mime_type: audioFile.type,
                                data: audioBase64,
                            },
                        },
                    ],
                },
            ],
        };

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Failed to transcribe audio.');
        }

        const result = await response.json();

        // **FIX**: Check for a valid transcription and provide a specific error if it's missing.
        const transcription = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!transcription) {
            // This helps debug issues with silent audio or safety blocks.
            console.error("Gemini transcription failed. Full response:", JSON.stringify(result, null, 2));
            throw new Error('Could not understand the audio. Please try speaking again clearly.');
        }

        return NextResponse.json({ transcription });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
