import React from 'react';
import type { GeneratedData, PrintInfo } from '../types';
import { IconPrinter, IconClose } from './Icon';

interface PrintPreviewProps {
    data: GeneratedData;
    info: PrintInfo;
    competency: string;
    onClose: () => void;
}

export const PrintPreview: React.FC<PrintPreviewProps> = ({ data, info, competency, onClose }) => {
    
    const handlePrint = () => {
        window.print();
    };

    const findSectionContent = (day, sectionId) => {
        const section = day.sections.find(s => s.id === sectionId);
        return section ? section.content : 'N/A';
    };

    return (
        <>
            <style>{`
                @media screen {
                    .print-preview-container {
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background-color: rgba(0, 0, 0, 0.75);
                        backdrop-filter: blur(10px);
                        -webkit-backdrop-filter: blur(10px);
                        z-index: 50;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        padding: 2rem;
                        overflow-y: auto;
                    }
                    .print-page {
                        background-color: white;
                        width: 11in;
                        min-height: 8.5in;
                        padding: 0.5in;
                        box-shadow: 0 0 15px rgba(0,0,0,0.5);
                    }
                }
                @media print {
                    @page {
                        size: landscape;
                        margin: 0.5in;
                    }
                    body {
                        background-color: white !important;
                        margin: 0;
                    }
                    .print-preview-container, .print-controls {
                        display: none !important;
                    }
                    .print-page {
                        display: block !important;
                        width: 100%;
                        height: auto;
                        box-shadow: none;
                        padding: 0;
                        margin: 0;
                        border: none;
                        page-break-after: always;
                    }
                    .print-page:last-child {
                        page-break-after: auto;
                    }
                    table, tr, td, th {
                         border-width: 1px !important;
                         border-color: black !important;
                    }
                }
            `}</style>

            <div className="print-preview-container">
                <div className="print-controls w-full max-w-[11in] flex justify-between items-center mb-4 no-print">
                    <h2 className="text-xl font-bold text-white">Print Preview</h2>
                    <div className="flex items-center gap-4">
                        <button onClick={handlePrint} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                            <IconPrinter className="w-5 h-5" />
                            Print
                        </button>
                        <button onClick={onClose} className="flex items-center justify-center bg-black/30 text-white w-9 h-9 rounded-full hover:bg-black/50 transition-colors">
                           <IconClose className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {data.lessonPlan.days.map((day, index) => (
                    <div key={index} className="print-page text-black font-serif text-sm">
                        <h1 className="text-center font-bold text-base mb-4">DAILY LESSON LOG</h1>
                        <table className="w-full border-collapse border border-black">
                           <tbody>
                                <tr>
                                    <td className="border border-black p-2"><b>School</b></td>
                                    <td className="border border-black p-2">{info.school}</td>
                                    <td className="border border-black p-2"><b>Grade Level</b></td>
                                    <td className="border border-black p-2">{info.gradeLevel}</td>
                                </tr>
                                <tr>
                                    <td className="border border-black p-2"><b>Teacher</b></td>
                                    <td className="border border-black p-2">{info.teacher}</td>
                                    <td className="border border-black p-2"><b>Learning Area</b></td>
                                    <td className="border border-black p-2">{info.learningArea}</td>
                                </tr>
                                <tr>
                                    <td className="border border-black p-2"><b>Teaching Dates & Time</b></td>
                                    <td className="border border-black p-2">{`Week ${Math.ceil((index+1)/5)}, Day ${day.day}`}</td>
                                    <td className="border border-black p-2"><b>Quarter</b></td>
                                    <td className="border border-black p-2">{info.quarter}</td>
                                </tr>
                           </tbody>
                        </table>
                        
                        <table className="w-full border-collapse border border-black mt-2">
                            <thead>
                                <tr>
                                    <th className="w-1/2 border border-black p-2 text-left align-top"></th>
                                    <th className="w-1/2 border border-black p-2 text-left align-top font-bold">DAY {day.day}</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="border border-black p-2 align-top"><b>I. OBJECTIVES</b></td>
                                    <td className="border border-black p-2 align-top">
                                        <div className="pl-4">
                                            <p className="mb-1"><b>A. Content Standards</b></p>
                                            <p className="pl-4 mb-2">(Pamantayang Pangnilalaman) - From Curriculum Guide</p>
                                            <p className="mb-1"><b>B. Performance Standards</b></p>
                                            <p className="pl-4 mb-2">(Pamantayan sa Pagganap) - From Curriculum Guide</p>
                                            <p className="mb-1"><b>C. Learning Competencies/Objectives</b></p>
                                            <p className="pl-4 mb-2">(Mga Kasanayan sa Pagkatuto)</p>
                                            {(day.objectives || day.soloObjectives || day.hotsObjectives) && (
                                                <ul className="list-disc pl-10 space-y-1">
                                                    {day.objectives?.map((obj, i) => <li key={`p-obj-${i}`}>{obj}</li>)}
                                                    {day.soloObjectives?.map((obj, i) => <li key={`p-solo-${i}`}>{obj}</li>)}
                                                    {day.hotsObjectives?.map((obj, i) => <li key={`p-hots-${i}`}>{obj}</li>)}
                                                </ul>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td className="border border-black p-2 align-top"><b>II. CONTENT</b></td>
                                    <td className="border border-black p-2 align-top">{competency}</td>
                                </tr>
                                <tr>
                                    <td className="border border-black p-2 align-top"><b>III. LEARNING RESOURCES</b></td>
                                    <td className="border border-black p-2 align-top"></td>
                                </tr>
                                <tr>
                                    <td className="border border-black p-2 align-top"><b className="pl-4">A. References</b></td>
                                    <td className="border border-black p-2 align-top">
                                        <p>1. Teacher's Guide pages</p>
                                        <p>2. Learner's Materials pages</p>
                                        <p>3. Textbook pages</p>
                                        <p>4. Additional Materials from Learning Resource (LR) portal</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td className="border border-black p-2 align-top"><b className="pl-4">B. Other Learning Resources</b></td>
                                    <td className="border border-black p-2 align-top"></td>
                                </tr>
                                <tr>
                                    <td className="border border-black p-2 align-top"><b>IV. PROCEDURES</b></td>
                                    <td className="border border-black p-2 align-top">
                                        <div className="pl-4">
                                            <div className="space-y-4">
                                                <div>
                                                    <p><b>A. Reviewing previous lesson or presenting the new lesson</b></p>
                                                    <p className="pl-4 whitespace-pre-wrap">{findSectionContent(day, 'A')}</p>
                                                </div>
                                                <div>
                                                    <p><b>B. Establishing a purpose for the lesson</b></p>
                                                    <p className="pl-4 whitespace-pre-wrap">{findSectionContent(day, 'B')}</p>
                                                </div>
                                                <div>
                                                    <p><b>C. Presenting examples/instances of the new lesson</b></p>
                                                    <p className="pl-4 whitespace-pre-wrap">{findSectionContent(day, 'C')}</p>
                                                </div>
                                                <div>
                                                    <p><b>D. Discussing new concepts and practicing new skills #1</b></p>
                                                    <p className="pl-4 whitespace-pre-wrap">{findSectionContent(day, 'D')}</p>
                                                </div>
                                                <div>
                                                    <p><b>E. Discussing new concepts and practicing new skills #2</b></p>
                                                    <p className="pl-4 whitespace-pre-wrap">{findSectionContent(day, 'E')}</p>
                                                </div>
                                                <div>
                                                    <p><b>F. Developing mastery (leads to Formative Assessment 3)</b></p>
                                                    <p className="pl-4 whitespace-pre-wrap">{findSectionContent(day, 'F')}</p>
                                                </div>
                                                <div>
                                                    <p><b>G. Finding practical applications of concepts and skills in daily living</b></p>
                                                    <p className="pl-4 whitespace-pre-wrap">{findSectionContent(day, 'G')}</p>
                                                </div>
                                                <div>
                                                    <p><b>H. Making generalizations and abstractions about the lesson</b></p>
                                                    <p className="pl-4 whitespace-pre-wrap">{findSectionContent(day, 'H')}</p>
                                                </div>
                                                <div>
                                                    <p><b>I. Evaluating learning</b></p>
                                                    <p className="pl-4 whitespace-pre-wrap">{findSectionContent(day, 'I')}</p>
                                                </div>
                                                <div>
                                                    <p><b>J. Additional activities for application or remediation</b></p>
                                                    <p className="pl-4 whitespace-pre-wrap">{findSectionContent(day, 'J')}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td className="border border-black p-2 align-top"><b>V. REMARKS</b></td>
                                    <td className="border border-black p-2 align-top"></td>
                                </tr>
                                 <tr>
                                    <td className="border border-black p-2 align-top"><b>VI. REFLECTION</b></td>
                                    <td className="border border-black p-2 align-top">
                                        <div className="pl-4">
                                            <div className="space-y-2">
                                                <p>A. No. of learners who earned 80% in the evaluation</p>
                                                <p>B. No. of learners who require additional activities for remediation</p>
                                                <p>C. Did the remedial lessons work? No. of learners who have caught up with the lesson</p>
                                                <p>D. No. of learners who continue to require remediation</p>
                                                <p>E. Which of my teaching strategies worked well? Why did these work?</p>
                                                <p>F. What difficulties did I encounter which my principal or supervisor can help me solve?</p>
                                                <p>G. What innovation or localized materials did I use/discover which I wish to share with other teachers?</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                ))}
            </div>
        </>
    );
};
