'use client';

import Image from 'next/image';
import { ChangeEvent, useEffect, useRef, useState } from 'react';
import BotIcon from './components/BotIcon';
import MarkdownRenderer from './components/MarkdownRenderer';
import MicIcon from './components/MicIcon';
import PaperClipIcon from './components/PaperClipIcon';
import SendIcon from './components/SendIcon';
import StopIcon from './components/StopIcon';
import ThemeToggle from './components/ThemeToggle';
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
  const [loadingText, setLoadingText] = useState<string>('Processing');
  const abortControllerRef = useRef<AbortController | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [showSizeErrorModal, setShowSizeErrorModal] = useState<boolean>(false);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    setMessages([{ role: 'assistant', content: 'Hello! I am **PurpleBot**, your AI assistant. How can I help you today?' }]);
  }, []);

  const fetchNews = async (topic: string | null, signal: AbortSignal): Promise<string> => {
    try {
      const response = await fetch(`/api/news?topic=${topic || ''}`, { signal });
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
      if (error instanceof Error && error.name === 'AbortError') {
        return 'Request was aborted.';
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return `Error fetching news: ${errorMessage}`;
    }
  };

  const getNewsTopic = (query: string): string | null => {
    const topics = ['sports', 'technology', 'tech', 'business', 'entertainment', 'health', 'science', 'world'];
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

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const newMessage: ChatMessage = { role: 'user', content: userInput };
    if (file) {
      newMessage.fileInfo = { name: file.name, type: getFriendlyFileType(file.type) };
    }

    const newMessages = [...messages, newMessage];
    setMessages(newMessages);

    if (file) setLoadingText('Analyzing');
    else setLoadingText('Processing');

    setIsLoading(true);

    let botResponse = "";

    try {
      const currentFile = file;
      const currentInput = userInput;

      setUserInput('');
      setFile(null);

      if (currentFile) {
        const formData = new FormData();
        formData.append('file', currentFile);
        formData.append('prompt', currentInput || 'Analyze this file.');

        const response = await fetch('/api/analyze', {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'File analysis failed.');
        botResponse = result.analysis;

      } else {
        const lowerCaseInput = currentInput.toLowerCase();
        const newsKeywords = ['news', 'headlines', 'latest', 'current events'];
        const isNewsRequest = newsKeywords.some(keyword => lowerCaseInput.includes(keyword));

        if (isNewsRequest) {
          const topic = getNewsTopic(currentInput);
          botResponse = await fetchNews(topic, controller.signal);
        } else {
          const history = newMessages.filter(m => m.role !== 'system');
          const response = await fetch(`/api/gemini`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ history }),
            signal: controller.signal,
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

      setMessages(prev => [...prev, { role: 'assistant', content: botResponse }]);

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setMessages(prev => [...prev, { role: 'assistant', content: "Response interrupted." }]);
      } else {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${errorMessage}` }]);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];

      const MAX_FILE_SIZE = 4.5 * 1024 * 1024;

      if (selectedFile.size > MAX_FILE_SIZE) {
        setShowSizeErrorModal(true);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      setFile(selectedFile);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
            const response = await fetch('/api/voice', { method: 'POST', body: formData });
            if (!response.ok) {
              const err = await response.json();
              throw new Error(err.error || 'Transcription failed.');
            }
            const result = await response.json();
            if (result.transcription && result.transcription.trim()) {
              setUserInput(prev => prev + result.transcription);
            } else {
              setMessages(prev => [...prev, { role: 'assistant', content: "I couldn't hear anything." }]);
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
        console.error("Mic error:", error);
        setMessages(prev => [...prev, { role: 'assistant', content: "Mic access denied." }]);
      }
    }
  };

  return (
    <div className={`flex flex-col h-screen font-sans ${theme === 'dark' ? 'bg-[#000000]' : 'bg-slate-100'}`}>

      {showSizeErrorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`p-6 rounded-lg shadow-xl max-w-sm text-center ${theme === 'dark' ? 'bg-slate-800 text-white' : 'bg-white text-black'}`}>
            <h3 className="text-xl font-bold mb-4">File Too Large</h3>
            <p className="mb-6">Please select a file that is less than 4.5 MB.</p>
            <button
              onClick={() => setShowSizeErrorModal(false)}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${theme === 'dark' ? 'bg-[#9929EA] hover:bg-[#8A25D1] text-white' : 'bg-[#9929EA] hover:bg-[#8A25D1] text-white'}`}
            >
              OK
            </button>
          </div>
        </div>
      )}

      <header className={`p-4 flex justify-between items-center ${theme === 'dark' ? 'bg-[#1A1A1A] shadow-lg shadow-purple-500/10' : 'bg-white shadow-md'}`}>
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="PurpleBot Logo" width={40} height={40} />
          <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-[#CC66DA]' : 'text-[#9929EA]'}`}>PurpleBot</h1>
        </div>
        <ThemeToggle theme={theme} setTheme={setTheme} />
      </header>
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="space-y-6">
          {messages.map((msg, index) => (
            <div key={index} className={`flex items-start gap-4 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'assistant' && <BotIcon />}
              <div className={`max-w-xl p-4 rounded-2xl shadow-sm ${msg.role === 'user'
                  ? 'bg-[#9929EA] text-white rounded-br-none'
                  : theme === 'dark'
                    ? 'bg-[#1A1A1A] text-[#FAEB92] rounded-tl-none'
                    : 'bg-white text-[#000000] rounded-tl-none'
                }`}>
                {msg.fileInfo && (
                  <div className={`mb-2 p-2 border rounded-lg text-sm ${theme === 'dark' ? 'border-purple-800 bg-[#CC66DA] text-[#000000]' : 'border-purple-200 bg-purple-100 text-purple-800'}`}>
                    <p className="font-bold truncate">{msg.fileInfo.name}</p>
                    <p className={`text-xs ${theme === 'dark' ? 'opacity-80' : ''}`}>{msg.fileInfo.type}</p>
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
              <div className={`max-w-xl p-4 rounded-2xl shadow-sm rounded-tl-none ${theme === 'dark' ? 'bg-[#1A1A1A]' : 'bg-white'}`}>
                <div className={`flex items-center space-x-2 font-medium ${theme === 'dark' ? 'text-[#CC66DA]' : 'text-[#9929EA]'}`}>
                  <span>{loadingText}</span>
                  <div className={`w-2 h-2 rounded-full animate-pulse ${theme === 'dark' ? 'bg-[#CC66DA]' : 'bg-[#9929EA]'}`}></div>
                  <div className={`w-2 h-2 rounded-full animate-pulse [animation-delay:0.2s] ${theme === 'dark' ? 'bg-[#CC66DA]' : 'bg-[#9929EA]'}`}></div>
                  <div className={`w-2 h-2 rounded-full animate-pulse [animation-delay:0.4s] ${theme === 'dark' ? 'bg-[#CC66DA]' : 'bg-[#9929EA]'}`}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </main>
      <footer className={`p-4 ${theme === 'dark' ? 'bg-[#1A1A1A] border-t border-slate-800' : 'bg-white border-t'}`}>
        {file && (
          <div className={`max-w-2xl mx-auto mb-2 flex justify-between items-center p-2 rounded-lg text-sm ${theme === 'dark' ? 'bg-[#CC66DA]' : 'bg-[#FAEB92]'}`}>
            <div className="truncate">
              <p className={`font-bold truncate ${theme === 'dark' ? 'text-[#000000]' : 'text-[#000000]'}`}>{file.name}</p>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-800' : 'text-slate-600'}`}>{getFriendlyFileType(file.type)}</p>
            </div>
            <button onClick={handleRemoveFile} className={`p-1 font-bold text-lg ${theme === 'dark' ? 'text-slate-800 hover:text-red-500' : 'text-slate-600 hover:text-red-500'}`} aria-label="Remove file">&times;</button>
          </div>
        )}
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} disabled={isLoading || !!file} className={`p-3 rounded-lg transition-colors duration-200 ${theme === 'dark' ? 'bg-[#9929EA] disabled:bg-[#5c4069] disabled:text-slate-400 hover:bg-[#8A25D1]' : 'bg-[#9929EA] disabled:bg-[#CC66DA] hover:bg-[#8A25D1]'}`}>
            <PaperClipIcon />
          </button>
          <textarea
            key={theme} // This key forces a re-render on theme change
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message or use the microphone..."
            className={`flex-1 p-3 border rounded-lg resize-none focus:ring-2 focus:outline-none ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white focus:ring-[#9929EA] placeholder-slate-400' : 'bg-white border-slate-300 text-black focus:ring-[#9929EA] placeholder-slate-500'}`}
            rows={1}
            disabled={isLoading}
          />
          <button onClick={handleVoiceRecording} disabled={isLoading} className={`p-3 rounded-lg transition-colors duration-200 ${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-[#9929EA] hover:bg-[#8A25D1]'}`}>
            <MicIcon isRecording={isRecording} />
          </button>
          {isLoading ? (
            <button onClick={handleStopGeneration} className="p-3 bg-red-500 rounded-lg hover:bg-red-600 transition-colors duration-200" aria-label="Stop generation">
              <StopIcon />
            </button>
          ) : (
            <button onClick={handleSendMessage} disabled={!userInput.trim() && !file} className={`p-3 rounded-lg transition-colors duration-200 ${theme === 'dark' ? 'bg-[#9929EA] disabled:bg-[#5c4069] disabled:text-slate-400 hover:bg-[#8A25D1]' : 'bg-[#9929EA] disabled:bg-[#CC66DA] hover:bg-[#8A25D1]'}`}>
              <SendIcon />
            </button>
          )}
        </div>
        <div className={`text-center text-xs mt-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
          <p>Don&apos;t trust Gem blindly. It may generate false results.</p>
        </div>
      </footer>
    </div>
  );
}
