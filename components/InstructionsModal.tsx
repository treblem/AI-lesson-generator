import React from 'react';
import { IconClose } from './Icon';

interface InstructionsModalProps {
  onClose: () => void;
}

export const InstructionsModal: React.FC<InstructionsModalProps> = ({ onClose }) => {
  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-center items-center p-4 no-print animate-fadeIn"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div 
        className="spatial-glass text-text-primary rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 flex-shrink-0">
          <h2 className="text-xl font-semibold text-text-primary ml-2">How to Use This Tool</h2>
          <button onClick={onClose} className="p-2 rounded-full text-text-muted hover:bg-accent-secondary transition-colors">
            <IconClose className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 pt-0 overflow-y-auto">
            <div className="prose max-w-none">
                <h4>Step 1: Provide Your Topic</h4>
                <p>You have two options to set the foundation for your lesson plan:</p>
                <ul>
                    <li><strong>Enter a Competency:</strong> Directly type or paste a Most Essential Learning Competency (MELC) into the primary text box.</li>
                    <li><strong>Upload a PDF:</strong> Use the upload button to provide a reference document, like a textbook chapter. The AI will ground the entire lesson plan in this content. If you upload a PDF, you can leave the competency field blank, and the AI will determine the most relevant one for you.</li>
                </ul>

                <h4>Step 2: Fill in Lesson Details</h4>
                <p>Enter the necessary details like your School Name, Teacher's Name, Grade Level, Learning Area, and Quarter. This information will automatically populate the header of the official DepEd print format.</p>
                
                <h4>Step 3: Customize Your Plan</h4>
                <ul>
                    <li><strong>Plan Duration:</strong> Select how many days the lesson plan should cover, from 1 to 5 days.</li>
                    <li><strong>Output Language:</strong> Choose whether the generated plan should be in English or Tagalog.</li>
                    <li><strong>Integrate Frameworks:</strong> Use the toggle to include or exclude detailed SOLO & HOTS objectives.</li>
                </ul>

                <h4>Step 4: Generate & Refine</h4>
                <p>Click the "Generate Plan" button. Once the lesson plan appears, you can refine it. Simply click on the content of any section (A-J) to edit the text directly in your browser.</p>

                <h4>Step 5: Export Your Plan</h4>
                <p>You have two export options available:</p>
                <ul>
                    <li><strong>Copy Text:</strong> This copies the entire lesson plan as plain text to your clipboard, perfect for pasting into a word processor.</li>
                    <li><strong>Print / PDF:</strong> This opens a print preview formatted according to DepEd Order No. 42, s. 2016. From this screen, you can print directly or use your browser's print function to save the document as a PDF.</li>
                </ul>
            </div>
        </div>
        <div className="p-4 border-t border-border-primary/50 text-right flex-shrink-0">
            <button
                onClick={onClose}
                className="px-6 py-2 bg-accent-primary text-accent-text hover:bg-accent-primary-hover rounded-full font-semibold transition-colors"
            >
                Got it
            </button>
        </div>
      </div>
    </div>
  );
};