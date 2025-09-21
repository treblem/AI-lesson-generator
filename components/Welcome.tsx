import React from 'react';
import { IconBook } from './Icon';

export const Welcome: React.FC = () => {
    return (
        <div className="text-center spatial-glass rounded-3xl p-8 md:p-16 animate-fadeIn">
            <div className="w-16 h-16 bg-accent-secondary rounded-2xl flex items-center justify-center mx-auto mb-6">
                <IconBook className="w-9 h-9 text-accent-primary" />
            </div>
            <h2 className="text-3xl font-bold text-text-primary mb-4">AI Lesson Plan Generator</h2>
            <p className="max-w-2xl mx-auto text-text-secondary">
                This tool is designed to assist DepEd teachers by automating the creation of structured lesson plans.
                Simply enter a <strong>MELC</strong> or upload a reference PDF to get started.
            </p>
        </div>
    );
};
