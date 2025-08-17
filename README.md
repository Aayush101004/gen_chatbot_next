# Gem AI: A Full-Stack Next.js Chatbot
This is a modern, secure, and full-stack chatbot application built with Next.js and TypeScript. It features a sophisticated backend that keeps all API keys safe on the server, while the frontend provides a clean, responsive, and themeable user interface.
The application is a multi-talented assistant, capable of engaging in intelligent conversation, fetching real-time news, transcribing voice input, and performing analysis on a wide variety of uploaded files.

## Features
* **Secure Server-Side Architecture**: All API keys are stored and used exclusively on the backend, ensuring they are never exposed to the user's browser.
* **Advanced File Analysis**: Upload and ask questions about various file formats, including images, PDFs, Microsoft Word (`.docx`), and Excel (`.xlsx`).
* **Conversational File Context**: The AI "remembers" the content of an uploaded text-based file, allowing for natural follow-up questions.
* **Dual Theme System**: Includes a sleek, high-contrast dark theme and a clean, professional light theme, with a toggle to switch between them.
* **Real-time News**: Fetches the latest news headlines from India on various topics (e.g., "sports news," "technology") using the GNews API.
* **Voice-to-Text Transcription**: Includes a microphone button to record the user's voice, which is securely transcribed on the backend by the Gemini API.
* **Cancellable Responses**: Users can stop the AI's response generation at any time with a dedicated stop button.
* **Dynamic Loading Indicators**: The UI displays contextual loading messages ("Processing..." or "Analyzing...") to keep the user informed.
* **Markdown Rendering**: Beautifully formats the AI's responses, with full support for bold text and multi-level nested lists.
* **Responsive Design**: Built with Tailwind CSS, the UI is fully responsive and works seamlessly on both desktop and mobile devices.
  
## Getting Started
Follow these instructions to get a copy of the project up and running on your local machine.

### Prerequisites
* Node.js (version 18.x or later)
* A code editor like Visual Studio Code
### Setup Instructions
1. **Clone the repository** (or download the project files).
2. **Navigate into the project directory** in your terminal:

   ```
   cd gen-chatbot-nextjs
   ```
3. **Install the necessary dependencies**:

   ```
   npm install
   npm install mammoth xlsx
   ```
4. **Create an Environment File**:
   * In the root of your project folder, create a new file named `.env.local`.
5. **Add Your API Keys** to the `.env.local` file:
   * **Google Gemini API Key**: Get a free key from [Google AI Studio](https://aistudio.google.com/).
   * **GNews API Key**: Get a free key from [GNews.io](https://gnews.io/).
   * Open your `.env.local` file and add the following, replacing the placeholders with your actual keys:

     ```
     GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
     GNEWS_API_KEY=YOUR_GNEWS_API_KEY_HERE
     ```
## How to Run the Application
Once setup is complete, start the development server with either of the following commands:

```
npm run dev
```

```
npx next dev
```
This will open the chatbot application in your default web browser, typically at `http://localhost:3000`.

## Technologies Used
* **Next.js**: A React framework for building full-stack web applications.
* **TypeScript**: A statically typed superset of JavaScript.
* **Tailwind CSS**: A utility-first CSS framework for rapid UI development.
* **Google Gemini API**: For conversational AI, voice transcription, and multimodal analysis.
* **GNews API**: For fetching real-time news headlines.
* **Mammoth & XLSX**: Libraries for extracting text content from `.docx` and `.xlsx` files on the server.
