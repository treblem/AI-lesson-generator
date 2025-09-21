import React from 'react';
import { IconBook, IconQuestion, IconInfo } from './Icon';
import { ThemeSelector } from './ThemeSelector';

interface HeaderProps {
  onShowInstructions: () => void;
  onShowAbout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onShowInstructions, onShowAbout }) => {
  return (
    <header className="no-print p-4 flex justify-center sticky top-0 z-40">
      <div className="spatial-glass rounded-full flex items-center justify-between gap-4 px-3 py-2">
        <div className="flex items-center flex-shrink-0">
          <div className="bg-accent-secondary p-2 rounded-full">
            <IconBook className="w-6 h-6 text-accent-primary" />
          </div>
          <div className="ml-3 hidden sm:block">
            <h1 className="text-md font-semibold text-text-primary leading-tight">
              AI Lesson Plan Generator
            </h1>
            <p className="text-xs text-text-muted leading-tight">by iamtr3b</p>
          </div>
        </div>
        <div className="flex items-center space-x-1.5">
           <button 
              onClick={onShowInstructions} 
              className="p-2 rounded-full text-text-secondary hover:bg-accent-secondary transition-colors"
              title="Show Instructions"
            >
              <IconQuestion className="w-5 h-5" />
           </button>
           <button 
              onClick={onShowAbout} 
               className="p-2 rounded-full text-text-secondary hover:bg-accent-secondary transition-colors"
              title="About this App"
            >
              <IconInfo className="w-5 h-5" />
           </button>
           <ThemeSelector />
        </div>
      </div>
    </header>
  );
};