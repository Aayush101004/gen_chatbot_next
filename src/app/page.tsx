'use client';

import { useEffect, useRef, useState } from 'react';
import BotIcon from './components/BotIcon';
import MarkdownRenderer from './components/MarkdownRenderer';
import MicIcon from './components/MicIcon';
import SendIcon from './components/SendIcon';
import UserIcon from './components/UserIcon';

// --- Type Definitions ---
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export default function Home(): React.ReactElement {
  const [userInput, setUserInput] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // State for voice recording
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    setMessages([{ role: 'assistant', content: 'Hello! I am **Gem**, your secure AI assistant. How can I help you today?' }]);
  }, []);

  const fetchNews = async (topic: string | null): Promise<string> => {
    try {
      const response = await fetch(`/api/news?topic=${topic || ''}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Could not fetch news.");
      }
      const data = await response.json();
      if (data.articles?.length) {
        let newsResponse = `Here are the top ${topic || ''} headlines in India:\n\n`;
        data.articles.slice(0, 5).forEach((article: { title: string; source: { name: string }, url: string }) => {
          newsResponse += `* **${article.title}**\n  Source: [${article.source.name}](${article.url})\n`;
        });
        return newsResponse;
      }
      return `I couldn't find any top headlines for "${topic || 'news'}" at the moment.`;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return `Error fetching news: ${errorMessage}`;
    }
  };

  const getNewsTopic = (query: string): string | null => {
    const topics = ['sports', 'technology', 'business', 'entertainment', 'health', 'science', 'world'];
    const lowerCaseQuery = query.toLowerCase();
    for (const topic of topics) {
      if (lowerCaseQuery.includes(topic)) return topic;
    }
    return null;
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || isLoading) return;

    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: userInput }];
    setMessages(newMessages);
    const currentInput = userInput;
    setUserInput('');
    setIsLoading(true);
    let botResponse = "";

    const newsKeywords = ['news', 'headlines', 'latest', 'current events'];
    const isNewsRequest = newsKeywords.some(keyword => currentInput.toLowerCase().includes(keyword));

    if (isNewsRequest) {
      const topic = getNewsTopic(currentInput);
      botResponse = await fetchNews(topic);
    } else {
      try {
        const history = newMessages.filter(m => m.role !== 'system').slice(-10);
        
        const response = await fetch(`/api/gemini`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ history }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "An unknown API error occurred.");
        }
        const result = await response.json();
        if (!result.candidates?.length || !result.candidates[0].content) {
          throw new Error("The model returned an empty or blocked response.");
        }
        botResponse = result.candidates[0].content.parts[0].text.trim();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        botResponse = `Error: ${errorMessage}`;
      }
    }

    setMessages(prev => [...prev, { role: 'assistant', content: botResponse }]);
    setIsLoading(false);
  };
  
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // **UPDATED CODE**: This function now sends the recorded audio to your backend API route.
  const handleVoiceRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          audioChunksRef.current.push(event.data);
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');
          
          setIsLoading(true);
          try {
            // Call the secure backend transcription route
            const response = await fetch('/api/voice', {
              method: 'POST',
              body: formData,
            });
            if (!response.ok) {
              const err = await response.json();
              throw new Error(err.error || 'Transcription failed.');
            }
            const result = await response.json();
            
            if (result.transcription && result.transcription.trim()) {
                setUserInput(prev => prev + result.transcription);
            } else {
                setMessages(prev => [...prev, { role: 'assistant', content: "I couldn't hear anything. Please try speaking again." }]);
            }

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${errorMessage}` }]);
          } finally {
            setIsLoading(false);
          }
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (error) {
        console.error("Microphone access denied:", error);
        setMessages(prev => [...prev, { role: 'assistant', content: "Microphone access was denied. Please allow microphone access in your browser settings." }]);
      }
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-100 font-sans">
      <header className="bg-white shadow-md p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-indigo-600">Gem AI</h1>
      </header>
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="space-y-6">
          {messages.map((msg, index) => (
            <div key={index} className={`flex items-start gap-4 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'assistant' && <BotIcon />}
              <div className={`max-w-xl p-4 rounded-2xl shadow-sm ${msg.role === 'assistant' ? 'bg-white text-slate-800 rounded-tl-none' : 'bg-indigo-500 text-white rounded-br-none'}`}>
                {msg.role === 'assistant' ? <MarkdownRenderer content={msg.content} /> : <p className="whitespace-pre-wrap">{msg.content}</p>}
              </div>
              {msg.role === 'user' && <UserIcon />}
            </div>
          ))}
          {isLoading && (
            <div className="flex items-start gap-4">
              <BotIcon />
              <div className="max-w-xl p-4 rounded-2xl shadow-sm bg-white text-slate-800 rounded-tl-none">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse delay-75"></div>
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse delay-150"></div>
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </main>
      <footer className="bg-white border-t p-4">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <textarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message or use the microphone..."
            className="flex-1 p-3 border rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={handleVoiceRecording}
            disabled={isLoading}
            className={`p-3 rounded-lg transition-colors duration-200 ${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}
          >
            <MicIcon isRecording={isRecording} />
          </button>
          <button
            onClick={handleSendMessage}
            disabled={isLoading}
            className="p-3 bg-indigo-600 rounded-lg disabled:bg-indigo-300 hover:bg-indigo-700 transition-colors duration-200"
          >
            <SendIcon />
          </button>
        </div>
        <div className="text-center text-sm mt-2">
          <p>Don&apos;t trust Gem blindly. It may generate false results.</p>
        </div>
      </footer>
    </div>
  );
}
