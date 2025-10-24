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
    <div className="space-y-8">
      {lessonPlan.days.map((day, dayIndex) => (
        <div key={day.day} className="bg-card-dark rounded-xl text-text-primary overflow-hidden">
          <div className="p-6 border-b border-border-color">
            <h2 className="text-3xl font-bold text-gradient">
              Day {day.day}
            </h2>
          </div>
          <div className="p-6">
            {(day.soloObjectives && day.soloObjectives.length > 0) ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 print-section">
                <div className="bg-sidebar rounded-lg p-5 border border-border-color">
                  <h4 className="flex items-center text-md font-semibold text-[var(--accent-color-start)] mb-3">
                    <IconTarget className="w-5 h-5 mr-2" />
                    SOLO Taxonomy Objectives
                  </h4>
                  <ul className="space-y-1.5 list-disc list-inside text-sm text-text-secondary">
                    {day.soloObjectives.map((obj, index) => (
                      <li key={`day-${day.day}-solo-${index}`}>{obj}</li>
                    ))}
                  </ul>
                </div>
                <div className="bg-sidebar rounded-lg p-5 border border-border-color">
                  <h4 className="flex items-center text-md font-semibold text-[var(--accent-color-end)] mb-3">
                    <IconBrain className="w-5 h-5 mr-2" />
                    HOTS-Based Objectives
                  </h4>
                  <ul className="space-y-1.5 list-disc list-inside text-sm text-text-secondary">
                    {day.hotsObjectives?.map((obj, index) => (
                      <li key={`day-${day.day}-hots-${index}`}>{obj}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (day.objectives && day.objectives.length > 0) && (
              <div className="mb-8 print-section">
                <div className="bg-sidebar rounded-lg p-5 border border-border-color">
                  <h4 className="flex items-center text-md font-semibold text-text-primary mb-3">
                    <IconTarget className="w-5 h-5 mr-2" />
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

            <div className="space-y-6">
              {day.sections.map((section) => (
                <div key={`${day.day}-${section.id}`} className="print-section">
                  <h3 className="text-lg font-semibold text-text-primary mb-2">
                    {section.id}. {section.title}
                  </h3>
                  <div
                    contentEditable
                    onInput={(e) => handleInput(e, dayIndex, section.id)}
                    suppressContentEditableWarning={true}
                    className="max-w-none p-3 form-input-style text-text-secondary print-p transition-all"
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