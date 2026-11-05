export interface LessonPlanSection {
  id: string;
  title: string;
  content: string;
  relatedIndicators?: string[];
}

export interface COTAlignmentItem {
  code: string;
  indicator: string;
  sectionApplied: string;
  observableEvidence: string;
}

export interface DayPlan {
  day: number;
  objectives?: string[];
  soloObjectives?: string[];
  hotsObjectives?: string[];
  cotAlignments?: COTAlignmentItem[];
  flowDetails?: any;
  sections: LessonPlanSection[];
}

export interface LessonPlan {
  days: DayPlan[];
}

export interface GeneratedData {
  lessonPlan: LessonPlan;
  competency: string;
  contentStandard?: string;
  performanceStandard?: string;
  coReadyConfig?: COReadyConfig;
}

export interface PrintInfo {
  school: string;
  teacher: string;
  gradeLevel: string;
  learningArea: string;
  quarter: string;
}

export type Theme = 'light' | 'dark' | 'high-contrast';

export type COTTeacherTypeId = 'TI_TIII' | 'TIV_TVII' | 'MTI_MTII' | 'MTIII_MTV';

export interface COTTeacherTypeInfo {
  id: COTTeacherTypeId;
  label: string;
  careerStage: string;
  subLabel: string;
  ratingScale: number[];
  noRating: number;
  targetLevel: number;
  badgeColor: string;
  stageExpectation: string;
}

export interface COTIndicatorInfo {
  number: number;
  code: string;
  title: string;
  tagalogTitle: string;
  defaultSection: string;
}

export interface COReadyConfig {
  enabled: boolean;
  teacherType: COTTeacherTypeId;
  selectedIndicators: string[]; // array of indicator codes e.g. ['1.1.2', '1.4.2', ...]
}

export const COT_TEACHER_TYPES: COTTeacherTypeInfo[] = [
  {
    id: 'TI_TIII',
    label: 'Teacher I–III',
    careerStage: 'Proficient Teacher A (TI–TIII)',
    subLabel: 'SY 2026-2027 | Rating Scale: 2–6 (NO = 2)',
    ratingScale: [2, 3, 4, 5, 6],
    noRating: 2,
    targetLevel: 6,
    badgeColor: '#16a34a', // Green banner from Image 1
    stageExpectation: 'Independent application and consistent integration of strategies across the lesson to achieve Level 6 proficiency.'
  },
  {
    id: 'TIV_TVII',
    label: 'Teacher IV–VII',
    careerStage: 'Proficient Teacher B (TIV–TVII)',
    subLabel: 'SY 2026-2027 | Rating Scale: 3–7 (NO = 3)',
    ratingScale: [3, 4, 5, 6, 7],
    noRating: 3,
    targetLevel: 7,
    badgeColor: '#15803d', // Green banner from Image 2
    stageExpectation: 'Advanced proficient demonstration and seamless learner-centered facilitation to achieve Level 7 rating.'
  },
  {
    id: 'MTI_MTII',
    label: 'Master Teacher I–II',
    careerStage: 'Highly Proficient Teacher (MT I–MT II)',
    subLabel: 'SY 2026-2027 | Rating Scale: 4–8 (NO = 4)',
    ratingScale: [4, 5, 6, 7, 8],
    noRating: 4,
    targetLevel: 8,
    badgeColor: '#2563eb', // Blue banner from Image 4
    stageExpectation: 'Highly proficient, model-level pedagogy demonstrating deep scaffolding, collaborative inquiry, and exemplary differentiation to achieve Level 8 rating.'
  },
  {
    id: 'MTIII_MTV',
    label: 'Master Teacher III–V',
    careerStage: 'Distinguished Teacher (MT III–MT V)',
    subLabel: 'SY 2026-2027 | Rating Scale: 5–9 (NO = 5)',
    ratingScale: [5, 6, 7, 8, 9],
    noRating: 5,
    targetLevel: 9,
    badgeColor: '#ea580c', // Orange banner from Image 3
    stageExpectation: 'Distinguished, innovative, and transformative instructional leadership practices empowering learner autonomy and metacognition to achieve Level 9 rating.'
  }
];

