import React from 'react';
import { IconClose } from './Icon';
import { Card, CardContent, CardHeader } from './ui/card';

interface AboutModalProps {
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ onClose }) => {
  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center p-4 no-print"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <Card 
        className="w-full max-w-md text-white border-neutral-800 bg-neutral-950"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="flex flex-row items-center justify-between">
            <h2 className="text-xl font-semibold text-white">About</h2>
            <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-neutral-800 transition-colors">
                <IconClose className="w-5 h-5" />
            </button>
        </CardHeader>
        <CardContent>
            <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-white">Melbhert A. Boiser</h3>
                <p className="text-md text-blue-400 font-semibold">SST-I (Secondary School Teacher I)</p>
                <p className="text-sm text-gray-400 mt-2">App by iamtr3b</p>
            </div>
            
            <div className="space-y-4 text-sm">
                <div className="p-4 bg-neutral-900/80 rounded-lg border border-neutral-800">
                    <h4 className="font-semibold text-gray-200 mb-1">🏫 School Information</h4>
                    <p className="text-gray-300">Camambugan National High School</p>
                    <p className="text-gray-300">Ubay, Bohol, Philippines</p>
                </div>
                <div className="p-4 bg-neutral-900/80 rounded-lg border border-neutral-800">
                    <h4 className="font-semibold text-gray-200 mb-1">🎓 Educational Background</h4>
                    <p className="text-gray-300">Silliman University</p>
                    <p className="text-gray-300">Dumaguete City, Negros Oriental, Philippines</p>
                </div>
            </div>
        </CardContent>
         <div className="p-4 border-t border-neutral-800 text-right">
            <button
                onClick={onClose}
                className="px-6 py-2 bg-gradient-to-t from-blue-600 to-blue-500 text-white hover:from-blue-700 hover:to-blue-600 rounded-md font-semibold transition-colors"
            >
                Close
            </button>
        </div>
      </Card>
    </div>
  );
};
