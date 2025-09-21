import { GoogleGenAI, Type } from '@google/genai';
import type { GeneratedData } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const getSystemInstruction = (language: string, hasPdf: boolean, hasCompetency: boolean, integrateObjectives: boolean) => {
    let instruction = `You are an expert curriculum designer for the Philippines' Department of Education (DepEd). Your task is to generate a complete, high-quality lesson plan in ${language}.`;

    if (hasPdf && !hasCompetency) {
        instruction += `\n\nYou will be provided with reference material from a PDF. Your FIRST task is to analyze this text and determine the most appropriate Most Essential Learning Competency (MELC). Then, using that determined competency, you must create a structured lesson plan that spans the requested number of days.`;
    } else {
        instruction += `\n\nYou will be given a Most Essential Learning Competency (MELC) and a number of days. Based on this, you must create a structured lesson plan that spans the requested number of days.`;
    }

    if (hasPdf) {
        instruction += `\n\nCrucially, you MUST use the content from this reference material as the primary source for examples, discussion points, activities, and evaluation questions. The entire lesson plan must be grounded in and reflect the provided text.`;
    }

    instruction += `\n\nFor EACH day, you must provide:`;
    
    if (integrateObjectives) {
        instruction += `
1.  A list of exactly four (4) daily learning objectives based on SOLO Taxonomy, clearly progressing from Unistructural to Extended Abstract.
2.  A list of exactly six (6) daily learning objectives based on Bloom's Taxonomy for Higher-Order Thinking Skills (HOTS), clearly progressing from Remembering to Creating.

These daily objectives are the most critical part of the output. The content of the ten (10) DepEd sections for that day MUST be meticulously designed to directly teach and assess these specific SOLO and HOTS objectives. The activities, questions, and assessments in sections A-J must be explicitly aligned with and guided by the daily objectives you create.`
    } else {
        instruction += `
1. A list of three to five (3-5) specific, measurable, and clear learning objectives for the day's lesson. These objectives should not be labeled with any specific taxonomy (like SOLO or HOTS).`
    }

    instruction += `
2.  All ten (10) sections of the DepEd format:
    A. Reviewing previous lesson or presenting the new lesson
    B. Establishing a purpose for the lesson
    C. Presenting examples/instances of the new lesson
    D. Discussing new concepts and practicing new skills #1
    E. Discussing new concepts and practicing new skills #2
    F. Developing mastery (Formative Assessment #3)
    G. Finding practical applications of concepts and skills in daily living
    H. Making generalizations and abstractions about the lesson
    I. Evaluating learning (Quiz/Test/Performance Task)
    J. Additional activities for applications
3.  The entire output MUST be a single, valid JSON object that strictly adheres to the provided schema. Do not include any introductory text, explanations, or markdown formatting outside of the JSON structure. The entire output, including all titles and content, MUST be in ${language}.`;

    return instruction;
};


export const generateLessonPlan = async (competency: string, numberOfDays: number, language: string, pdfText: string | null, integrateObjectives: boolean): Promise<GeneratedData> => {
  // Dynamically build the schema based on whether objectives are needed.
  const dayPlanSchemaProperties: any = {
      day: { type: Type.INTEGER, description: "The day number for this lesson plan (e.g., 1, 2, 3)." },
      sections: {
          type: Type.ARRAY,
          items: {
              type: Type.OBJECT,
              properties: {
                  id: { type: Type.STRING, description: "The section letter (e.g., 'A', 'B')." },
                  title: { type: Type.STRING, description: "The full title of the lesson plan section." },
                  content: { type: Type.STRING, description: "The detailed content for this section, including suggested activities, questions, or prompts. Should be 2-4 sentences." },
              },
              required: ['id', 'title', 'content'],
          },
      },
  };

  if (integrateObjectives) {
      dayPlanSchemaProperties.soloObjectives = {
        type: Type.ARRAY,
        description: "4 learning objectives for this specific day based on SOLO Taxonomy, scaffolding towards the main competency: Unistructural, Multistructural, Relational, and Extended Abstract.",
        items: { type: Type.STRING },
      };
      dayPlanSchemaProperties.hotsObjectives = {
          type: Type.ARRAY,
          description: "6 learning objectives for this specific day based on HOTS (Bloom's Taxonomy), scaffolding towards the main competency: Remembering, Understanding, Applying, Analyzing, Evaluating, and Creating.",
          items: { type: Type.STRING },
      };
  } else {
      dayPlanSchemaProperties.objectives = {
        type: Type.ARRAY,
        description: "A list of 3-5 general learning objectives for this specific day's lesson.",
        items: { type: Type.STRING },
      };
  }

  const dayPlanSchema = {
      type: Type.OBJECT,
      properties: dayPlanSchemaProperties,
      required: ['day', 'sections'],
  };

  const lessonPlanSchema = {
    type: Type.OBJECT,
    properties: {
      days: {
        type: Type.ARRAY,
        description: "An array of daily lesson plans, one for each day requested.",
        items: dayPlanSchema
      },
    },
    required: ['days'],
  };

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      lessonPlan: lessonPlanSchema,
      competency: { 
          type: Type.STRING, 
          description: "The Most Essential Learning Competency (MELC) used for this lesson plan. If a competency was not provided in the prompt, this should be the competency you derived from the reference material."
      },
    },
    required: ['lessonPlan', 'competency'],
  };
    
  let prompt: string;
  
  if (competency.trim()) {
      prompt = `Generate a complete ${numberOfDays}-day lesson plan in ${language} for the following MELC: "${competency}"`;
  } else {
      prompt = `Analyze the following text, determine the main learning competency, and then generate a complete ${numberOfDays}-day lesson plan in ${language} based on that competency and the text provided.`;
  }

  if (pdfText) {
    prompt += `\n\n--- REFERENCE MATERIAL FROM UPLOADED PDF ---\n${pdfText}\n--- END OF REFERENCE MATERIAL ---`;
  }
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: getSystemInstruction(language, !!pdfText, !!competency.trim(), integrateObjectives),
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
        temperature: 0.7,
      },
    });

    const jsonString = response.text.trim();
    const parsedData = JSON.parse(jsonString);
    
    if (!parsedData.lessonPlan || !parsedData.lessonPlan.days || !parsedData.competency) {
        throw new Error("Received malformed data from API");
    }

    return parsedData as GeneratedData;

  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw new Error('Failed to generate lesson plan from Gemini API.');
  }
};