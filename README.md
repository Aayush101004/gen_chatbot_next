Gem AI: A Full-Stack Next.js Chatbot
This is a modern, secure, and full-stack chatbot application built with Next.js and TypeScript. It features a sophisticated backend that keeps all API keys safe on the server, while the frontend provides a clean, responsive user interface.

The application is a multi-talented assistant, capable of engaging in intelligent conversation, fetching real-time news, and transcribing voice input, all through a single, intuitive interface.

Features
Secure Server-Side Architecture: All API keys are stored and used exclusively on the backend, ensuring they are never exposed to the user's browser.

Conversational AI: Engages in natural, multi-turn conversations powered by the Google Gemini 1.5 Flash model.

Real-time News: Fetches the latest news headlines from India on various topics (e.g., "sports news," "technology") using the GNews API.

Voice-to-Text Transcription: Includes a microphone button to record the user's voice, which is securely transcribed on the backend by the Gemini API.

Intelligent Intent Detection: Automatically determines whether a user's query is a request for news or a conversational prompt.

Markdown Rendering: Beautifully formats the AI's responses, with full support for bold text and multi-level nested lists.

Responsive Design: Built with Tailwind CSS, the UI is fully responsive and works seamlessly on both desktop and mobile devices.

Getting Started
Follow these instructions to get a copy of the project up and running on your local machine.

Prerequisites
Node.js (version 18.x or later)

A code editor like Visual Studio Code

Setup Instructions
Clone the repository (or download the project files).

Navigate into the project directory in your terminal:

cd gen-chatbot-nextjs

Install the necessary dependencies:

npm install

Create an Environment File:

In the root of your project folder, create a new file named .env.local.

Add Your API Keys to the .env.local file:

Google Gemini API Key: Get a free key from Google AI Studio.

GNews API Key: Get a free key from GNews.io.

Open your .env.local file and add the following, replacing the placeholders with your actual keys:

GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
GNEWS_API_KEY=YOUR_GNEWS_API_KEY_HERE

How to Run the Application
Once setup is complete, start the development server with the following command:

npm run dev

This will open the chatbot application in your default web browser, typically at http://localhost:3000.

Project Structure
public/: Contains static assets like the diamond.png bot avatar.

src/app/: The core of the Next.js application.

api/: Contains all server-side backend logic.

gemini/route.ts: Secure endpoint for conversational AI.

news/route.ts: Secure endpoint for fetching news.

transcribe/route.ts: Secure endpoint for voice transcription.

components/: Reusable frontend UI components.

page.tsx: The main frontend component for the chat interface.

.env.local: Stores your secret API keys. This file is ignored by Git.

Technologies Used
Next.js: A React framework for building full-stack web applications.

TypeScript: A statically typed superset of JavaScript.

Tailwind CSS: A utility-first CSS framework for rapid UI development.

Google Gemini API: For conversational AI and voice transcription.

GNews API: For fetching real-time news headlines.