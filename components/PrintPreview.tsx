import React from 'react';
import type { GeneratedData, PrintInfo } from '../types';
import { IconPrinter, IconClose, IconDepEdLogo } from './Icon';

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
        return section ? section.content : '';
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
                        background-color: rgba(11, 15, 25, 0.8);
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
                        width: 8.5in;
                        min-height: 11in;
                        padding: 0.75in;
                        box-shadow: 0 0 15px rgba(0,0,0,0.5);
                        margin-bottom: 1rem;
                    }
                }
                @media print {
                    @page {
                        size: portrait;
                        margin: 0.5in;
                    }
                    body {
                        background-color: white !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
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
                }
            `}</style>

            <div className="print-preview-container">
                <div className="print-controls w-full max-w-[8.5in] flex justify-between items-center mb-4 no-print">
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
                    <div key={index} className="print-page text-black" style={{ fontFamily: 'Times New Roman, Times, serif', fontSize: '11pt' }}>
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid black', paddingBottom: '8px' }}>
                           <IconDepEdLogo className="w-20 h-20" />
                           <div style={{ textAlign: 'center' }}>
                              <p style={{ margin: 0, fontSize: '12pt' }}>Republic of the Philippines</p>
                              <p style={{ margin: 0, fontSize: '14pt', fontWeight: 'bold' }}>Department of Education</p>
                              <p style={{ margin: 0, fontSize: '12pt' }}>Region VII, Central Visayas</p>
                              <p style={{ margin: 0, fontSize: '11pt' }}>{info.school}</p>
                           </div>
                           <div style={{ width: '80px' }}></div>
                        </div>
                        <h1 style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '16pt', margin: '16px 0' }}>DAILY LESSON PLAN</h1>

                        {/* Info Table */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px', marginBottom: '16px' }}>
                            <div>
                                <p><b>Teacher:</b> {info.teacher}</p>
                                <p><b>Learning Area:</b> {info.learningArea}</p>
                            </div>
                            <div>
                                <p><b>Teaching Date:</b> {`Week ${Math.ceil((index+1)/5)}, Day ${day.day}`}</p>
                                <p><b>Grade Level:</b> {info.gradeLevel}</p>
                                <p><b>Quarter:</b> {info.quarter}</p>
                            </div>
                        </div>

                        {/* Main Content */}
                        <div className="space-y-4">
                            <div className="section">
                                <h2 style={{ fontWeight: 'bold', fontSize: '12pt', borderBottom: '1px solid #ccc', paddingBottom: '2px' }}>I. OBJECTIVES (Layunin)</h2>
                                <div style={{ paddingLeft: '16px', marginTop: '8px' }}>
                                    <p><b>A. Content Standards:</b> (Pamantayang Pangnilalaman) - <i>From Curriculum Guide</i></p>
                                    <p><b>B. Performance Standards:</b> (Pamantayan sa Pagganap) - <i>From Curriculum Guide</i></p>
                                    <p><b>C. Learning Objectives:</b> (Mga Kasanayan sa Pagkatuto)</p>
                                    {(day.soloObjectives && day.soloObjectives.length > 0) ? (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '8px' }}>
                                            <div>
                                                <h4 style={{ fontWeight: 'bold', marginBottom: '4px' }}>SOLO Taxonomy Objectives:</h4>
                                                <ul style={{ listStyleType: 'disc', paddingLeft: '20px', margin: 0 }}>
                                                    {day.soloObjectives.map((obj, i) => <li key={`p-solo-${i}`}>{obj}</li>)}
                                                </ul>
                                            </div>
                                            <div>
                                                <h4 style={{ fontWeight: 'bold', marginBottom: '4px' }}>HOTS-Based Objectives:</h4>
                                                <ul style={{ listStyleType: 'disc', paddingLeft: '20px', margin: 0 }}>
                                                    {day.hotsObjectives?.map((obj, i) => <li key={`p-hots-${i}`}>{obj}</li>)}
                                                </ul>
                                            </div>
                                        </div>
                                    ) : (day.objectives && day.objectives.length > 0) && (
                                        <ul style={{ listStyleType: 'disc', paddingLeft: '40px', margin: '4px 0 0 0' }}>
                                            {day.objectives.map((obj, i) => <li key={`p-obj-${i}`}>{obj}</li>)}
                                        </ul>
                                    )}
                                </div>
                            </div>
                             <div className="section">
                                <h2 style={{ fontWeight: 'bold', fontSize: '12pt', borderBottom: '1px solid #ccc', paddingBottom: '2px' }}>II. CONTENT (Nilalaman)</h2>
                                <p style={{ paddingLeft: '16px', marginTop: '8px' }}>{competency}</p>
                            </div>
                             <div className="section">
                                <h2 style={{ fontWeight: 'bold', fontSize: '12pt', borderBottom: '1px solid #ccc', paddingBottom: '2px' }}>III. LEARNING RESOURCES (Kagamitang Panturo)</h2>
                                <div style={{ paddingLeft: '16px', marginTop: '8px' }}>
                                    <p><b>A. References:</b> Teacher's Guide, Learner's Materials, Textbook pages, etc.</p>
                                    <p><b>B. Other Learning Resources:</b> Online portals, supplementary materials, etc.</p>
                                </div>
                            </div>
                            <div className="section">
                                <h2 style={{ fontWeight: 'bold', fontSize: '12pt', borderBottom: '1px solid #ccc', paddingBottom: '2px' }}>IV. PROCEDURES (Pamamaraan)</h2>
                                <div style={{ paddingLeft: '16px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {day.sections.map(section => (
                                        <div key={section.id}>
                                            <p><b>{section.id}. {section.title}</b></p>
                                            <p style={{ paddingLeft: '24px', whiteSpace: 'pre-wrap', textAlign: 'justify' }}>{section.content}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                             <div className="section">
                                <h2 style={{ fontWeight: 'bold', fontSize: '12pt', borderBottom: '1px solid #ccc', paddingBottom: '2px' }}>V. REMARKS (Mga Tala)</h2>
                                <div style={{ padding: '16px', marginTop: '8px', minHeight: '40px' }}></div>
                            </div>
                             <div className="section">
                                <h2 style={{ fontWeight: 'bold', fontSize: '12pt', borderBottom: '1px solid #ccc', paddingBottom: '2px' }}>VI. REFLECTION (Pagninilay)</h2>
                                <div style={{ paddingLeft: '16px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <p>A. No. of learners who earned 80% in the evaluation</p>
                                    <p>B. No. of learners who require additional activities for remediation</p>
                                    <p>C. Did the remedial lessons work? No. of learners who have caught up with the lesson</p>
                                    <p>D. No. of learners who continue to require remediation</p>
                                    <p>E. Which of my teaching strategies worked well? Why did these work?</p>
                                    <p>F. What difficulties did I encounter which my principal or supervisor can help me solve?</p>
                                    <p>G. What innovation or localized materials did I use/discover which I wish to share with other teachers?</p>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
};