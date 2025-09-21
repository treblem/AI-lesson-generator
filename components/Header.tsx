import React from 'react';
import { IconInfo, IconQuestion } from './Icon';

interface HeaderProps {
  onShowInstructions: () => void;
  onShowAbout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onShowInstructions, onShowAbout }) => {
  return (
    <header className="relative z-20 container mx-auto p-4 sm:p-6 md:p-8 flex justify-between items-center">
      <div>
        <h1 className="text-2xl font-bold text-white">
          AI Lesson Plan Generator
        </h1>
        <p className="text-sm text-gray-400">by iamtr3b</p>
      </div>
      <div className="flex items-center space-x-4">
        <button onClick={onShowInstructions} className="text-sm text-gray-300 hover:text-blue-500 transition-colors flex items-center gap-2">
          <IconQuestion className="w-5 h-5" />
          <span className="hidden sm:inline">Instructions</span>
        </button>
        <button onClick={onShowAbout} className="text-sm text-gray-300 hover:text-blue-500 transition-colors flex items-center gap-2">
          <IconInfo className="w-5 h-5" />
          <span className="hidden sm:inline">About</span>
        </button>
      </div>
    </header>
  );
};
