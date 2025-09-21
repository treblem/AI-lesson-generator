import React from 'react';
import { IconSparkles, IconUpload, IconFile, IconTrash } from './Icon';
import type { PrintInfo } from '../types';

interface CompetencyInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: () => void;
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
}

const StepCard: React.FC<{ title: string; description: string; step: number; children: React.ReactNode; }> = ({ title, description, step, children }) => (
  <div className="bg-background-content/50 rounded-2xl p-6 transition-all duration-300">
    <div className="flex items-center mb-4">
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-accent-primary text-accent-text font-bold text-sm mr-4">{step}</div>
      <div>
        <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
        <p className="text-sm text-text-muted">{description}</p>
      </div>
    </div>
    {children}
  </div>
);


export const CompetencyInput: React.FC<CompetencyInputProps> = ({ 
  value, onChange, onSubmit, isLoading, 
  numberOfDays, onDaysChange, language, onLanguageChange,
  printInfo, onPrintInfoChange,
  onFileChange, onRemoveFile, pdfFileName, isParsingPdf,
  integrateObjectives, onIntegrateObjectivesChange
}) => {

  const handleInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onPrintInfoChange({
      ...printInfo,
      [e.target.name]: e.target.value
    });
  };

  const isGenerateDisabled = isLoading || isParsingPdf || (!value.trim() && !pdfFileName);

  return (
    <div className="no-print space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StepCard step={1} title="Provide Reference" description="Upload a PDF to ground the lesson plan.">
            {pdfFileName ? (
                <div className="flex items-center justify-between p-3 bg-background-secondary rounded-xl">
                    <div className="flex items-center min-w-0">
                        <IconFile className="w-5 h-5 text-text-muted flex-shrink-0" />
                        <span className="ml-3 text-sm font-medium text-text-secondary truncate" title={pdfFileName}>{pdfFileName}</span>
                    </div>
                    {isParsingPdf ? (
                        <svg className="animate-spin h-5 w-5 text-accent-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        <button onClick={onRemoveFile} className="p-1.5 text-text-muted hover:text-danger-text rounded-full hover:bg-danger-background focus:outline-none focus:ring-2 focus:ring-danger-border transition-colors" title="Remove file">
                            <IconTrash className="w-5 h-5" />
                        </button>
                    )}
                </div>
            ) : (
                <label className="flex flex-col items-center justify-center w-full p-4 text-sm font-medium text-text-secondary bg-background-secondary/50 border-2 border-dashed border-border-primary rounded-xl cursor-pointer hover:bg-accent-secondary hover:border-accent-primary transition-colors">
                    <IconUpload className="w-6 h-6 mb-2 text-accent-primary" />
                    <span>Click to upload or drag & drop</span>
                    <span className="text-xs text-text-muted">PDF File (Max 10MB)</span>
                    <input id="pdf-upload" type="file" accept=".pdf" className="hidden" onChange={onFileChange} disabled={isLoading} />
                </label>
            )}
        </StepCard>
        
        <StepCard step={2} title="Enter Learning Competency" description={pdfFileName ? "Optional if PDF is provided" : "Paste your MELC here"}>
            <textarea
              id="competency-input"
              value={value}
              onChange={onChange}
              placeholder={pdfFileName ? "Leave blank to auto-detect from PDF..." : "e.g., Natatalakay ang konsepto..."}
              className="w-full h-full p-3 bg-background-secondary text-text-primary border border-transparent rounded-xl focus:ring-2 focus:ring-accent-focus focus:bg-background-content transition duration-200 resize-none disabled:bg-background-secondary/50"
              disabled={isLoading || isParsingPdf}
            />
        </StepCard>
      </div>

      <StepCard step={3} title="Set Details & Options" description="Customize the lesson plan header and output.">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
            {Object.entries({school: 'School', teacher: 'Teacher', gradeLevel: 'Grade', learningArea: 'Area', quarter: 'Quarter'}).map(([key, label]) => (
                <input key={key} type="text" name={key} placeholder={label} value={printInfo[key as keyof PrintInfo]} onChange={handleInfoChange} className="form-input w-full p-2 bg-background-secondary text-text-primary border-transparent rounded-lg text-sm focus:ring-accent-focus focus:bg-background-content" />
            ))}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Duration</label>
            <div className="flex items-center bg-background-secondary p-1 rounded-full">
              {[1, 2, 3, 4, 5].map(day => (
                <button
                  key={day}
                  type="button"
                  onClick={() => onDaysChange(day)}
                  disabled={isLoading}
                  className={`w-full py-1.5 text-sm rounded-full font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-accent-focus focus:ring-offset-2 focus:ring-offset-background-content/50 ${
                    numberOfDays === day
                      ? 'bg-accent-primary text-accent-text shadow'
                      : 'text-text-secondary hover:bg-background-content disabled:opacity-50'
                  }`}
                >
                  {day} Day{day > 1 ? 's' : ''}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Language</label>
            <div className="flex items-center bg-background-secondary p-1 rounded-full">
              {['English', 'Tagalog'].map(lang => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => onLanguageChange(lang)}
                  disabled={isLoading}
                  className={`w-full py-1.5 text-sm rounded-full font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-accent-focus focus:ring-offset-2 focus:ring-offset-background-content/50 ${
                    language === lang
                      ? 'bg-accent-primary text-accent-text shadow'
                      : 'text-text-secondary hover:bg-background-content disabled:opacity-50'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col justify-center">
            <label className="block text-sm font-medium text-text-secondary mb-2">Frameworks</label>
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => onIntegrateObjectivesChange(!integrateObjectives)}
                className={`${
                  integrateObjectives ? 'bg-accent-primary' : 'bg-background-secondary'
                } relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent-focus focus:ring-offset-2 focus:ring-offset-background-primary`}
                role="switch"
                aria-checked={integrateObjectives}
                disabled={isLoading}
              >
                <span
                  aria-hidden="true"
                  className={`${
                    integrateObjectives ? 'translate-x-5' : 'translate-x-0'
                  } pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                />
              </button>
              <span className="ml-3 text-sm text-text-secondary">
                SOLO & HOTS
              </span>
            </div>
          </div>
        </div>
      </StepCard>

      <div className="text-center pt-4">
         <button
          onClick={onSubmit}
          disabled={isGenerateDisabled}
          className="w-full md:w-auto inline-flex items-center justify-center px-8 py-3 bg-accent-primary text-accent-text text-base font-semibold rounded-full shadow-lg hover:bg-accent-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background-primary focus:ring-accent-focus disabled:bg-accent-primary-disabled disabled:text-text-muted disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:hover:scale-100"
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
        </button>
      </div>
    </div>
  );
};
