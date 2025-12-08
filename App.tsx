import React, { useState } from 'react';
import ModeToggle from './components/ModeToggle';
import DiaryView from './components/DiaryView';
import TutorView from './components/TutorView';
import { AppMode } from './types';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>('diary');
  
  // State shared between modes (Context Memory)
  const [diaryText, setDiaryText] = useState('');
  
  // When switching from Diary to Tutor, the raw text becomes the "Context Memory".
  // When switching back, the diary preserves its state.
  
  return (
    <div className="w-full h-screen overflow-hidden bg-stone-50 font-sans text-stone-900">
      <ModeToggle mode={mode} setMode={setMode} />
      
      <main className="w-full h-full pt-0">
        {mode === 'diary' ? (
          <DiaryView 
            initialText={diaryText} 
            onUpdateText={setDiaryText}
            contextMemory={diaryText} // It reinforces its own context
          />
        ) : (
          <TutorView 
            contextMemory={diaryText}
          />
        )}
      </main>
    </div>
  );
};

export default App;