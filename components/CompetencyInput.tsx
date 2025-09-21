import React from 'react';
import { IconSparkles, IconUpload, IconFile, IconTrash } from './Icon';
import type { PrintInfo } from '../types';
import { Card, CardContent, CardHeader } from './ui/card';
import { TimelineContent } from './ui/timeline-animation';

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

export const CompetencyInput: React.FC<CompetencyInputProps> = ({ 
  value, onChange, onSubmit, isLoading, 
  numberOfDays, onDaysChange, language, onLanguageChange,
  printInfo, onPrintInfoChange,
  onFileChange, onRemoveFile, pdfFileName, isParsingPdf,
  integrateObjectives, onIntegrateObjectivesChange,
}) => {

  const handleInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onPrintInfoChange({
      ...printInfo,
      [e.target.name]: e.target.value
    });
  };

  const isGenerateDisabled = isLoading || isParsingPdf || (!value.trim() && !pdfFileName);

  return (
    <div className="no-print space-y-8 max-w-4xl mx-auto">
      <TimelineContent>
        <Card className="relative text-white border-neutral-800 bg-gradient-to-r from-neutral-900 via-neutral-950 to-neutral-900">
            <CardHeader>
                <h3 className="text-xl font-semibold">Step 1: Provide Content</h3>
                <p className="text-sm text-muted-foreground">Upload a PDF reference or enter a competency below.</p>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {pdfFileName ? (
                <div className="flex items-center justify-between p-3 bg-neutral-800/50 rounded-lg">
                    <div className="flex items-center min-w-0">
                        <IconFile className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        <span className="ml-3 text-sm font-medium text-gray-300 truncate" title={pdfFileName}>{pdfFileName}</span>
                    </div>
                    {isParsingPdf ? (
                        <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        <button onClick={onRemoveFile} className="p-1.5 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-900/50 focus:outline-none transition-colors" title="Remove file">
                            <IconTrash className="w-5 h-5" />
                        </button>
                    )}
                </div>
            ) : (
                <label className="flex flex-col items-center justify-center w-full p-4 text-sm font-medium text-gray-400 bg-neutral-950 border-2 border-dashed border-neutral-800 rounded-lg cursor-pointer hover:bg-neutral-900 hover:border-blue-500 transition-colors">
                    <IconUpload className="w-6 h-6 mb-2 text-blue-500" />
                    <span>Click to upload PDF</span>
                    <input id="pdf-upload" type="file" accept=".pdf" className="hidden" onChange={onFileChange} disabled={isLoading} />
                </label>
            )}
             <textarea
              id="competency-input"
              value={value}
              onChange={onChange}
              rows={4}
              placeholder={pdfFileName ? "Optional: Leave blank to auto-detect from PDF..." : "e.g., Natatalakay ang konsepto..."}
              className="w-full h-full p-3 bg-neutral-950 text-gray-200 border border-neutral-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 resize-none disabled:bg-neutral-900/50"
              disabled={isLoading || isParsingPdf}
            />
            </CardContent>
        </Card>
      </TimelineContent>

       <TimelineContent>
        <Card className="relative text-white border-neutral-800 bg-gradient-to-r from-neutral-900 via-neutral-950 to-neutral-900">
             <CardHeader>
                <h3 className="text-xl font-semibold">Step 2: Customize Plan</h3>
                <p className="text-sm text-muted-foreground">Set the details for the lesson plan header and generation.</p>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {Object.entries({school: 'School', teacher: 'Teacher', gradeLevel: 'Grade', learningArea: 'Area', quarter: 'Quarter'}).map(([key, label]) => (
                        <input key={key} type="text" name={key} placeholder={label} value={printInfo[key as keyof PrintInfo]} onChange={handleInfoChange} className="form-input w-full p-2 bg-neutral-950 text-gray-200 border-neutral-800 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500" />
                    ))}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-neutral-800/50">
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Duration</label>
                    <div className="flex items-center bg-neutral-950 border border-neutral-800 p-1 rounded-full">
                    {[1, 2, 3, 4, 5].map(day => (
                        <button
                        key={day}
                        type="button"
                        onClick={() => onDaysChange(day)}
                        disabled={isLoading}
                        className={`w-full py-1 text-sm rounded-full font-semibold transition-colors duration-200 ${
                            numberOfDays === day
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-300 hover:bg-neutral-800 disabled:opacity-50'
                        }`}
                        >
                        {day} Day{day > 1 ? 's' : ''}
                        </button>
                    ))}
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Language</label>
                    <div className="flex items-center bg-neutral-950 border border-neutral-800 p-1 rounded-full">
                    {['English', 'Tagalog'].map(lang => (
                        <button
                        key={lang}
                        type="button"
                        onClick={() => onLanguageChange(lang)}
                        disabled={isLoading}
                        className={`w-full py-1 text-sm rounded-full font-semibold transition-colors duration-200 ${
                            language === lang
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-300 hover:bg-neutral-800 disabled:opacity-50'
                        }`}
                        >
                        {lang}
                        </button>
                    ))}
                    </div>
                </div>
                <div className="flex flex-col justify-center">
                    <label className="block text-sm font-medium text-gray-400 mb-2">Frameworks</label>
                    <div className="flex items-center">
                    <button
                        type="button"
                        onClick={() => onIntegrateObjectivesChange(!integrateObjectives)}
                        className={`${
                        integrateObjectives ? 'bg-blue-600' : 'bg-neutral-700'
                        } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500`}
                        role="switch"
                        aria-checked={integrateObjectives}
                        disabled={isLoading}
                    >
                        <span
                        aria-hidden="true"
                        className={`${
                            integrateObjectives ? 'translate-x-5' : 'translate-x-0'
                        } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                        />
                    </button>
                    <span className="ml-3 text-sm text-gray-400">
                        SOLO & HOTS
                    </span>
                    </div>
                </div>
                </div>
            </CardContent>
        </Card>
      </TimelineContent>

      <div className="text-center pt-4">
         <button
          onClick={onSubmit}
          disabled={isGenerateDisabled}
          className="w-full md:w-auto inline-flex items-center justify-center px-8 py-3 bg-gradient-to-t from-blue-600 to-blue-500 text-white text-base font-semibold rounded-full shadow-lg shadow-blue-500/20 hover:from-blue-700 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-blue-500 disabled:bg-neutral-800 disabled:from-neutral-800 disabled:to-neutral-800 disabled:shadow-none disabled:text-gray-500 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:hover:scale-100"
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