import React, { useState, useEffect, useRef } from 'react';
import { Send, Volume2, Mic, MicOff } from 'lucide-react';
import { generateTutorResponse } from '../services/gemini';
import { speak, startListening } from '../services/speech';
import { TutorResponse, ChatMessage } from '../types';

interface TutorViewProps {
  contextMemory: string;
}

const TutorView: React.FC<TutorViewProps> = ({ contextMemory }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentSVG, setCurrentSVG] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initial greeting based on context
  useEffect(() => {
    if (!hasInitialized.current && contextMemory) {
      hasInitialized.current = true;
      handleSendMessage(`I was just thinking about this: "${contextMemory}". Can you explain this concept to me?`, true);
    } else if (!hasInitialized.current) {
        // Generic start if no context
         setCurrentSVG(`<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
            <rect x="200" y="200" width="400" height="200" rx="20" fill="#e0f2fe" stroke="#0ea5e9" stroke-width="4"/>
            <text x="400" y="300" text-anchor="middle" font-family="sans-serif" font-size="24" fill="#0369a1">Ask me anything to start learning!</text>
            <circle cx="400" cy="150" r="40" fill="#f0f9ff" stroke="#0ea5e9" stroke-width="2"/>
            <line x1="400" y1="190" x2="400" y2="200" stroke="#0ea5e9" stroke-width="2"/>
         </svg>`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextMemory]);

  const handleSendMessage = async (text: string, isInitial = false) => {
    if ((!text.trim() && !isInitial) || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', text };
    if (!isInitial) {
        setMessages(prev => [...prev, userMsg]);
    }
    
    setInput('');
    setIsLoading(true);

    try {
      // Build history for API
      const history = messages.map(m => ({ role: m.role, text: m.text }));
      
      const response: TutorResponse = await generateTutorResponse(text, history, contextMemory);
      
      setCurrentSVG(response.svg_content);
      
      const modelMsg: ChatMessage = {
        role: 'model',
        text: response.speech_response + (response.question ? `\n\n${response.question}` : ''),
        svg: response.svg_content
      };

      setMessages(prev => [...prev, modelMsg]);
      
      // Auto-speak the response
      speak(response.speech_response + " " + response.question);

    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMic = () => {
    if (isListening) {
        setIsListening(false);
    } else {
        setIsListening(true);
        startListening(
            (text) => setInput(prev => prev + (prev ? ' ' : '') + text),
            () => setIsListening(false)
        )
    }
  }

  return (
    <div className="flex flex-col h-full w-full bg-white relative">
      {/* Infinite Canvas Area (SVG Display) */}
      <div className="flex-1 w-full bg-stone-50 grid-pattern overflow-hidden relative flex items-center justify-center p-8">
        <div className="w-full h-full max-w-5xl max-h-[80vh] bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden relative">
            {currentSVG ? (
                <div 
                    className="w-full h-full"
                    dangerouslySetInnerHTML={{ __html: currentSVG }} 
                />
            ) : (
                <div className="flex items-center justify-center h-full text-stone-300 font-medium">
                    Visual explanations will appear here
                </div>
            )}
            {/* Overlay for scaffolding label if needed - complex implementation omitted for brevity, relying on SVG internal labels */}
        </div>
      </div>

      {/* Bottom Chat Bar */}
      <div className="h-1/3 bg-white border-t border-stone-200 flex flex-col shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
         {/* Message History */}
         <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${
                        msg.role === 'user' 
                        ? 'bg-stone-100 text-stone-800 rounded-br-none' 
                        : 'bg-blue-50 text-blue-900 rounded-bl-none border border-blue-100'
                    }`}>
                        {msg.text}
                    </div>
                </div>
            ))}
             {isLoading && (
                 <div className="flex justify-start">
                     <div className="bg-white border border-stone-100 px-4 py-2 rounded-full text-xs text-stone-400 animate-pulse">
                         Thinking...
                     </div>
                 </div>
             )}
            <div ref={messagesEndRef} />
         </div>

         {/* Input Area */}
         <div className="p-4 border-t border-stone-100 flex gap-2 items-center bg-white">
            <button 
                onClick={toggleMic}
                className={`p-3 rounded-full transition-colors ${isListening ? 'bg-red-50 text-red-500' : 'text-stone-400 hover:bg-stone-50'}`}
            >
                {isListening ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
            <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(input)}
                placeholder="Answer the tutor..."
                className="flex-1 bg-stone-50 border-transparent focus:bg-white focus:border-stone-200 focus:ring-0 rounded-full px-6 py-3 text-sm transition-all"
            />
            <button 
                onClick={() => handleSendMessage(input)}
                disabled={!input.trim() || isLoading}
                className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-md shadow-blue-200"
            >
                <Send size={18} />
            </button>
         </div>
      </div>
    </div>
  );
};

export default TutorView;