import { NextRequest, NextResponse } from 'next/server';

interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export async function POST(request: NextRequest) {

    try {
        const { history }: { history: ChatMessage[] } = await request.json();

        const apiKey = process.env.GEMINI_API_KEY;
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
        
        if (!apiKey) {
            return NextResponse.json({ error: 'Gemini API key not configured on server.' }, { status: 500 });
        }

        // Format the history for the Gemini API
        const contents = history.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
        }));

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents }),
        });

        const responseText = await response.text(); // Get response as text to avoid JSON parsing errors

        if (!response.ok) {
            // Throw an error with the detailed response from Google
            throw new Error(`Google API Error: ${response.status} ${response.statusText} | ${responseText}`);
        }

        const result = JSON.parse(responseText); // Parse JSON only if response.ok
        return NextResponse.json(result);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected server error occurred.';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}