import React, { useState, useCallback } from 'react';
import { CompetencyInput } from './components/CompetencyInput';
import { LessonPlanDisplay } from './components/LessonPlanDisplay';
import { Loader } from './components/Loader';
import { GeneratedData, PrintInfo } from './types';
import { generateLessonPlan } from './services/geminiService';
import { ExportControls } from './components/ExportControls';
import { Welcome } from './components/Welcome';
import { PrintPreview } from './components/PrintPreview';
import { InstructionsModal } from './components/InstructionsModal';
import { AboutModal } from './components/AboutModal';
import { Header } from './components/Header';
import { BeamsBackground } from './components/ui/beams-background';

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

  return (
    <BeamsBackground>
      <div className="text-white">
        <Header 
          onShowAbout={() => setShowAbout(true)} 
          onShowInstructions={() => setShowInstructions(true)} 
        />

        <main className="container mx-auto p-4 sm:p-6 md:p-8 relative z-10">
          <CompetencyInput
            value={competency}
            onChange={(e) => setCompetency(e.target.value)}
            onSubmit={handleGeneratePlan}
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
          />
          
          {error && (
            <div className="max-w-4xl mx-auto rounded-lg bg-red-900/50 border border-red-500/50 text-red-300 p-4 my-8" role="alert">
              <p className="font-bold">Error</p>
              <p>{error}</p>
            </div>
          )}

          {isLoading && <Loader />}

          <div className="print-container">
              {!isLoading && !generatedData && <Welcome />}
              {generatedData && (
                <div id="lesson-plan-content" className="max-w-4xl mx-auto">
                  <div className="flex justify-between items-center my-8 no-print">
                      <h2 className="text-3xl font-bold text-white">Generated Lesson Plan</h2>
                      <ExportControls lessonPlan={generatedData.lessonPlan} competency={competency} onShowPrintPreview={() => setShowPrintPreview(true)} />
                  </div>
                  <LessonPlanDisplay
                    lessonPlan={generatedData.lessonPlan}
                    onUpdate={handlePlanUpdate}
                  />
                </div>
              )}
            </div>
        </main>
        
        {showInstructions && <InstructionsModal onClose={() => setShowInstructions(false)} />}
        {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
      </div>
    </BeamsBackground>
  );
};

export default App;