import { NextRequest, NextResponse } from 'next/server';

async function fetchWithRetry(url: string, options: RequestInit, retries = 3) {
    for (let attempt = 0; attempt < retries; attempt++) {
        const response = await fetch(url, options);
        if (response.status === 503) {
            const delay = Math.pow(2, attempt) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
        }
        return response;
    }
    throw new Error(`The model is still overloaded after ${retries} attempts.`);
}

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

        const audioBuffer = await audioFile.arrayBuffer();
        const audioBase64 = Buffer.from(audioBuffer).toString('base64');
    
        // Using the flash model as requested
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

        const payload = {
            contents: [
                {
                    parts: [
                        { text: "Transcribe this audio:" },
                        { inline_data: { mime_type: audioFile.type, data: audioBase64 } },
                    ],
                },
            ],
        };

        const fetchOptions: RequestInit = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        };

        const response = await fetchWithRetry(API_URL, fetchOptions);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Failed to transcribe audio.');
        }

        const result = await response.json();
        const transcription = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!transcription) {
            throw new Error('Could not understand the audio. Please try speaking again clearly.');
        }

        return NextResponse.json({ transcription });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}