import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { IconSun, IconMoon, IconContrast } from './Icon';
import type { Theme } from '../types';

export const ThemeSelector: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const themes: { name: Theme; label: string; icon: React.ReactNode }[] = [
    { name: 'light', label: 'Light', icon: <IconSun className="w-5 h-5" /> },
    { name: 'dark', label: 'Dark', icon: <IconMoon className="w-5 h-5" /> },
    { name: 'high-contrast', label: 'High Contrast', icon: <IconContrast className="w-5 h-5" /> },
  ];
  
  const currentTheme = themes.find(t => t.name === theme) || themes[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-text-secondary bg-background-secondary/70 rounded-full hover:bg-accent-secondary transition-colors"
        title="Change theme"
      >
        {currentTheme.icon}
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 spatial-glass rounded-2xl z-10 overflow-hidden animate-scaleIn">
          <ul className="p-2">
            {themes.map(({ name, label, icon }) => (
              <li key={name}>
                <button
                  onClick={() => handleThemeChange(name)}
                  className={`w-full text-left flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                    theme === name 
                    ? 'bg-accent-primary text-accent-text font-semibold' 
                    : 'text-text-secondary hover:bg-accent-secondary'
                  }`}
                >
                  <span className="mr-3">{icon}</span>
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
