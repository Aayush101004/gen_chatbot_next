'use client';

import { ChangeEvent, useEffect, useRef, useState } from 'react';
import BotIcon from './components/BotIcon';
import MarkdownRenderer from './components/MarkdownRenderer';
import MicIcon from './components/MicIcon';
import PaperClipIcon from './components/PaperClipIcon';
import SendIcon from './components/SendIcon';
import UserIcon from './components/UserIcon';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  fileInfo?: {
    name: string;
    type: string;
  };
}

export default function Home(): React.ReactElement {
  const [userInput, setUserInput] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isRecording, setIsRecording] = useState<boolean>(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    setMessages([{ role: 'assistant', content: 'Hello! I am **Gem**, your secure AI assistant. I can fetch news, analyze files, and much more. How can I help you today?' }]);
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
  
  const getFriendlyFileType = (mimeType: string): string => {
    if (!mimeType) return 'File';
    if (mimeType.includes('spreadsheetml') || mimeType.includes('ms-excel')) return 'Excel Document';
    if (mimeType.includes('wordprocessingml') || mimeType.includes('msword')) return 'Word Document';
    if (mimeType.includes('pdf')) return 'PDF Document';
    if (mimeType.startsWith('image/')) return 'Image';
    if (mimeType.startsWith('text/')) return 'Text File';
    return 'File';
  };

  const handleSendMessage = async () => {
    if ((!userInput.trim() && !file) || isLoading) return;

    const newMessage: ChatMessage = {
      role: 'user',
      content: userInput,
    };
    if (file) {
      newMessage.fileInfo = { name: file.name, type: getFriendlyFileType(file.type) };
    }

    const newMessages: ChatMessage[] = [...messages, newMessage];
    setMessages(newMessages);

    const currentFile = file;
    const currentInput = userInput;
    
    setFile(null);
    setUserInput('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setIsLoading(true);

    let botResponse = "";

    try {
        if (currentFile) {
            const formData = new FormData();
            formData.append('file', currentFile);
            formData.append('prompt', currentInput || 'Analyze this file.');

            const response = await fetch('/api/analyze', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'File analysis failed.');
            }
            botResponse = result.analysis;

        } else {
            const lowerCaseInput = currentInput.toLowerCase();
            const newsKeywords = ['news', 'headlines', 'latest', 'current events'];
            const isNewsRequest = newsKeywords.some(keyword => lowerCaseInput.includes(keyword));

            if (isNewsRequest) {
                const topic = getNewsTopic(currentInput);
                botResponse = await fetchNews(topic);
            } else {
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
            }
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        botResponse = `Error: ${errorMessage}`;
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

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        setFile(e.target.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
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
                {msg.fileInfo && (
                    <div className="mb-2 p-2 border border-indigo-200 bg-indigo-100 text-indigo-800 rounded-lg text-sm">
                        <p className="font-bold truncate">{msg.fileInfo.name}</p>
                        <p className="text-xs">{msg.fileInfo.type}</p>
                    </div>
                )}
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
                   <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                   <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse [animation-delay:0.4s]"></div>
                 </div>
               </div>
             </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </main>
      <footer className="bg-white border-t p-4">
        {file && (
            <div className="max-w-2xl mx-auto mb-2 flex justify-between items-center p-2 bg-slate-200 rounded-lg text-sm">
                <div className="truncate">
                    <p className="font-bold text-slate-700 truncate">{file.name}</p>
                    <p className="text-xs text-slate-500">{getFriendlyFileType(file.type)}</p>
                </div>
                <button 
                    onClick={handleRemoveFile} 
                    className="p-1 text-slate-600 hover:text-red-500 font-bold text-lg"
                    aria-label="Remove file"
                >
                    &times;
                </button>
            </div>
        )}
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange}
            className="hidden" 
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || !!file}
            className="p-3 bg-indigo-600 rounded-lg disabled:bg-indigo-300 hover:bg-indigo-700 transition-colors duration-200"
            aria-label="Attach file"
          >
            <PaperClipIcon />
          </button>
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
            disabled={isLoading || (!userInput.trim() && !file)}
            className="p-3 bg-indigo-600 rounded-lg disabled:bg-indigo-300 hover:bg-indigo-700 transition-colors duration-200"
          >
            <SendIcon />
          </button>
        </div>
        <div className="text-center text-xs text-slate-500 mt-2">
          <p>Don&apos;t trust Gem blindly. It may generate false results.</p>
        </div>
      </footer>
    </div>
  );
}