export interface LessonPlanSection {
  id: string;
  title: string;
  content: string;
}

export interface DayPlan {
  day: number;
  objectives?: string[];
  soloObjectives?: string[];
  hotsObjectives?: string[];
  sections: LessonPlanSection[];
}

export interface LessonPlan {
  days: DayPlan[];
}

export interface GeneratedData {
  lessonPlan: LessonPlan;
  competency: string;
}

export interface PrintInfo {
  school: string;
  teacher: string;
  gradeLevel: string;
  learningArea: string;
  quarter: string;
}

export type Theme = 'light' | 'dark' | 'high-contrast';
