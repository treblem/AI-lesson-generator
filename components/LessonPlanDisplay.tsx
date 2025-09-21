import React from 'react';
import type { LessonPlan } from '../types';
import { IconBrain, IconTarget } from './Icon';
import { Card, CardContent, CardHeader } from './ui/card';

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
        <Card key={day.day} className="border-neutral-800 bg-black/40 backdrop-blur-sm text-white">
          <CardHeader>
            <h2 className="text-2xl font-bold text-white mb-2 pb-3 border-b border-neutral-800">
              Day {day.day}
            </h2>
          </CardHeader>
          <CardContent>
            {(day.soloObjectives && day.soloObjectives.length > 0) ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 print-section">
                <div className="bg-neutral-900/50 backdrop-blur-sm rounded-lg p-5 border border-blue-500/20">
                  <h4 className="flex items-center text-md font-semibold text-blue-400 mb-3">
                    <IconTarget className="w-5 h-5 mr-2" />
                    SOLO Taxonomy Objectives
                  </h4>
                  <ul className="space-y-1.5 list-disc list-inside text-sm text-gray-300">
                    {day.soloObjectives.map((obj, index) => (
                      <li key={`day-${day.day}-solo-${index}`}>{obj}</li>
                    ))}
                  </ul>
                </div>
                <div className="bg-neutral-900/50 backdrop-blur-sm rounded-lg p-5 border border-purple-500/20">
                  <h4 className="flex items-center text-md font-semibold text-purple-400 mb-3">
                    <IconBrain className="w-5 h-5 mr-2" />
                    HOTS-Based Objectives
                  </h4>
                  <ul className="space-y-1.5 list-disc list-inside text-sm text-gray-300">
                    {day.hotsObjectives?.map((obj, index) => (
                      <li key={`day-${day.day}-hots-${index}`}>{obj}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (day.objectives && day.objectives.length > 0) && (
              <div className="mb-8 print-section">
                <div className="bg-neutral-900/50 backdrop-blur-sm rounded-lg p-5 border border-neutral-800">
                  <h4 className="flex items-center text-md font-semibold text-gray-300 mb-3">
                    <IconTarget className="w-5 h-5 mr-2" />
                    Learning Objectives
                  </h4>
                  <ul className="space-y-1.5 list-disc list-inside text-sm text-gray-400">
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
                  <h3 className="text-lg font-semibold text-gray-100 mb-2">
                    {section.id}. {section.title}
                  </h3>
                  <div
                    contentEditable
                    onInput={(e) => handleInput(e, dayIndex, section.id)}
                    suppressContentEditableWarning={true}
                    className="max-w-none p-3 bg-neutral-900/50 text-gray-300 rounded-md hover:bg-neutral-800/80 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-neutral-800/80 print-p transition-all"
                    style={{ whiteSpace: 'pre-wrap' }}
                  >
                    {section.content}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};