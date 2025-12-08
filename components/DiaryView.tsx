import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Sparkles } from 'lucide-react';
import { generateDiarySummary } from '../services/gemini';
import { startListening } from '../services/speech';

interface DiaryViewProps {
  initialText: string;
  onUpdateText: (text: string) => void;
  contextMemory: string;
}

const DiaryView: React.FC<DiaryViewProps> = ({ initialText, onUpdateText, contextMemory }) => {
  const [input, setInput] = useState(initialText);
  const [summary, setSummary] = useState<string>('');
  const [insight, setInsight] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Debounce ref
  const timeoutRef = useRef<any>(null);

  useEffect(() => {
    // Process text when input changes (debounced)
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    if (input.trim().length > 10) {
        setIsProcessing(true);
        timeoutRef.current = setTimeout(async () => {
            const result = await generateDiarySummary(input, contextMemory);
            setSummary(result.summary);
            setInsight(result.insight);
            setIsProcessing(false);
        }, 1500); // 1.5s debounce
    } else {
        setSummary('');
        setInsight(null);
    }
  }, [input, contextMemory]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    setInput(newVal);
    onUpdateText(newVal);
  };

  const toggleMic = () => {
    if (isListening) {
      setIsListening(false);
      // Logic handled in startListening onEnd
    } else {
      setIsListening(true);
      startListening(
        (text) => {
          const newVal = input + (input ? ' ' : '') + text;
          setInput(newVal);
          onUpdateText(newVal);
        },
        () => setIsListening(false)
      );
    }
  };

  // Convert markdown-ish string to simple HTML (avoiding heavy library)
  const formatMarkdown = (md: string) => {
    if (!md) return <p className="text-stone-400 italic">Start typing to see structured thoughts...</p>;
    
    return md.split('\n').map((line, i) => {
      if (line.startsWith('# ')) return <h1 key={i} className="text-2xl font-bold text-stone-800 mt-4 mb-2">{line.replace('# ', '')}</h1>;
      if (line.startsWith('## ')) return <h2 key={i} className="text-xl font-semibold text-stone-700 mt-3 mb-2">{line.replace('## ', '')}</h2>;
      if (line.startsWith('- ')) return <li key={i} className="ml-4 text-stone-600 mb-1 list-disc">{line.replace('- ', '')}</li>;
      // Bold handling simplified
      const parts = line.split('**');
      return (
        <p key={i} className="mb-2 text-stone-600 leading-relaxed">
          {parts.map((part, idx) => idx % 2 === 1 ? <strong key={idx} className="text-stone-800">{part}</strong> : part)}
        </p>
      );
    });
  };

  return (
    <div className="flex h-full w-full bg-[#faf9f6]">
      {/* Left Panel: Input */}
      <div className="w-1/2 h-full p-8 pt-20 flex flex-col border-r border-stone-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-stone-400 font-medium text-sm uppercase tracking-wider">Raw Input</h2>
          <button 
            onClick={toggleMic}
            className={`p-2 rounded-full transition-colors ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}
          >
            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
        </div>
        <textarea
          value={input}
          onChange={handleInputChange}
          placeholder="What's on your mind?..."
          className="flex-1 w-full bg-transparent resize-none outline-none text-lg text-stone-800 placeholder-stone-300 font-light leading-relaxed"
        />
      </div>

      {/* Right Panel: Structured View */}
      <div className="w-1/2 h-full p-8 pt-20 overflow-y-auto bg-white relative">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-stone-400 font-medium text-sm uppercase tracking-wider">Structured View</h2>
          {isProcessing && <span className="text-xs text-stone-400 animate-pulse">Organizing...</span>}
        </div>
        
        <div className="animate-fade-in space-y-2">
          {formatMarkdown(summary)}
        </div>

        {/* Insight Toast */}
        {insight && (
          <div className="absolute bottom-8 right-8 max-w-sm bg-stone-900 text-stone-50 p-4 rounded-xl shadow-xl animate-fade-in flex items-start gap-3">
             <Sparkles className="text-yellow-400 shrink-0 mt-1" size={18} />
             <div>
               <p className="text-xs font-bold text-stone-400 mb-1">CONNECTION FOUND</p>
               <p className="text-sm leading-snug">{insight}</p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DiaryView;