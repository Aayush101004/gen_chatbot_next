import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const topic = searchParams.get('topic');
        const apiKey = process.env.GNEWS_API_KEY;

        let API_URL = `https://gnews.io/api/v4/top-headlines?lang=en&country=in&token=${apiKey}`;
        if (topic) {
            API_URL += `&topic=${topic}`;
        }

        if (!apiKey) {
            return NextResponse.json({ error: 'GNews API key not configured.' }, { status: 500 });
        }

        const response = await fetch(API_URL);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.errors[0] || 'Could not fetch news.');
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
