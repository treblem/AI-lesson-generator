import React from 'react';
import { IconClose } from './Icon';
import { motion } from 'framer-motion';

interface InstructionsModalProps {
  onClose: () => void;
}

export const InstructionsModal: React.FC<InstructionsModalProps> = ({ onClose }) => {
  return (
    <motion.div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-center items-center p-4 no-print"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="w-full max-w-2xl bg-card-dark rounded-xl border border-border-color"
        initial={{ scale: 0.95, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 20, opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        onClick={(e) => e.stopPropagation()}
      >
          <div className="p-6 flex flex-row items-center justify-between border-b border-border-color">
            <h2 className="text-xl font-semibold text-text-primary">How to Use This Tool</h2>
            <button onClick={onClose} className="p-1.5 rounded-full text-text-secondary hover:bg-[var(--bg-subtle-hover)] transition-colors">
              <IconClose className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6 max-h-[70vh] overflow-y-auto">
              <div className="prose prose-p:text-text-secondary prose-li:text-text-secondary prose-headings:text-text-primary max-w-none">
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
          </div>
           <div className="p-4 border-t border-border-color text-right">
              <motion.button
                  onClick={onClose}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-6 py-2 bg-gradient-to-r from-[var(--accent-color-start)] to-[var(--accent-color-end)] text-white rounded-lg font-semibold"
              >
                  Got it
              </motion.button>
          </div>
      </motion.div>
    </motion.div>
  );
};