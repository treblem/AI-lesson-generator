import React, { useState } from 'react';
import type { LessonPlan, PrintInfo } from '../types';
import { IconCopy, IconCheck, IconDocx } from './Icon';
import { motion } from 'framer-motion';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableCell, TableRow, WidthType, BorderStyle, AlignmentType, VerticalAlign } from 'docx';

interface ExportControlsProps {
  lessonPlan: LessonPlan;
  competency: string;
  printInfo: PrintInfo;
}

export const ExportControls: React.FC<ExportControlsProps> = ({ lessonPlan, competency, printInfo }) => {
  const [copied, setCopied] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);

  const handleCopy = () => {
    const textToCopy = `Learning Competency: ${competency}\n\n` +
      lessonPlan.days.map(day => {
        let dayText = `--- DAY ${day.day} ---\n\n`;

        if (day.soloObjectives && day.soloObjectives.length > 0) {
          dayText += `SOLO Objectives:\n` + day.soloObjectives.map(obj => `- ${obj}`).join('\n') + '\n\n';
        }

        if (day.hotsObjectives && day.hotsObjectives.length > 0) {
          dayText += `HOTS Objectives:\n` + day.hotsObjectives.map(obj => `- ${obj}`).join('\n') + '\n\n';
        }
        
        if (day.objectives && day.objectives.length > 0) {
            dayText += `Learning Objectives:\n` + day.objectives.map(obj => `- ${obj}`).join('\n') + '\n\n';
        }

        dayText += day.sections
          .map(section => `${section.id}. ${section.title}\n${section.content}\n`)
          .join('\n');
          
        return dayText;
      }).join('\n\n');
    
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleExportDocx = async () => {
    setIsExportingDocx(true);
    try {
      const { school, teacher, gradeLevel, learningArea, quarter } = printInfo;
      const font = "Times New Roman";
      const fontSize = 18; // 9pt

      // FIX: Updated the type of `content` to allow either a string or an array.
      const createTableCell = (content: string | (string | Paragraph)[], options: any = {}) => {
        const paragraphs = Array.isArray(content)
          ? content.map(item => typeof item === 'string' ? new Paragraph({ children: [new TextRun({ text: item, font, size: fontSize })], spacing: { after: 80 } }) : item)
          : [new Paragraph({ children: [new TextRun({ text: content, font, size: fontSize })], spacing: { after: 80 } })];

        return new TableCell({
          children: paragraphs,
          verticalAlign: VerticalAlign.TOP,
          ...options,
        });
      };

      const createSectionHeaderCell = (text: string) => new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text, font, size: fontSize, bold: true })] })],
        verticalAlign: VerticalAlign.TOP,
      });

      // Header Table
      const headerTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Grade 1 to 12", font, size: fontSize })] })], width: { size: 20, type: WidthType.PERCENTAGE } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `School: ${school}`, font, size: fontSize })] })], width: { size: 40, type: WidthType.PERCENTAGE } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `Grade Level: ${gradeLevel}`, font, size: fontSize })] })], width: { size: 40, type: WidthType.PERCENTAGE } }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "DAILY LESSON LOG", font, size: fontSize, bold: true })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `Teacher: ${teacher}`, font, size: fontSize })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `Learning Area: ${learningArea}`, font, size: fontSize })] })] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ children: [] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Teaching Dates and Time:", font, size: fontSize })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `Quarter: ${quarter}`, font, size: fontSize })] })] }),
            ]
          }),
        ]
      });
      
      const daysOfWeek = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
      const tableRows: TableRow[] = [];

      // Main Header Row
      tableRows.push(new TableRow({
        children: [
          createTableCell(""),
          ...daysOfWeek.map(day => createTableCell([new Paragraph({ children: [new TextRun({ text: day, font, size: fontSize, bold: true })], alignment: AlignmentType.CENTER })])),
        ],
        tableHeader: true,
      }));

      // I. OBJECTIVES
      tableRows.push(new TableRow({ children: [createSectionHeaderCell("I. OBJECTIVES"), createTableCell("", { columnSpan: 5 })] }));
      const contentStandardText = "The learners demonstrate their expanding vocabulary knowledge and grammatical awareness, comprehension of literacy and informational texts, and composing and creating processes; and their receptive and productive skills in order to produce age appropriate and gender-responsive texts based on one's purpose, context and target audience.";
      tableRows.push(new TableRow({ children: [createTableCell(["A. Content Standards"]), createTableCell(contentStandardText, { columnSpan: 5 })] }));
      const performanceStandardText = "The learners apply comprehension of literacy and informational text and produce narrative and expository text based on their purpose, context and target audience using simple, compound, and complex sentence, and age - appropriate and gender - sensitive language.";
      tableRows.push(new TableRow({ children: [createTableCell(["B. Performance Standards"]), createTableCell(performanceStandardText, { columnSpan: 5 })] }));
      
      const competencyCells = daysOfWeek.map((_, index) => {
        const day = lessonPlan.days[index];
        if (!day) return createTableCell("");
        let objectives: Paragraph[] = [new Paragraph({ children: [new TextRun({ text: competency, font, size: fontSize })]})];
         if (day.soloObjectives || day.hotsObjectives || day.objectives) {
            objectives.push(new Paragraph("Learning Competency:"));
            (day.soloObjectives || []).forEach(o => objectives.push(new Paragraph({ text: o, bullet: { level: 0 }, style: 'default' })));
            (day.hotsObjectives || []).forEach(o => objectives.push(new Paragraph({ text: o, bullet: { level: 0 }, style: 'default' })));
            (day.objectives || []).forEach(o => objectives.push(new Paragraph({ text: o, bullet: { level: 0 }, style: 'default' })));
         }
        return createTableCell(objectives);
      });
      tableRows.push(new TableRow({ children: [createTableCell(["C. Learning Competencies / Objectives"]), ...competencyCells] }));
      
      // II. CONTENT
      tableRows.push(new TableRow({ children: [createSectionHeaderCell("II. CONTENT"), ...daysOfWeek.map((_, i) => lessonPlan.days[i] ? createTableCell(competency) : createTableCell(""))] }));
      
      // III. LEARNING RESOURCES
      tableRows.push(new TableRow({ children: [createSectionHeaderCell("III. LEARNING RESOURCES"), createTableCell("", { columnSpan: 5 })] }));
      tableRows.push(new TableRow({ children: [createTableCell(["A. References"]), createTableCell("", { columnSpan: 5 })] }));
      tableRows.push(new TableRow({ children: [createTableCell(["1. Teacher's Guide Pages"]), createTableCell("", { columnSpan: 5 })] }));
      tableRows.push(new TableRow({ children: [createTableCell(["2. Learner's Materials Pages"]), createTableCell("", { columnSpan: 5 })] }));
      tableRows.push(new TableRow({ children: [createTableCell(["3. Textbooks Pages"]), createTableCell("", { columnSpan: 5 })] }));
      tableRows.push(new TableRow({ children: [createTableCell(["4. Additional Materials from Learning Resources (LR)Portal"]), createTableCell("", { columnSpan: 5 })] }));
      tableRows.push(new TableRow({ children: [createTableCell(["B. Other Learning Resources"]), createTableCell("", { columnSpan: 5 })] }));
      
      // IV. PROCEDURES
      tableRows.push(new TableRow({ children: [createSectionHeaderCell("IV. PROCEDURES"), createTableCell("", { columnSpan: 5 })] }));
      const procedureTitles = lessonPlan.days[0]?.sections.map(s => `${s.id}. ${s.title}`) || [];
      procedureTitles.forEach((title, sectionIndex) => {
        const procedureCells = daysOfWeek.map((_, dayIndex) => {
          const day = lessonPlan.days[dayIndex];
          return (day && day.sections[sectionIndex]) ? createTableCell(day.sections[sectionIndex].content) : createTableCell("");
        });
        tableRows.push(new TableRow({ children: [createTableCell([title]), ...procedureCells] }));
      });
      
      // V. REMARKS & VI. REFLECTION
      tableRows.push(new TableRow({ children: [createSectionHeaderCell("V. REMARKS"), createTableCell("", { columnSpan: 5 })] }));
      tableRows.push(new TableRow({ children: [createSectionHeaderCell("VI. REFLECTION"), createTableCell("", { columnSpan: 5 })] }));
      const reflectionPoints = [
        "A. No. of learners who earned 80% in the evaluation", "B. No. of learners who require additional activities for remediation", "C. Did the remedial lessons work? No. of learners who have caught up with the lesson", "D. No. of learners who continue to require remediation", "E. Which of my teaching strategies worked well? Why did these work?", "F. What difficulties did I encounter which my principal or supervisor can help me solve?", "G. What innovation or localized materials did I use/discover which I wish to share with other teachers?",
      ];
      reflectionPoints.forEach(point => {
        tableRows.push(new TableRow({ children: [createTableCell([point]), createTableCell("", { columnSpan: 5 })] }));
      });

      const mainTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: tableRows,
      });

      const doc = new Document({
        styles: {
          paragraphStyles: [{
            id: 'default',
            name: 'Default Paragraph Style',
            run: { font, size: fontSize },
          }]
        },
        sections: [{
          properties: {
            page: {
              size: { orientation: 'landscape' },
              margin: { top: 720, right: 720, bottom: 720, left: 720 }
            }
          },
          children: [
            new Paragraph({ text: "SAMPLE DETAILED LESSON PLAN (DLP)", alignment: AlignmentType.CENTER }),
            headerTable,
            new Paragraph(" "),
            mainTable
          ]
        }]
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "lesson-plan-weekly.docx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch(e) {
      console.error("Error generating DOCX", e);
      alert("There was an error generating the DOCX file.");
    } finally {
      setIsExportingDocx(false);
    }
  };

  return (
    <div className="flex items-center space-x-3 no-print">
      <motion.button
        onClick={handleCopy}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex items-center px-4 py-2 text-sm font-semibold text-text-secondary bg-card-dark hover:text-text-primary border border-border-color rounded-lg transition-colors"
        title="Copy raw text to clipboard"
      >
        {copied ? (
          <>
            <IconCheck className="w-4 h-4 mr-2 text-green-500" />
            Copied
          </>
        ) : (
          <>
            <IconCopy className="w-4 h-4 mr-2" />
            Copy Text
          </>
        )}
      </motion.button>

      <motion.button
        onClick={handleExportDocx}
        disabled={isExportingDocx}
        whileHover={{ scale: isExportingDocx ? 1 : 1.05 }}
        whileTap={{ scale: isExportingDocx ? 1 : 0.95 }}
        className="flex items-center px-4 py-2 text-sm font-semibold text-text-secondary bg-card-dark hover:text-text-primary border border-border-color rounded-lg transition-colors disabled:opacity-50 disabled:cursor-wait"
        title="Export as a DOCX file"
      >
        {isExportingDocx ? (
          <>
            <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Exporting...
          </>
        ) : (
          <>
            <IconDocx className="w-4 h-4 mr-2" />
            Export DOCX
          </>
        )}
      </motion.button>
    </div>
  );
};