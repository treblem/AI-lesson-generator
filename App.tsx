import React, { useState, useCallback } from 'react';
import { LessonPlanDisplay } from './components/LessonPlanDisplay';
import { Loader } from './components/Loader';
import { GeneratedData, PrintInfo } from './types';
import { generateLessonPlan } from './services/geminiService';
import { ExportControls } from './components/ExportControls';
import { Welcome } from './components/Welcome';
import { PrintPreview } from './components/PrintPreview';
import { InstructionsModal } from './components/InstructionsModal';
import { AboutModal } from './components/AboutModal';
import { Sidebar } from './components/Sidebar';
import { motion, AnimatePresence } from 'framer-motion';

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

  const [showPrintPreview, setShowPrintPreview] = useState<boolean>(false);
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

  if (showPrintPreview && generatedData) {
    return (
      <PrintPreview
        data={generatedData}
        info={printInfo}
        competency={competency}
        onClose={() => setShowPrintPreview(false)}
      />
    );
  }

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
          <div className="flex justify-between items-center my-8 no-print">
              <h2 className="text-3xl font-bold text-text-primary">Generated Lesson Plan</h2>
              <ExportControls lessonPlan={generatedData.lessonPlan} competency={competency} onShowPrintPreview={() => setShowPrintPreview(true)} />
          </div>
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
    <div className="min-h-screen flex text-text-primary">
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
        onShowAbout={() => setShowAbout(true)} 
        onShowInstructions={() => setShowInstructions(true)} 
        onNewPlan={handleNewPlan}
      />

      <main className="flex-1 p-4 sm:p-6 md:p-10 overflow-y-auto" style={{ marginLeft: '384px' /* width of sidebar */}}>
          <AnimatePresence mode="wait">
            {renderContent()}
          </AnimatePresence>
      </main>
      
      <AnimatePresence>
        {showInstructions && <InstructionsModal onClose={() => setShowInstructions(false)} />}
        {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
      </AnimatePresence>
    </div>
  );
};

export default App;