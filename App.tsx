import React, { useState, useCallback } from 'react';
import { LessonPlanDisplay } from './components/LessonPlanDisplay';
import { Loader } from './components/Loader';
import { GeneratedData, PrintInfo } from './types';
import { generateLessonPlan } from './services/geminiService';
import { ExportControls } from './components/ExportControls';
import { Welcome } from './components/Welcome';
import { InstructionsModal } from './components/InstructionsModal';
import { AboutModal } from './components/AboutModal';
import { Sidebar } from './components/Sidebar';
import { motion, AnimatePresence } from 'framer-motion';
import { IconInfo, IconQuestion } from './components/Icon';

declare const pdfjsLib: any;

const App: React.FC = () => {
  const [competency, setCompetency] = useState<string>('');
  const [numberOfDays, setNumberOfDays] = useState<number>(1);
  const [language, setLanguage] = useState<string>('English');
  const [integrateObjectives, setIntegrateObjectives] = useState<boolean>(true);
  const [generatedData, setGeneratedData] = useState<GeneratedData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [pdfText, setPdfText] = useState<string | null>(null);
  const [isParsingPdf, setIsParsingPdf] = useState<boolean>(false);

  const [printInfo, setPrintInfo] = useState<PrintInfo>({
    school: 'Sample National High School',
    teacher: 'Juan Dela Cruz',
    gradeLevel: 'Grade 10',
    learningArea: 'Araling Panlipunan',
    quarter: 'First Quarter',
  });
  
  const [showInstructions, setShowInstructions] = useState<boolean>(false);
  const [showAbout, setShowAbout] = useState<boolean>(false);

  const handleNewPlan = () => {
    setGeneratedData(null);
    setError(null);
    setCompetency('');
    setPdfFileName(null);
    setPdfText(null);
    const fileInput = document.getElementById('pdf-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };


  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setPdfFileName(file.name);
    setIsParsingPdf(true);
    setPdfText(null);
    setError(null);

    try {
        const arrayBuffer = await file.arrayBuffer();
        const typedArray = new Uint8Array(arrayBuffer);
        
        const pdf = await pdfjsLib.getDocument(typedArray).promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(' ');
            fullText += pageText + '\n\n';
        }
        setPdfText(fullText);

    } catch (error) {
        console.error("Error parsing PDF:", error);
        setError("Failed to read the PDF file. Please ensure it's a valid PDF.");
        setPdfFileName(null);
        setPdfText(null);
    } finally {
        setIsParsingPdf(false);
    }
  };

  const handleRemoveFile = () => {
    setPdfFileName(null);
    setPdfText(null);
    const fileInput = document.getElementById('pdf-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleGeneratePlan = useCallback(async () => {
    if (!competency.trim() && !pdfText) {
      setError('Please enter a competency or upload a PDF file.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setGeneratedData(null);
    try {
      const data = await generateLessonPlan(competency, numberOfDays, language, pdfText, integrateObjectives);
      setGeneratedData(data);
      if (data.competency) {
        setCompetency(data.competency);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to generate lesson plan. Please check your API key and try again.');
    } finally {
      setIsLoading(false);
    }
  }, [competency, numberOfDays, language, pdfText, integrateObjectives]);

  const handlePlanUpdate = useCallback((dayIndex: number, sectionId: string, newContent: string) => {
    setGeneratedData(prevData => {
      if (!prevData) return null;

      const updatedDays = prevData.lessonPlan.days.map((day, index) => {
        if (index === dayIndex) {
          const updatedSections = day.sections.map(section =>
            section.id === sectionId ? { ...section, content: newContent } : section
          );
          return { ...day, sections: updatedSections };
        }
        return day;
      });

      return {
        ...prevData,
        lessonPlan: { days: updatedDays },
      };
    });
  }, []);

  const contentVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeInOut' } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.3, ease: 'easeInOut' } },
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <motion.div key="loader" variants={contentVariants} initial="initial" animate="animate" exit="exit">
          <Loader />
        </motion.div>
      );
    }
    if (error) {
       return (
         <motion.div
           key="error"
           variants={contentVariants}
           initial="initial"
           animate="animate"
           exit="exit"
           className="max-w-4xl mx-auto rounded-xl bg-card-dark border border-red-500/50 text-red-300 p-6" 
           role="alert"
         >
           <p className="font-bold text-lg">Error</p>
           <p className="mt-2 text-red-400">{error}</p>
         </motion.div>
       );
    }
    if (generatedData) {
      return (
        <motion.div 
          key="lesson-plan"
          variants={contentVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          id="lesson-plan-content" 
          className="max-w-5xl mx-auto"
        >
          <LessonPlanDisplay
            lessonPlan={generatedData.lessonPlan}
            onUpdate={handlePlanUpdate}
          />
        </motion.div>
      );
    }
    return (
      <motion.div key="welcome" variants={contentVariants} initial="initial" animate="animate" exit="exit">
        <Welcome />
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen flex text-text-primary bg-bg-main">
      <Sidebar
        competency={competency}
        onCompetencyChange={(e) => setCompetency(e.target.value)}
        onGenerate={handleGeneratePlan}
        isLoading={isLoading}
        numberOfDays={numberOfDays}
        onDaysChange={setNumberOfDays}
        language={language}
        onLanguageChange={setLanguage}
        printInfo={printInfo}
        onPrintInfoChange={setPrintInfo}
        onFileChange={handleFileChange}
        onRemoveFile={handleRemoveFile}
        pdfFileName={pdfFileName}
        isParsingPdf={isParsingPdf}
        integrateObjectives={integrateObjectives}
        onIntegrateObjectivesChange={setIntegrateObjectives}
        onNewPlan={handleNewPlan}
      />

      <div className="relative flex-1" style={{ marginLeft: '384px' /* width of sidebar */}}>
          <main className="absolute inset-0 overflow-y-auto">
            {/* Sticky Header */}
            <header className="sticky top-0 z-10 flex items-center justify-between p-4 sm:p-6 md:px-10 md:py-4 bg-[var(--bg-main)]/80 backdrop-blur-sm border-b border-border-color no-print">
                <div className="flex-1 min-w-0">
                  <AnimatePresence>
                    {generatedData && (
                      <motion.h2 
                        key="title"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-2xl font-bold text-text-primary truncate"
                      >
                        Generated Lesson Plan
                      </motion.h2>
                    )}
                  </AnimatePresence>
                </div>
                <div className="flex items-center gap-4">
                  <AnimatePresence>
                    {generatedData && (
                      <motion.div 
                        key="exports"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        <ExportControls 
                          lessonPlan={generatedData.lessonPlan} 
                          competency={competency} 
                          printInfo={printInfo}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div className="flex items-center space-x-1">
                      <button onClick={() => setShowInstructions(true)} className="p-2 text-text-secondary hover:text-text-primary rounded-md transition-colors" title="Instructions"><IconQuestion className="w-5 h-5" /></button>
                      <button onClick={() => setShowAbout(true)} className="p-2 text-text-secondary hover:text-text-primary rounded-md transition-colors" title="About"><IconInfo className="w-5 h-5" /></button>
                  </div>
                </div>
            </header>

            {/* Content */}
            <div className="p-4 sm:p-6 md:p-10">
              <AnimatePresence mode="wait">
                {renderContent()}
              </AnimatePresence>
            </div>
          </main>
      </div>
      
      <AnimatePresence>
        {showInstructions && <InstructionsModal onClose={() => setShowInstructions(false)} />}
        {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
      </AnimatePresence>
    </div>
  );
};

export default App;