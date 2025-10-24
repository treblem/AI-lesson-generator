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
      const fontSize = 22; // 11pt

      const createSectionTitle = (text: string) => new Paragraph({
        children: [new TextRun({ text, bold: true, size: 24, font })],
        spacing: { before: 300, after: 150 },
      });

      const createNormalText = (text: string, indent = true) => new Paragraph({
        children: [new TextRun({ text, size: fontSize, font })],
        indent: indent ? { left: 432 } : {}, // 0.3 inch indent
        spacing: { after: 100 }
      });

      let docChildren: any[] = [];

      for (const [index, day] of lessonPlan.days.entries()) {
        
        // Header
        docChildren.push(new Paragraph({ text: "Republic of the Philippines", alignment: AlignmentType.CENTER, style: 'headerStyle' }));
        docChildren.push(new Paragraph({ text: "Department of Education", alignment: AlignmentType.CENTER, style: 'headerStyle', children: [new TextRun({ text: "Department of Education", bold: true })] }));
        docChildren.push(new Paragraph({ text: "Region VII, Central Visayas", alignment: AlignmentType.CENTER, style: 'headerStyle' }));
        docChildren.push(new Paragraph({ text: school, alignment: AlignmentType.CENTER, spacing: { after: 300 }, style: 'headerStyle' }));

        // Title
        docChildren.push(new Paragraph({
          children: [new TextRun({ text: "DAILY LESSON PLAN", bold: true, size: 32, font })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 }
        }));
        
        // Info Table
        const infoTable = new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: { insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE }, top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [
                    new Paragraph({ children: [new TextRun({ text: "Teacher: ", bold: true }), new TextRun(teacher)]}),
                    new Paragraph({ children: [new TextRun({ text: "Learning Area: ", bold: true }), new TextRun(learningArea)]}),
                ], verticalAlign: VerticalAlign.TOP }),
                new TableCell({ children: [
                    new Paragraph({ children: [new TextRun({ text: "Teaching Date: ", bold: true }), new TextRun(`Week ${Math.ceil((index+1)/5)}, Day ${day.day}`)]}),
                    new Paragraph({ children: [new TextRun({ text: "Grade Level: ", bold: true }), new TextRun(gradeLevel)]}),
                    new Paragraph({ children: [new TextRun({ text: "Quarter: ", bold: true }), new TextRun(quarter)]}),
                ], verticalAlign: VerticalAlign.TOP }),
              ],
            }),
          ],
        });
        docChildren.push(infoTable);

        // I. OBJECTIVES
        docChildren.push(createSectionTitle("I. OBJECTIVES (Layunin)"));
        docChildren.push(createNormalText("A. Content Standards: (Pamantayang Pangnilalaman) - From Curriculum Guide"));
        docChildren.push(createNormalText("B. Performance Standards: (Pamantayan sa Pagganap) - From Curriculum Guide"));
        docChildren.push(createNormalText("C. Learning Objectives: (Mga Kasanayan sa Pagkatuto)"));
        if (day.soloObjectives && day.soloObjectives.length > 0) {
          const objectivesTable = new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            columnWidths: [4500, 4500],
            indent: { size: 432, type: WidthType.DXA },
            borders: { insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE }, top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
            rows: [ new TableRow({ children: [
              new TableCell({ children: [
                new Paragraph({ children: [new TextRun({ text: "SOLO Taxonomy Objectives:", bold: true })]}) ,
                ...day.soloObjectives.map(obj => new Paragraph({ text: obj, bullet: { level: 0 } }))
              ]}),
              new TableCell({ children: [
                new Paragraph({ children: [new TextRun({ text: "HOTS-Based Objectives:", bold: true })]}) ,
                ...(day.hotsObjectives || []).map(obj => new Paragraph({ text: obj, bullet: { level: 0 } }))
              ]}),
            ]})]
          });
          docChildren.push(objectivesTable);
        } else if (day.objectives && day.objectives.length > 0) {
          day.objectives.forEach(obj => docChildren.push(new Paragraph({ text: obj, bullet: { level: 0 }, indent: { left: 864 } })));
        }

        // II. CONTENT
        docChildren.push(createSectionTitle("II. CONTENT (Nilalaman)"));
        docChildren.push(createNormalText(competency));

        // III. LEARNING RESOURCES
        docChildren.push(createSectionTitle("III. LEARNING RESOURCES (Kagamitang Panturo)"));
        docChildren.push(createNormalText("A. References: Teacher's Guide, Learner's Materials, Textbook pages, etc."));
        docChildren.push(createNormalText("B. Other Learning Resources: Online portals, supplementary materials, etc."));

        // IV. PROCEDURES
        docChildren.push(createSectionTitle("IV. PROCEDURES (Pamamaraan)"));
        day.sections.forEach(section => {
          docChildren.push(new Paragraph({
            children: [
              new TextRun({ text: `${section.id}. ${section.title}`, bold: true, size: fontSize, font }),
            ],
            indent: { left: 432 },
            spacing: { before: 150 }
          }));
          section.content.split('\n').forEach(line => {
            if (line.trim()) {
              docChildren.push(new Paragraph({
                text: line,
                indent: { left: 864 },
                style: 'normalStyle'
              }));
            }
          });
        });

        // V. REMARKS
        docChildren.push(createSectionTitle("V. REMARKS (Mga Tala)"));
        
        // VI. REFLECTION
        docChildren.push(createSectionTitle("VI. REFLECTION (Pagninilay)"));
        const reflectionPoints = [
          "A. No. of learners who earned 80% in the evaluation",
          "B. No. of learners who require additional activities for remediation",
          "C. Did the remedial lessons work? No. of learners who have caught up with the lesson",
          "D. No. of learners who continue to require remediation",
          "E. Which of my teaching strategies worked well? Why did these work?",
          "F. What difficulties did I encounter which my principal or supervisor can help me solve?",
          "G. What innovation or localized materials did I use/discover which I wish to share with other teachers?",
        ];
        reflectionPoints.forEach(point => docChildren.push(createNormalText(point)));
        
        if (index < lessonPlan.days.length - 1) {
            docChildren.push(new Paragraph({ pageBreakBefore: true }));
        }
      }

      const doc = new Document({
        styles: {
          paragraphStyles: [{
            id: 'headerStyle',
            name: 'Header Style',
            run: { font, size: 22 }, // 11pt
          }, {
            id: 'normalStyle',
            name: 'Normal Style',
            run: { font, size: 22 }, // 11pt
          }]
        },
        sections: [{
          properties: {
            page: {
              margin: {
                top: 720, right: 720, bottom: 720, left: 720 // 0.5 inch margins
              }
            }
          },
          children: docChildren
        }]
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "lesson-plan.docx";
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