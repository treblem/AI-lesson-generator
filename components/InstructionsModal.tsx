import React from 'react';
import { IconClose } from './Icon';
import { Card, CardContent, CardHeader } from './ui/card';

interface InstructionsModalProps {
  onClose: () => void;
}

export const InstructionsModal: React.FC<InstructionsModalProps> = ({ onClose }) => {
  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center p-4 no-print"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <Card 
        className="w-full max-w-2xl text-white border-neutral-800 bg-neutral-950"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="flex flex-row items-center justify-between">
          <h2 className="text-xl font-semibold text-white">How to Use This Tool</h2>
          <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-neutral-800 transition-colors">
            <IconClose className="w-5 h-5" />
          </button>
        </CardHeader>
        <CardContent className="max-h-[70vh] overflow-y-auto">
            <div className="prose prose-invert prose-p:text-gray-300 prose-li:text-gray-300 prose-headings:text-white max-w-none">
                <h4>Step 1: Provide Your Topic</h4>
                <p>You have two options to set the foundation for your lesson plan:</p>
                <ul>
                    <li><strong>Enter a Competency:</strong> Directly type or paste a Most Essential Learning Competency (MELC) into the primary text box.</li>
                    <li><strong>Upload a PDF:</strong> Use the upload button to provide a reference document. The AI will ground the entire lesson plan in this content. If you upload a PDF, you can leave the competency field blank.</li>
                </ul>

                <h4>Step 2: Fill in Lesson Details</h4>
                <p>Enter the necessary details like your School Name, Teacher's Name, etc. This information will automatically populate the header of the official DepEd print format.</p>
                
                <h4>Step 3: Customize Your Plan</h4>
                <ul>
                    <li><strong>Plan Duration:</strong> Select how many days the lesson plan should cover.</li>
                    <li><strong>Output Language:</strong> Choose between English or Tagalog.</li>
                    <li><strong>Integrate Frameworks:</strong> Use the toggle to include or exclude detailed SOLO & HOTS objectives.</li>
                </ul>

                <h4>Step 4: Generate & Refine</h4>
                <p>Click "Generate Plan". Once it appears, you can refine it by clicking on any section's content to edit the text directly.</p>

                <h4>Step 5: Export Your Plan</h4>
                <ul>
                    <li><strong>Copy Text:</strong> Copies the plan as plain text, perfect for pasting into a word processor.</li>
                    <li><strong>Print / PDF:</strong> Opens a print preview formatted according to DepEd Order No. 42, s. 2016.</li>
                </ul>
            </div>
        </CardContent>
         <div className="p-4 border-t border-neutral-800 text-right">
            <button
                onClick={onClose}
                className="px-6 py-2 bg-gradient-to-t from-blue-600 to-blue-500 text-white hover:from-blue-700 hover:to-blue-600 rounded-md font-semibold transition-colors"
            >
                Got it
            </button>
        </div>
      </Card>
    </div>
  );
};
