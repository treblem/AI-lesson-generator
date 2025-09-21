import React from 'react';
import { IconBook } from './Icon';
import { VerticalCutReveal } from './ui/vertical-cut-reveal';
import { TimelineContent } from './ui/timeline-animation';

export const Welcome: React.FC = () => {
    return (
        <TimelineContent>
            <div className="text-center bg-neutral-950/50 border border-neutral-800 rounded-xl p-8 md:p-16">
                <div className="w-16 h-16 bg-blue-900/50 border border-blue-500/30 rounded-lg flex items-center justify-center mx-auto mb-6">
                    <IconBook className="w-9 h-9 text-blue-400" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-4">
                     Your Lesson Plan Awaits
                </h2>
                <p className="max-w-2xl mx-auto text-gray-400">
                    The generated lesson plan will appear here once you provide a competency or PDF and click the generate button.
                </p>
            </div>
        </TimelineContent>
    );
};
