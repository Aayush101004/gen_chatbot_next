import { NextRequest, NextResponse } from 'next/server';

// Define the structure of a message in the chat history
interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export async function POST(request: NextRequest) {
    try {
        const { history }: { history: ChatMessage[] } = await request.json();
        const apiKey = process.env.GEMINI_API_KEY;
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

        if (!apiKey) {
            return NextResponse.json({ error: 'Gemini API key not configured.' }, { status: 500 });
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

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'An unknown API error occurred.');
        }

        const result = await response.json();
        return NextResponse.json(result);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
