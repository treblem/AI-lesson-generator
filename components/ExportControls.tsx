import React, { useState } from 'react';
import type { LessonPlan } from '../types';
import { IconPrinter, IconCopy, IconCheck } from './Icon';

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
    <div className="flex items-center space-x-2 no-print">
      <button
        onClick={handleCopy}
        className="flex items-center px-4 py-2 text-sm font-semibold text-text-secondary bg-background-secondary/70 hover:bg-background-content rounded-full transition-all duration-200"
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
      </button>
      <button
        onClick={onShowPrintPreview}
        className="flex items-center px-4 py-2 text-sm font-semibold bg-accent-primary text-accent-text hover:bg-accent-primary-hover rounded-full transition-all duration-200"
        title="Open DepEd formatted print preview"
      >
        <IconPrinter className="w-4 h-4 mr-2" />
        Print / PDF
      </button>
    </div>
  );
};
