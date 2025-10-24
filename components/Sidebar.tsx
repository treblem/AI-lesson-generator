import React from 'react';
import { motion } from 'framer-motion';
import { IconSparkles, IconUpload, IconFile, IconTrash, IconNewPlan } from './Icon';
import type { PrintInfo } from '../types';
import { ThemeSelector } from './ThemeSelector';

interface SidebarProps {
  competency: string;
  onCompetencyChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onGenerate: () => void;
  isLoading: boolean;
  numberOfDays: number;
  onDaysChange: (days: number) => void;
  language: string;
  onLanguageChange: (language: string) => void;
  printInfo: PrintInfo;
  onPrintInfoChange: (info: PrintInfo) => void;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: () => void;
  pdfFileName: string | null;
  isParsingPdf: boolean;
  integrateObjectives: boolean;
  onIntegrateObjectivesChange: (value: boolean) => void;
  onNewPlan: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  competency, onCompetencyChange, onGenerate, isLoading,
  numberOfDays, onDaysChange, language, onLanguageChange,
  printInfo, onPrintInfoChange,
  onFileChange, onRemoveFile, pdfFileName, isParsingPdf,
  integrateObjectives, onIntegrateObjectivesChange,
  onNewPlan
}) => {

  const handleInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onPrintInfoChange({
      ...printInfo,
      [e.target.name]: e.target.value
    });
  };

  const isGenerateDisabled = isLoading || isParsingPdf || (!competency.trim() && !pdfFileName);

  return (
    <aside className="fixed top-0 left-0 h-screen w-96 bg-sidebar flex flex-col no-print border-r border-border-color">
      {/* Header */}
      <div className="p-6 flex justify-between items-center border-b border-border-color">
        <div>
            <h1 className="text-xl font-bold text-gradient">
            AI Lesson Plan Generator
            </h1>
            <p className="text-sm text-text-secondary">by iamtr3b</p>
        </div>
        <motion.button 
            onClick={onNewPlan}
            whileHover={{ scale: 1.05 }} 
            whileTap={{ scale: 0.95 }} 
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-card-dark text-text-secondary hover:text-text-primary transition-colors"
            title="Start a new lesson plan"
        >
            <IconNewPlan className="w-4 h-4" />
            New Plan
        </motion.button>
      </div>

      {/* Main Content (Scrollable) */}
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* Step 1: Content */}
        <div>
            <h3 className="text-lg font-semibold">Step 1: Provide Content</h3>
            <p className="text-sm text-text-secondary mb-4">Upload a PDF or enter a competency below.</p>
            {pdfFileName ? (
                <div className="flex items-center justify-between p-3 bg-[var(--bg-subtle)] rounded-lg border border-border-color">
                    <div className="flex items-center min-w-0">
                        <IconFile className="w-5 h-5 text-text-secondary flex-shrink-0" />
                        <span className="ml-3 text-sm font-medium text-text-primary truncate" title={pdfFileName}>{pdfFileName}</span>
                    </div>
                    {isParsingPdf ? (
                        <svg className="animate-spin h-5 w-5 text-[var(--accent-color-start)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onRemoveFile} className="p-1.5 text-text-secondary hover:text-red-500 rounded-full focus:outline-none transition-colors" title="Remove file">
                          <IconTrash className="w-5 h-5" />
                      </motion.button>
                    )}
                </div>
            ) : (
                <label className="flex flex-col items-center justify-center w-full p-4 text-sm font-medium text-text-secondary bg-[var(--bg-subtle)] border-2 border-dashed border-border-color rounded-lg cursor-pointer hover:border-[var(--accent-color-start)] transition-colors">
                    <IconUpload className="w-6 h-6 mb-2 text-[var(--accent-color-start)]" />
                    <span>Click to upload PDF</span>
                    <input id="pdf-upload" type="file" accept=".pdf" className="hidden" onChange={onFileChange} disabled={isLoading} />
                </label>
            )}
            <textarea
              id="competency-input"
              value={competency}
              onChange={onCompetencyChange}
              rows={4}
              placeholder={pdfFileName ? "Optional: Leave blank to auto-detect from PDF..." : "e.g., Natatalakay ang konsepto..."}
              className="w-full mt-4 p-3 form-input-style resize-none disabled:opacity-50"
              disabled={isLoading || isParsingPdf}
            />
        </div>
        
        {/* Step 2: Customize */}
        <div>
            <h3 className="text-lg font-semibold">Step 2: Customize Plan</h3>
            <p className="text-sm text-text-secondary mb-4">Set the details for the lesson plan header.</p>
             <div className="grid grid-cols-2 gap-3">
                {Object.entries({school: 'School', teacher: 'Teacher', gradeLevel: 'Grade', learningArea: 'Area', quarter: 'Quarter'}).map(([key, label]) => (
                    <input key={key} type="text" name={key} placeholder={label} value={printInfo[key as keyof PrintInfo]} onChange={handleInfoChange} className="form-input w-full p-2 form-input-style text-sm" />
                ))}
            </div>
        </div>

        {/* Step 3: Settings */}
        <div>
            <h3 className="text-lg font-semibold">Step 3: Generation Settings</h3>
            <p className="text-sm text-text-secondary mb-4">Adjust the output settings for the AI.</p>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">Duration</label>
                    <div className="relative flex w-full items-center p-1 rounded-full border border-border-color" style={{backgroundColor: 'var(--segmented-bg)'}}>
                        {[1, 2, 3, 4, 5].map(day => (
                            <button key={day} onClick={() => onDaysChange(day)} disabled={isLoading} className={`relative w-full z-10 py-1.5 text-sm rounded-full font-semibold transition-colors duration-300 ${numberOfDays === day ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}>
                                {day} Day{day > 1 ? 's' : ''}
                            </button>
                        ))}
                        <motion.div
                          className="absolute h-[calc(100%-0.5rem)] rounded-full"
                          layoutId="duration-pill"
                          transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                          style={{
                            width: `calc(${100 / 5}% - 0.2rem)`,
                            left: `calc(${(numberOfDays - 1) * (100 / 5)}% + 0.1rem)`,
                            background: 'var(--segmented-pill-bg)',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                          }}
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">Language</label>
                    <div className="relative flex w-full items-center p-1 rounded-full border border-border-color" style={{backgroundColor: 'var(--segmented-bg)'}}>
                        {['English', 'Tagalog'].map((lang) => (
                            <button key={lang} onClick={() => onLanguageChange(lang)} disabled={isLoading} className={`relative w-full z-10 py-1.5 text-sm rounded-full font-semibold transition-colors duration-300 ${language === lang ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}>
                                {lang}
                            </button>
                        ))}
                        <motion.div
                          className="absolute h-[calc(100%-0.5rem)] rounded-full"
                          layoutId="language-pill"
                          transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                           style={{
                            width: `calc(50% - 0.2rem)`,
                            left: language === 'English' ? '0.1rem' : `calc(50% + 0.1rem)`,
                            background: 'var(--segmented-pill-bg)',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                          }}
                        />
                    </div>
                </div>
                <div className="flex items-center justify-between pt-2">
                    <label className="text-sm font-medium text-text-secondary">Frameworks (SOLO & HOTS)</label>
                    <button
                        type="button"
                        onClick={() => onIntegrateObjectivesChange(!integrateObjectives)}
                        className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--bg-sidebar)] focus:ring-[var(--accent-color-start)] ${
                        integrateObjectives ? 'bg-gradient-to-r from-[var(--accent-color-start)] to-[var(--accent-color-end)]' : 'bg-[var(--toggle-bg-off)]'
                        }`}
                        role="switch"
                        aria-checked={integrateObjectives}
                        disabled={isLoading}
                    >
                        <motion.span
                          layout
                          aria-hidden="true"
                          className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                          style={{translateX: integrateObjectives ? '1.25rem' : '0rem'}}
                        />
                    </button>
                </div>
            </div>
        </div>

         {/* Generate Button */}
        <div className="pt-2">
         <motion.button
          onClick={onGenerate}
          disabled={isGenerateDisabled}
          whileHover={{ scale: isGenerateDisabled ? 1 : 1.02, boxShadow: isGenerateDisabled ? 'none' : '0 0 20px rgba(192, 38, 211, 0.3)' }}
          whileTap={{ scale: isGenerateDisabled ? 1 : 0.98 }}
          className="w-full inline-flex items-center justify-center px-8 py-3 bg-gradient-to-r from-[var(--accent-color-start)] to-[var(--accent-color-end)] text-white text-base font-semibold rounded-lg shadow-lg shadow-fuchsia-500/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--bg-sidebar)] focus:ring-[var(--accent-color-start)] disabled:bg-gradient-to-r disabled:from-[var(--bg-disabled)] disabled:to-[var(--bg-disabled)] disabled:shadow-none disabled:text-[var(--text-disabled)] disabled:cursor-not-allowed transition-all duration-300"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating...
            </>
          ) : (
            <>
              <IconSparkles className="w-5 h-5 mr-2" />
              Generate Plan
            </>
          )}
        </motion.button>
      </div>

      </div>

      {/* Footer */}
      <div className="p-4 flex items-center justify-end border-t border-border-color">
        <ThemeSelector />
      </div>
    </aside>
  );
};