export const COT_INDICATORS: COTIndicatorInfo[] = [
  {
    number: 1,
    code: '1.1.2',
    title: 'Apply knowledge of content within and across curriculum teaching areas (1.1.2)',
    tagalogTitle: 'Nagagamit ang kaalaman sa nilalaman sa loob at sa iba pang asignatura sa kurikulum (1.1.2)',
    defaultSection: 'I1, L2 (Engage & Experience), L4'
  },
  {
    number: 2,
    code: '1.4.2',
    title: 'Use a range of teaching strategies that enhance learner achievement in literacy and numeracy skills (1.4.2)',
    tagalogTitle: 'Gumagamit ng iba\'t ibang estratehiya sa pagtuturo na nagpapataas ng kasanayan sa literasi at numerasi (1.4.2)',
    defaultSection: 'L2 (Explore & Experience)'
  },
  {
    number: 3,
    code: '1.5.2',
    title: 'Apply a range of teaching strategies to develop critical and creative thinking, as well as other higher-order thinking skills (1.5.2)',
    tagalogTitle: 'Nagagamit ang iba\'t ibang estratehiya sa pagtuturo upang malinang ang kritikal at malikhaing pag-iisip at HOTS (1.5.2)',
    defaultSection: 'L2 (Process Questions & Experience)'
  },
  {
    number: 4,
    code: '1.6.2',
    title: 'Display proficient use of Mother Tongue, Filipino and English to facilitate teaching and learning (1.6.2)',
    tagalogTitle: 'Naipamamalas ang mahusay na paggamit ng Mother Tongue, Filipino at Ingles sa pagtuturo at pagkatuto (1.6.2)',
    defaultSection: 'L1, L2 (Engage, Explore & Experience)'
  },
  {
    number: 5,
    code: '2.1.2',
    title: 'Establish safe and secure learning environments to enhance learning through the consistent implementation of policies, guidelines and procedures (2.1.2)',
    tagalogTitle: 'Nakapagtataguyod ng ligtas at maayos na kapaligiran sa pagkatuto sa pamamagitan ng alituntunin at pamamaraan (2.1.2)',
    defaultSection: 'L1 (Pre-Lesson), L2 (Explore)'
  },
  {
    number: 6,
    code: '2.2.2',
    title: 'Maintain learning environments that promote fairness, respect and care to encourage learning (2.2.2)',
    tagalogTitle: 'Napapanatili ang kapaligiran sa pagkatuto na nagtataguyod ng pagkakapantay-pantay, paggalang at pagmamalasakit (2.2.2)',
    defaultSection: 'L1, L2 (Explore & Empathize)'
  },
  {
    number: 7,
    code: '3.2.2',
    title: "Establish a learner-centered culture by using teaching strategies that respond to learners' linguistic, cultural, socio-economic and religious backgrounds (3.2.2)",
    tagalogTitle: 'Nakapagtataguyod ng kulturang nakasentro sa mag-aaral na tumutugon sa kanilang wika, kultura, sosyo-ekonomiko at relihiyon (3.2.2)',
    defaultSection: 'I3, L2 (Explore & Empathize), A1'
  },
  {
    number: 8,
    code: '3.5.2',
    title: 'Adapt and use culturally appropriate teaching strategies to address the needs of learners from indigenous groups (3.5.2)',
    tagalogTitle: 'umaangkop at gumagamit ng mga estratehiyang angkop sa kultura upang tugunan ang pangangailangan ng mga mag-aaral mula sa katutubong pangkat (3.5.2)',
    defaultSection: 'I3, L2 (Explore & Empathize), L4'
  },
  {
    number: 9,
    code: '5.3.2',
    title: 'Use strategies for providing timely, accurate and constructive feedback to improve learner performance (5.3.2)',
    tagalogTitle: 'Gumagamit ng mga estratehiya sa pagbibigay ng napapanahon, tumpak at nakabubuo na feedback upang mapabuti ang pagganap ng mag-aaral (5.3.2)',
    defaultSection: 'L2 (Experience), A1 (Formative Assessment)'
  }
];

export const SECTION_DEFAULT_COT_CODES: Record<string, string[]> = {
  I1: ['1.1.2'],
  I2: ['1.4.2', '1.5.2'],
  I3: ['3.2.2', '3.5.2'],
  L1: ['1.6.2', '2.1.2', '2.2.2'],
  L2: ['1.1.2', '1.4.2', '1.5.2', '1.6.2', '2.1.2', '2.2.2', '3.2.2', '3.5.2', '5.3.2'],
  L3: ['2.1.2', '3.2.2'],
  L4: ['1.1.2', '3.5.2'],
  A1: ['1.5.2', '3.2.2', '5.3.2'],
  W1: ['3.2.2', '5.3.2'],
  W2: ['5.3.2'],
};

export const L2_PHASE_COT_MAPPING: { phase: string; tagalogPhase: string; codes: string[] }[] = [
  {
    phase: '1. Engage',
    tagalogPhase: '1. Engage (Pag-engganyo)',
    codes: ['1.1.2', '1.6.2', '2.1.2'],
  },
  {
    phase: '2. Explore',
    tagalogPhase: '2. Explore (Pagtuklas)',
    codes: ['1.4.2', '2.1.2', '2.2.2', '3.2.2', '3.5.2'],
  },
  {
    phase: '3. Experience & Concept Notes',
    tagalogPhase: '3. Experience at Mga Tala ng Konsepto',
    codes: ['1.1.2', '1.4.2', '1.5.2', '1.6.2', '5.3.2'],
  },
  {
    phase: '4. Empathize',
    tagalogPhase: '4. Empathize (Pakikiramay)',
    codes: ['2.2.2', '3.2.2', '3.5.2'],
  },
];

export interface ResolvedSectionCOTIndicator extends COTIndicatorInfo {
  observableEvidence?: string;
}

