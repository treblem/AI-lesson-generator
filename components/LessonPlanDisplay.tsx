import React from 'react';
import type { LessonPlan } from '../types';
import { IconBrain, IconTarget } from './Icon';

interface LessonPlanDisplayProps {
  lessonPlan: LessonPlan;
  onUpdate: (dayIndex: number, sectionId: string, newContent: string) => void;
}

export const LessonPlanDisplay: React.FC<LessonPlanDisplayProps> = ({ lessonPlan, onUpdate }) => {
  const handleInput = (e: React.FormEvent<HTMLDivElement>, dayIndex: number, sectionId: string) => {
    onUpdate(dayIndex, sectionId, e.currentTarget.innerText);
  };

  return (
    <div className="space-y-12">
      {lessonPlan.days.map((day, dayIndex) => (
        <div key={day.day}>
          <h2 className="text-3xl font-bold text-text-primary mb-6 pb-3 border-b-2 border-border-primary/50 print-h1">
            Day {day.day}
          </h2>

          {(day.soloObjectives && day.soloObjectives.length > 0) ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 print-section">
              <div className="spatial-glass rounded-2xl p-5 border-info-border/50">
                <h4 className="flex items-center text-md font-semibold text-info-text-header mb-3">
                  <IconTarget className="w-5 h-5 mr-2 text-info-icon" />
                  SOLO Taxonomy Objectives
                </h4>
                <ul className="space-y-1.5 list-disc list-inside text-sm text-info-text-body">
                  {day.soloObjectives.map((obj, index) => (
                    <li key={`day-${day.day}-solo-${index}`}>{obj}</li>
                  ))}
                </ul>
              </div>
              <div className="spatial-glass rounded-2xl p-5 border-special-border/50">
                <h4 className="flex items-center text-md font-semibold text-special-text-header mb-3">
                  <IconBrain className="w-5 h-5 mr-2 text-special-icon" />
                  HOTS-Based Objectives
                </h4>
                <ul className="space-y-1.5 list-disc list-inside text-sm text-special-text-body">
                  {day.hotsObjectives?.map((obj, index) => (
                    <li key={`day-${day.day}-hots-${index}`}>{obj}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (day.objectives && day.objectives.length > 0) && (
             <div className="mb-8 print-section">
              <div className="spatial-glass rounded-2xl p-5">
                <h4 className="flex items-center text-md font-semibold text-text-secondary mb-3">
                  <IconTarget className="w-5 h-5 mr-2 text-text-muted" />
                  Learning Objectives
                </h4>
                <ul className="space-y-1.5 list-disc list-inside text-sm text-text-secondary">
                  {day.objectives.map((obj, index) => (
                    <li key={`day-${day.day}-obj-${index}`}>{obj}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="relative">
            <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-border-primary/50 rounded-full" aria-hidden="true"></div>
            <div className="space-y-6">
              {day.sections.map((section) => (
                <div key={`${day.day}-${section.id}`} className="print-section pl-10 relative">
                  <div className="absolute left-0 top-1.5 flex items-center justify-center w-8 h-8 rounded-full bg-accent-secondary text-accent-primary font-bold text-sm border-4 border-background-content">
                    {section.id}
                  </div>
                  <h3 className="text-lg font-semibold text-text-primary mb-2 print-h2">
                    {section.title}
                  </h3>
                  <div
                    contentEditable
                    onInput={(e) => handleInput(e, dayIndex, section.id)}
                    suppressContentEditableWarning={true}
                    className="prose prose-slate max-w-none p-3 bg-background-secondary/70 rounded-xl hover:bg-background-content focus:outline-none focus:ring-2 focus:ring-accent-focus focus:bg-background-content print-p transition-all"
                    style={{ whiteSpace: 'pre-wrap' }}
                  >
                    {section.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
