import React from 'react';
import { motion } from 'framer-motion';

const containerVariants = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const dotVariants = {
  initial: { y: 0 },
  animate: {
    y: [0, -20, 0],
    transition: {
      duration: 1.2,
      ease: "easeInOut",
      repeat: Infinity,
    },
  },
};


export const Loader: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center text-center my-16 h-[60vh]">
      <motion.div
        className="flex space-x-2"
        variants={containerVariants}
        initial="initial"
        animate="animate"
      >
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            className="w-4 h-4 rounded-full"
            style={{ background: 'linear-gradient(45deg, var(--accent-color-start), var(--accent-color-end))' }}
            variants={dotVariants}
            transition={{
              duration: 1.2,
              ease: "easeInOut",
              repeat: Infinity,
              delay: i * 0.15,
            }}
          />
        ))}
      </motion.div>
      <h3 className="text-xl font-semibold text-text-primary mt-8">Crafting Your Lesson Plan...</h3>
      <p className="text-text-secondary mt-2 max-w-md">The AI is analyzing the competency and integrating pedagogical strategies. This may take a moment.</p>
    </div>
  );
};