export const stripInlineCOTAnnotations = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/\s*\(MELC\)/gi, '')
    .replace(/\[(?:Related\s+)?COT\s+Indicator[^\]]*\]\s*/gi, '')
    .replace(/\((?:Related\s+)?COT\s+Indicator[^)]*\)\s*/gi, '')
    .replace(/^\s*(?:Kaugnay\s+na\s+COT\s+Indicator|Related\s+COT\s+Indicator)[^\n]*\n?/gim, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

export const getSectionRelatedIndicators = (
  section: LessonPlanSection,
  day: DayPlan,
  coReadyConfig?: COReadyConfig
): ResolvedSectionCOTIndicator[] => {
  if (!coReadyConfig?.enabled) return [];

  const allowedCodes = new Set(
    coReadyConfig.selectedIndicators && coReadyConfig.selectedIndicators.length > 0
      ? coReadyConfig.selectedIndicators
      : COT_INDICATORS.map(i => i.code)
  );

  const matchedCodes = new Set<string>();

  // 1. Check explicit section.relatedIndicators from AI
  if (section.relatedIndicators && Array.isArray(section.relatedIndicators)) {
    for (const raw of section.relatedIndicators) {
      for (const ind of COT_INDICATORS) {
        if (raw.includes(ind.code) && allowedCodes.has(ind.code)) {
          matchedCodes.add(ind.code);
        }
      }
    }
  }

  // 2. Check day.cotAlignments where sectionApplied mentions this section ID
  if (day.cotAlignments && Array.isArray(day.cotAlignments)) {
    const secRegex = new RegExp(`\\b${section.id}\\b`, 'i');
    for (const align of day.cotAlignments) {
      if (secRegex.test(align.sectionApplied) && allowedCodes.has(align.code)) {
        matchedCodes.add(align.code);
      }
    }
  }

  // 3. Check section.content for inline mentions of indicator codes
  if (section.content) {
    for (const ind of COT_INDICATORS) {
      if (section.content.includes(ind.code) && allowedCodes.has(ind.code)) {
        matchedCodes.add(ind.code);
      }
    }
  }

  // 4. Fallback/ensure default ILAW section mapping for selected indicators so every section clearly indicates its related COT indicator(s)
  const defaultCodes = SECTION_DEFAULT_COT_CODES[section.id] || [];
  for (const code of defaultCodes) {
    if (allowedCodes.has(code)) {
      matchedCodes.add(code);
    }
  }

  return COT_INDICATORS.filter(ind => matchedCodes.has(ind.code)).map(ind => {
    const alignment = day.cotAlignments?.find(a => a.code === ind.code);
    return {
      ...ind,
      observableEvidence: alignment?.observableEvidence,
    };
  });
};

export type DeckStyleType = 'visual-concept' | 'interactive-lesson' | 'study-review';

export type SlideLayoutType =
  | 'hero-cover'
  | 'learning-goals'
  | 'hook-scenario'
  | 'discovery-challenge'
  | 'big-picture-pillars'
  | 'vocabulary-grid'
  | 'process-flow'
  | 'concept-spotlight'
  | 'worked-examples'
  | 'guided-challenge'
  | 'real-world-reflection'
  | 'quiz-check'
  | 'title'
  | 'objectives'
  | 'activity-split'
  | 'key-terms'
  | 'concept-notes'
  | 'examples'
  | 'assessment'
  | 'summary';

export interface SlideCard {
  heading: string;
  body: string;
  tag?: string;
}

export interface SlideItem {
  id: string;
  slideNumber: number;
  layout: SlideLayoutType;
  sectionTag: string;
  title: string;
  subtitle?: string;
  bullets: string[];
  cards?: SlideCard[];
  calloutTitle?: string;
  calloutText?: string;
  processQuestions?: string[];
  imagePrompt?: string;
  imageCaption?: string;
  imageDataUrl?: string;
  speakerNotes: string;
}

export interface DaySlideDeck {
  day: number;
  deckTitle: string;
  deckSubtitle: string;
  deckStyle?: DeckStyleType;
  topicSummary?: string;
  slides: SlideItem[];
}

export type ModuleSheetFormat = 'deped-slm' | 'activity-worksheet' | 'study-handout';

export interface ModuleKeyTerm {
  term: string;
  definition: string;
}

export interface ModulePracticeTask {
  title: string;
  instructions: string;
  prompts: string[];
}

export interface ModuleQuizItem {
  number: number;
  question: string;
  choices?: string[];
}

export interface DayModuleSheet {
  day: number;
  moduleTitle: string;
  moduleSubtitle: string;
  competency: string;
  contentStandard?: string;
  performanceStandard?: string;
  learningTargets: string[];
  overviewParagraph: string;
  warmUpTitle: string;
  warmUpScenario: string;
  warmUpQuestions: string[];
  exploreTitle: string;
  exploreInstructions: string;
  exploreQuestions: string[];
  conceptNotesTitle: string;
  conceptSummary: string;
  keyTerms: ModuleKeyTerm[];
  corePoints: string[];
  workedExamples: string[];
  practiceTask: ModulePracticeTask;
  applicationTask: ModulePracticeTask;
  generalizationPrompts: string[];
  materialsNeeded: string[];
  quizDirections: string;
  quizItems: ModuleQuizItem[];
  additionalActivity: string;
  answerKey: string;
}


