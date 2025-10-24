import React from 'react';
import { IconBook } from './Icon';
import { VerticalCutReveal } from './ui/vertical-cut-reveal';
import { motion } from 'framer-motion';

export const Welcome: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center text-center h-[80vh]">
            <motion.div
                className="w-20 h-20 bg-card-dark border border-border-color rounded-2xl flex items-center justify-center mx-auto mb-6"
                animate={{
                    scale: [1, 1.05, 1],
                    rotate: [0, 2, -2, 0],
                }}
                transition={{
                    duration: 5,
                    ease: "easeInOut",
                    repeat: Infinity,
                    repeatType: "mirror",
                }}
            >
                <IconBook className="w-10 h-10 text-[var(--accent-color-end)]" />
            </motion.div>
            <h2 className="text-4xl font-bold text-text-primary mb-4">
                 <VerticalCutReveal>
                    Your Lesson Plan Awaits
                 </VerticalCutReveal>
            </h2>
            <p className="max-w-2xl mx-auto text-text-secondary">
                Use the sidebar to provide a competency or PDF, then click "Generate Plan" to see the magic happen here.
            </p>
        </div>
    );
};