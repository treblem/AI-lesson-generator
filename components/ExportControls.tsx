import React, { useState } from 'react';
import type { LessonPlan } from '../types';
import { IconPrinter, IconCopy, IconCheck } from './Icon';
import { motion } from 'framer-motion';

interface ExportControlsProps {
  lessonPlan: LessonPlan;
  competency: string;
  onShowPrintPreview: () => void;
}

export const ExportControls: React.FC<ExportControlsProps> = ({ lessonPlan, competency, onShowPrintPreview }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const textToCopy = `Learning Competency: ${competency}\n\n` +
      lessonPlan.days.map(day => {
        let dayText = `--- DAY ${day.day} ---\n\n`;

        if (day.soloObjectives && day.soloObjectives.length > 0) {
          dayText += `SOLO Objectives:\n` + day.soloObjectives.map(obj => `- ${obj}`).join('\n') + '\n\n';
        }

        if (day.hotsObjectives && day.hotsObjectives.length > 0) {
          dayText += `HOTS Objectives:\n` + day.hotsObjectives.map(obj => `- ${obj}`).join('\n') + '\n\n';
        }
        
        if (day.objectives && day.objectives.length > 0) {
            dayText += `Learning Objectives:\n` + day.objectives.map(obj => `- ${obj}`).join('\n') + '\n\n';
        }

        dayText += day.sections
          .map(section => `${section.id}. ${section.title}\n${section.content}\n`)
          .join('\n');
          
        return dayText;
      }).join('\n\n');
    
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex items-center space-x-3 no-print">
      <motion.button
        onClick={handleCopy}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex items-center px-4 py-2 text-sm font-semibold text-text-secondary bg-card-dark hover:text-text-primary border border-border-color rounded-lg transition-colors"
        title="Copy raw text to clipboard"
      >
        {copied ? (
          <>
            <IconCheck className="w-4 h-4 mr-2 text-green-500" />
            Copied
          </>
        ) : (
          <>
            <IconCopy className="w-4 h-4 mr-2" />
            Copy Text
          </>
        )}
      </motion.button>
      <motion.button
        onClick={onShowPrintPreview}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex items-center px-4 py-2 text-sm font-semibold bg-gradient-to-r from-[var(--accent-color-start)] to-[var(--accent-color-end)] text-white rounded-lg transition-all"
        title="Open DepEd formatted print preview"
      >
        <IconPrinter className="w-4 h-4 mr-2" />
        Print / PDF
      </motion.button>
    </div>
  );
};