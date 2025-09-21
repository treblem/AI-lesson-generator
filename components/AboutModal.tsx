import React from 'react';
import { IconClose } from './Icon';

interface AboutModalProps {
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ onClose }) => {
  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-center items-center p-4 no-print animate-fadeIn"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div 
        className="spatial-glass text-text-primary rounded-3xl w-full max-w-md animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4">
          <h2 className="text-xl font-semibold text-text-primary ml-2">About</h2>
          <button onClick={onClose} className="p-2 rounded-full text-text-muted hover:bg-accent-secondary transition-colors">
            <IconClose className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 pt-0">
            <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-text-primary">Melbhert A. Boiser</h3>
                <p className="text-md text-accent-primary font-semibold">SST-I (Secondary School Teacher I)</p>
                <p className="text-sm text-text-primary mt-2">by iamtr3b</p>
            </div>
            
            <div className="space-y-4 text-sm">
                <div className="p-4 bg-background-secondary/80 rounded-xl">
                    <h4 className="font-semibold text-text-primary mb-1">🏫 School Information</h4>
                    <p className="text-text-primary">Camambugan National High School</p>
                    <p className="text-text-primary">Ubay, Bohol, Philippines</p>
                </div>
                <div className="p-4 bg-background-secondary/80 rounded-xl">
                    <h4 className="font-semibold text-text-primary mb-1">🎓 Educational Background</h4>
                    <p className="text-text-primary">Silliman University</p>
                    <p className="text-text-primary">Dumaguete City, Negros Oriental, Philippines</p>
                </div>
            </div>
        </div>
         <div className="p-4 border-t border-border-primary/50 text-right">
            <button
                onClick={onClose}
                className="px-6 py-2 bg-accent-primary text-accent-text hover:bg-accent-primary-hover rounded-full font-semibold transition-colors"
            >
                Close
            </button>
        </div>
      </div>
    </div>
  );
};