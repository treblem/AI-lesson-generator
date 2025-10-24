import React from 'react';
import { IconClose } from './Icon';
import { motion } from 'framer-motion';

interface AboutModalProps {
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ onClose }) => {
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
        className="w-full max-w-md bg-card-dark rounded-xl border border-border-color"
        initial={{ scale: 0.95, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 20, opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        onClick={(e) => e.stopPropagation()}
      >
          <div className="p-6 flex flex-row items-center justify-between border-b border-border-color">
              <h2 className="text-xl font-semibold text-text-primary">About</h2>
              <button onClick={onClose} className="p-1.5 rounded-full text-text-secondary hover:bg-[var(--bg-subtle-hover)] transition-colors">
                  <IconClose className="w-5 h-5" />
              </button>
          </div>
          <div className="p-6">
              <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-text-primary">Melbhert A. Boiser</h3>
                  <p className="text-md text-gradient font-semibold">SST-I (Secondary School Teacher I)</p>
                  <p className="text-sm text-text-secondary mt-2">App by iamtr3b</p>
              </div>
              
              <div className="space-y-4 text-sm">
                  <div className="p-4 bg-sidebar rounded-lg border border-border-color">
                      <h4 className="font-semibold text-text-primary mb-1">🏫 School Information</h4>
                      <p className="text-text-secondary">Camambugan National High School</p>
                      <p className="text-text-secondary">Ubay, Bohol, Philippines</p>
                  </div>
                  <div className="p-4 bg-sidebar rounded-lg border border-border-color">
                      <h4 className="font-semibold text-text-primary mb-1">🎓 Educational Background</h4>
                      <p className="text-text-secondary">Silliman University</p>
                      <p className="text-text-secondary">Dumaguete City, Negros Oriental, Philippines</p>
                  </div>
              </div>
          </div>
           <div className="p-4 border-t border-border-color text-right">
              <motion.button
                  onClick={onClose}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-6 py-2 bg-gradient-to-r from-[var(--accent-color-start)] to-[var(--accent-color-end)] text-white rounded-lg font-semibold"
              >
                  Close
              </motion.button>
          </div>
      </motion.div>
    </motion.div>
  );
};