// in src/app/api/analyze/route.ts

import mammoth from 'mammoth';
import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

// This is the same retry helper we use elsewhere
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
        const file = formData.get('file') as File | null;
        const prompt = formData.get('prompt') as string | null;

        if (!file || !prompt) {
            return NextResponse.json({ error: 'Missing file or prompt.' }, { status: 400 });
        }

        const fileBuffer = await file.arrayBuffer();
        const nodeBuffer = Buffer.from(fileBuffer); // For use with Node.js libraries
        
        let modelResponseText: string | undefined;

        // --- NEW LOGIC: Check file type and process accordingly ---
        const docxMimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        const xlsxMimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

        if (file.type === docxMimeType || file.type === xlsxMimeType) {
            // --- HANDLE WORD & EXCEL: Extract text and send to a text model ---
            let extractedText = '';

            if (file.type === docxMimeType) {
                const mammothResult = await mammoth.extractRawText({ buffer: nodeBuffer });
                extractedText = mammothResult.value;
            } else if (file.type === xlsxMimeType) {
                const workbook = XLSX.read(nodeBuffer, { type: 'buffer' });
                workbook.SheetNames.forEach(sheetName => {
                    const sheet = workbook.Sheets[sheetName];
                    const csvText = XLSX.utils.sheet_to_csv(sheet);
                    extractedText += `Sheet: ${sheetName}\n${csvText}\n\n`;
                });
            }

            // Combine the user's prompt with the extracted text
            const combinedPrompt = `Based on the following document content, please answer the user's question.\n\n---\nDOCUMENT CONTENT:\n${extractedText}\n---\n\nUSER'S QUESTION: "${prompt}"`;

            const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
            const payload = { contents: [{ parts: [{ text: combinedPrompt }] }] };

            const response = await fetchWithRetry(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'Text analysis failed.');
            }
            const result = await response.json();
            modelResponseText = result.candidates?.[0]?.content?.parts?.[0]?.text;

        } else {
            // --- HANDLE OTHER FILES (Images, PDFs, etc.): Send file directly to a multimodal model ---
            const fileBase64 = nodeBuffer.toString('base64');
            const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
            
            const payload = {
                contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: file.type, data: fileBase64 } }] }],
            };

            const response = await fetchWithRetry(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'File analysis failed.');
            }
            const result = await response.json();
            modelResponseText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        }

        if (!modelResponseText) {
            throw new Error('The model could not analyze the file or the response was empty.');
        }

        return NextResponse.json({ analysis: modelResponseText });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}