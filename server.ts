import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;
function getAi() {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

const exhaustedDailyModels = new Set<string>(['gemini-3.8-flash']);

const DEFAULT_MODEL_CHAIN = [
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-flash-latest',
  'gemini-3.1-flash-lite',
  'gemini-3-flash-preview',
];

function getAvailableModelChain(preferredModel?: string) {
  const preferred = preferredModel ? [preferredModel] : [];
  const candidates = [...preferred, ...DEFAULT_MODEL_CHAIN].filter((m, idx, self) => m && self.indexOf(m) === idx);
  return candidates.filter(m => !exhaustedDailyModels.has(m));
}

function adaptConfigForModel(modelName: string, baseConfig: any) {
  if (!baseConfig) return undefined;
  const config = { ...baseConfig };

  if (modelName.startsWith('gemini-3') || modelName.startsWith('gemini-4')) {
    delete config.temperature;
    delete config.topP;
    delete config.topK;
  }

  delete config.thinkingConfig;
  return config;
}

function extractJsonFromResponse(response: any): any {
  const raw = typeof response?.text === 'string' ? response.text.trim() : '';
  if (!raw) {
    throw new Error('Empty response text from AI model');
  }
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
    }
    throw new Error('Malformed JSON returned by AI model');
  }
}

async function generateContentWithRetry(ai: GoogleGenAI, params: any, maxRetries = 1, initialDelayMs = 400) {
  let attempt = 0;
  const modelChain = getAvailableModelChain(params.model);
  let currentModelIndex = 0;

  while (currentModelIndex < modelChain.length) {
    const activeModel = modelChain[currentModelIndex];
    const currentConfig = adaptConfigForModel(activeModel, params.config);
    const currentParams = { ...params, model: activeModel, ...(currentConfig ? { config: currentConfig } : {}) };

    try {
      console.log(`[Gemini API] Generating with model: ${activeModel}`);
      const result = await ai.models.generateContent(currentParams);
      if (result && typeof result.text === 'string' && result.text.trim().length > 0) {
        return result;
      }
      throw new Error(`Model ${activeModel} returned an empty response.`);
    } catch (error: any) {
      attempt++;
      const errorString = error?.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
      const status = error?.status || error?.code;

      const isDailyQuotaExceeded =
        errorString.includes('GenerateRequestsPerDay') ||
        errorString.includes('requests per day limit exceeded') ||
        errorString.includes('limit: 20') ||
        errorString.includes('limit: 0') ||
        (errorString.includes('Quota exceeded') && errorString.includes('Free Tier'));

      if (isDailyQuotaExceeded) {
        console.log(`[Gemini API] Switching from ${activeModel} to next available model.`);
        exhaustedDailyModels.add(activeModel);
        currentModelIndex++;
        attempt = 0;
        continue;
      }

      const isModelNotFound =
        status === 404 ||
        errorString.includes('404') ||
        errorString.includes('NOT_FOUND') ||
        errorString.includes('not found');

      if (isModelNotFound) {
        exhaustedDailyModels.add(activeModel);
        currentModelIndex++;
        attempt = 0;
        continue;
      }

      const isRetryable =
        status === 503 ||
        status === 429 ||
        errorString.includes('503') ||
        errorString.includes('429') ||
        errorString.includes('UNAVAILABLE') ||
        errorString.includes('RESOURCE_EXHAUSTED') ||
        errorString.includes('ResourceExhausted') ||
        errorString.includes('temporary') ||
        errorString.includes('high demand');

      if (isRetryable) {
        if (attempt <= maxRetries) {
          const delay = initialDelayMs * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        } else {
          currentModelIndex++;
          attempt = 0;
          continue;
        }
      }

      currentModelIndex++;
      attempt = 0;
    }
  }

  throw new Error('Free tier quota reached across models; using built-in curriculum synthesizer.');
}

function synthesizeFallbackLessonPlanBatch(params: {
  startDay: number;
  endDay: number;
  totalDays: number;
  language: string;
  competency: string;
  contentStandard: string;
  performanceStandard: string;
  pdfText?: string;
  integrateObjectives?: boolean;
  coReadyConfig?: any;
  TEACHER_STAGE_MAP: Record<string, any>;
  ALL_COT_INDICATORS: Record<string, string>;
}) {
  const {
    startDay,
    endDay,
    totalDays,
    language,
    competency,
    contentStandard,
    performanceStandard,
    pdfText,
    integrateObjectives,
    coReadyConfig,
    TEACHER_STAGE_MAP,
    ALL_COT_INDICATORS,
  } = params;

  const isFil = language === 'Tagalog' || language === 'Filipino';
  const pdfSnippet = typeof pdfText === 'string' && pdfText.trim()
    ? pdfText.replace(/\s+/g, ' ').trim().slice(0, 240)
    : '';

  const derivedComp = competency || (pdfSnippet
    ? (isFil ? `Nasusuri at nailalapat ang mga pangunahing konsepto mula sa paksang: ${pdfSnippet.slice(0, 110)}...` : `Analyze and apply the core concepts and principles presented in: ${pdfSnippet.slice(0, 110)}...`)
    : (isFil ? 'Naipamamalas ang malalim na pag-unawa at praktikal na paglalapat ng pangunahing kasanayang pampagkatuto sa aralin.' : 'Demonstrate deep understanding and practical application of the target curriculum learning competency.'));

  const derivedContentStd = contentStandard || (isFil
    ? `Naipamamalas ng mag-aaral ang pag-unawa sa mga pangunahing konsepto at prinsipyo kaugnay ng: ${derivedComp}`
    : `The learner demonstrates understanding of key concepts, principles, and relationships related to: ${derivedComp}`);

  const derivedPerfStd = performanceStandard || (isFil
    ? `Naisasagawa ng mag-aaral ang makabuluhang gawain at paglalapat sa tunay na buhay batay sa kasanayang: ${derivedComp}`
    : `The learner independently transfers learning by performing authentic tasks and real-life applications grounded in: ${derivedComp}`);

  const isCO = !!(coReadyConfig && coReadyConfig.enabled);
  const stageInfo = isCO ? (TEACHER_STAGE_MAP[coReadyConfig.teacherType] || TEACHER_STAGE_MAP.TI_TIII) : null;
  const selectedCodes: string[] = isCO
    ? (Array.isArray(coReadyConfig.selectedIndicators) && coReadyConfig.selectedIndicators.length > 0
        ? coReadyConfig.selectedIndicators
        : Object.keys(ALL_COT_INDICATORS))
    : [];

  const cotTag = (idx: number) => {
    if (!isCO || selectedCodes.length === 0 || !stageInfo) return '';
    const code = selectedCodes[idx % selectedCodes.length];
    const title = ALL_COT_INDICATORS[code] || code;
    return ` [Related COT Indicator (${code}): ${title} — ${stageInfo.label} Target Level ${stageInfo.targetLevel}]`;
  };

  const dayFocusesEn = [
    'Foundational Concepts, Core Vocabulary, and Real-World Context',
    'Deepening Inquiry, Mechanism Analysis, and Guided Exploration',
    'Practical Application, Collaborative Problem-Solving, and Skill Mastery',
    'Comparative Analysis, Case Evaluation, and Higher-Order Synthesis',
    'Authentic Performance, Synthesis, and Community Value Integration',
  ];
  const dayFocusesFil = [
    'Batayang Konsepto, Mahahalagang Terminolohiya, at Konteksto sa Tunay na Buhay',
    'Pagpapalalim ng Pagsusuri, Ugnayan ng mga Konsepto, at Ginabayang Pagtuklas',
    'Praktikal na Paglalapat, Pangkatang Paglutas ng Suliranin, at Kasanayan',
    'Mapanuring Paghahambing, Pagsusuri ng Sitwasyon, at Mas Mataas na Kaisipan',
    'awtentikong Pagganap, Paglalahat, at Pagsasabuhay sa Komunidad',
  ];

  const days: any[] = [];
  for (let d = startDay; d <= endDay; d++) {
    const focusIdx = (d - 1) % 5;
    const focusTitle = isFil ? dayFocusesFil[focusIdx] : dayFocusesEn[focusIdx];
    const dayLabel = totalDays > 1 ? (isFil ? `Araw ${d} (${focusTitle})` : `Day ${d} (${focusTitle})`) : (isFil ? focusTitle : focusTitle);

    const objectives = isFil
      ? [
          `Kognitibo: Natutukoy at naipapaliwanag nang malinaw ang mga pangunahing konsepto at prinsipyo ng "${derivedComp}" na nakatuon sa ${focusTitle}${integrateObjectives ? ' (SOLO Relational / HOTS Pagsusuri)' : ''}.`,
          `Saykomotor: Naisasagawa at nakabubuo ng kongkretong awtput o gawain na nagpapakita ng wastong paglalapat ng "${derivedComp}"${integrateObjectives ? ' (HOTS Paglalapat at Paglikha)' : ''}.`,
          `Apektibo: Napahahalagahan at naipamamalas ang kahalagahan ng "${derivedComp}" sa pang-araw-araw na pamumuhay at pakikipagkapwa.`,
        ]
      : [
          `Cognitive: Identify and explain the core concepts, principles, and relationships of "${derivedComp}" with emphasis on ${focusTitle}${integrateObjectives ? ' (SOLO Relational / HOTS Analyzing)' : ''}.`,
          `Psychomotor: Perform and construct a concrete learning output demonstrating accurate application of "${derivedComp}"${integrateObjectives ? ' (HOTS Applying & Creating)' : ''}.`,
          `Affective: Appreciate and demonstrate the real-life relevance and value of "${derivedComp}" in daily decision-making and community life.`,
        ];

    const flowDetails = {
      conceptNotes: {
        topicTitle: isFil ? `${derivedComp} — ${dayLabel}` : `${derivedComp} — ${dayLabel}`,
        keyTerms: isFil
          ? [
              `Batayang Konsepto — Ang sentral na ideya at kahulugan na sumasaklaw sa kasanayang "${derivedComp}".`,
              `Pamantayang Prinsipyo — Ang mga alituntunin at ugnayang nagpapaliwanag kung paano gumagana ang paksa sa iba't ibang sitwasyon.`,
              `Praktikal na Aplikasyon — Ang tuwirang paggamit ng natutuhang konsepto sa pagsusuri at paglutas ng suliranin.`,
              `Paglalahat at Pagpapahalaga — Ang pag-uugnay ng aralin sa sariling karanasan, komunidad, at responsableng pagpapasya.`,
            ]
          : [
              `Core Concept — The foundational definition and central principle underlying "${derivedComp}".`,
              `Governing Mechanism / Rule — The systematic relationship explaining how the concept operates across contexts.`,
              `Contextual Application — The direct transfer of the concept to analyze scenarios and solve authentic problems.`,
              `Synthesis & Value Connection — Linking the lesson's principles to personal decisions and community well-being.`,
            ],
        detailedDiscussion: isFil
          ? `Sa sesyong ito (${dayLabel}), tatalakayin nang malinaw ang "${derivedComp}". Unang bibigyang-diin ang kahulugan at mga salik na bumubuo sa paksa upang magkaroon ng matibay na pundasyon ang mga mag-aaral.${pdfSnippet ? ` Batay sa sangguniang teksto ("${pdfSnippet}"), susuriin ang mga tiyak na detalye at ebidensya.` : ''} Ikalawa, ipapakita ang hakbang-hakbang na ugnayan ng mga ideya upang maunawaan kung paano ito inilalapat sa pagsusuri ng mga sitwasyon.${cotTag(0)}`
          : `In this session (${dayLabel}), learners explore "${derivedComp}" in a clear, structured progression. First, the class establishes the foundational definitions and essential characteristics of the topic.${pdfSnippet ? ` Grounded in the reference material ("${pdfSnippet}"), learners examine key evidence and examples.` : ''} Second, the discussion traces how the core principles interact step-by-step so students can confidently analyze real-world situations and justify their reasoning.${cotTag(0)}`,
        illustrativeExamples: isFil
          ? [
              `Halimbawa 1 (Konkretong Sitwasyon sa Paaralan at Tahanan): Pagpapakita kung paano nakikita ang "${derivedComp}" sa pang-araw-araw na karanasan ng mga mag-aaral.`,
              `Halimbawa 2 (Pagsusuri ng Kaso o Suliranin): Hakbang-hakbang na paglalapat ng konsepto upang matukoy ang sanhi, bunga, o tamang solusyon.`,
              `Halimbawa 3 (Koneksyon sa Komunidad): Pag-uugnay ng aralin sa napapanahong isyu o lokal na konteksto sa komunidad.`,
            ]
          : [
              `Example 1 (Everyday Classroom & Home Context): A relatable scenario illustrating how "${derivedComp}" operates in learners' daily surroundings.`,
              `Example 2 (Guided Case Breakdown): A step-by-step walkthrough showing how to apply the concept rules to analyze a problem and verify the solution.`,
              `Example 3 (Community & Real-World Link): Connecting the concept to an authentic local community or interdisciplinary situation.`,
            ],
        keyTakeaways: isFil
          ? `Ang malalim na pag-unawa sa "${derivedComp}" (${focusTitle}) ay nagbibigay-daan sa mapanuring pag-iisip, wastong pagsasagawa, at makabuluhang pagsasabuhay sa tunay na sitwasyon.`
          : `Mastering "${derivedComp}" (${focusTitle}) equips learners to think critically, apply concepts accurately, and make informed, responsible decisions in real-world contexts.`,
      },
      lessonMaterials: isFil
        ? [
            'Visual aid / Slide presentation ng Concept Notes at mga larawan ng sitwasyon',
            'Activity Task Cards at Graphic Organizer para sa pangkatang gawain',
            'Manila paper, marker, at sagutang papel (Learner Worksheet)',
            'Rubrik sa pagmamarka ng pangkatang awtput at tseklist sa pagtataya',
          ]
        : [
            'Visual presentation / Concept Notes chart and scenario prompt cards',
            'Group Inquiry Task Cards and Structured Graphic Organizers',
            'Chart paper, markers, and Student Activity Worksheets',
            'Performance rubric and formative assessment answer sheets',
          ],
      activities: [
        {
          phase: isFil ? '1. ENGAGE (Pag-engganyo)' : '1. ENGAGE',
          activityTitle: isFil ? 'Sitwasyon-Suri: Unang Sulyap sa Paksa' : 'Scenario Spark: Picture & Situation Hook',
          activityDescription: isFil
            ? `Magpapakita ang guro ng isang makabuluhang larawan o maikling sitwasyon na may kaugnayan sa "${derivedComp}". Ibabahagi ng mga mag-aaral sa kapareha ang kanilang unang obserbasyon at karanasan tungkol dito.${cotTag(0)}`
            : `The teacher presents a relatable visual prompt or short real-life scenario connected to "${derivedComp}". Learners pair up for a quick Think-Pair-Share to state what they notice and connect it to prior knowledge.${cotTag(0)}`,
          processQuestions: isFil
            ? [
                'Ano ang pangunahing ideya o sitwasyong ipinapakita sa ating panimulang gawain?',
                'Paano ito nauugnay sa inyong sariling karanasan sa araw-araw?',
                'Bakit mahalagang maunawaan natin ang paksang ito ngayon?',
              ]
            : [
                'What key idea or pattern do you notice in the opening scenario?',
                'How does this situation connect to what you have experienced in daily life?',
                'Why is it important for us to understand this concept today?',
              ],
        },
        {
          phase: isFil ? '2. EXPLORE (Pagtuklas)' : '2. EXPLORE',
          activityTitle: isFil ? 'Tuklas-Konsepto: Pangkatang Pagsusuri' : 'Discovery Station: Collaborative Concept Inquiry',
          activityDescription: isFil
            ? `Hahatiin ang klase sa maliliit na pangkat upang suriin ang maikling gawain o case card tungkol sa ${focusTitle}. Itatala ng bawat pangkat ang kanilang natuklasang ugnayan at mahahalagang ideya sa graphic organizer.${cotTag(1)}`
            : `Learners work in small collaborative groups to investigate a short case prompt or data card focused on ${focusTitle}. Each group organizes their findings and patterns using a guided graphic organizer.${cotTag(1)}`,
          processQuestions: isFil
            ? [
                'Ano ang mahahalagang detalye o pattern na natuklasan ng inyong pangkat?',
                'Paano nagkakaugnay ang mga ideyang inyong sinuri sa gawain?',
                'Anong paunang konklusyon ang mabubuo ninyo mula sa pagtuklas?',
              ]
            : [
                'What key patterns or details did your group discover from the task card?',
                'How do the elements in the scenario relate to one another?',
                'What initial conclusion can your group draw from your investigation?',
              ],
        },
        {
          phase: isFil ? '3. EXPERIENCE (Karanasan)' : '3. EXPERIENCE',
          activityTitle: isFil ? 'Lapat-Dunong: Ginabayang Pagsasagawa' : 'Concept in Action: Guided Application Task',
          activityDescription: isFil
            ? `Matapos talakayin ang Concept Notes ng aralin, gagawa ang mga mag-aaral ng isang kongkretong pagsasanay o awtput na naglalapat ng "${derivedComp}". Gagabayan ng guro ang klase at magbibigay ng agarang puna habang isinasagawa ang gawain.${cotTag(2)}`
            : `Following the interactive discussion of the Concept Notes, learners complete a structured application task demonstrating "${derivedComp}". The teacher circulates to scaffold understanding and provide timely, constructive feedback.${cotTag(2)}`,
          processQuestions: isFil
            ? [
                'Paano ninyo ginamit ang mga konsepto mula sa talakayan upang mabuo ang inyong gawain?',
                'Aling hakbang sa pagsasagawa ang nakatulong upang maging wasto ang inyong sagot?',
                'Paano ninyo matitiyak na tama at kumpleto ang inyong ginawang awtput?',
              ]
            : [
                'How did you apply the rules from our Concept Notes to complete the task?',
                'Which step was most important in arriving at an accurate output?',
                'How can you verify that your solution or output is complete and accurate?',
              ],
        },
        {
          phase: isFil ? '4. EMPATHIZE (Pakikiramay)' : '4. EMPATHIZE',
          activityTitle: isFil ? 'Puso at Isip: Pag-uugnay sa Buhay at Kapwa' : 'Heart & Mind: Real-Life Value Reflection',
          activityDescription: isFil
            ? `agninilayan ng mga mag-aaral kung paano makatutulong ang "${derivedComp}" sa pagpapabuti ng kanilang sariling pagpapasya at pakikitungo sa kapwa o komunidad. Magbabahagi ang ilang mag-aaral ng kanilang pangako sa pagsasabuhay ng aralin.${cotTag(3)}`
            : `Learners reflect on how understanding "${derivedComp}" helps them make responsible choices and positively impact others in their home, school, or community. Volunteers share a brief personal takeaway with the class.${cotTag(3)}`,
          processQuestions: isFil
            ? [
                'Paano makatutulong ang araling ito sa inyong pang-araw-araw na pagpapasya?',
                'Bakit mahalagang isaalang-alang ang kapakanan ng kapwa sa paggamit ng ating natutuhan?',
                'Sa anong tiyak na paraan mo maisasabuhay ang aralin sa inyong tahanan o komunidad?',
              ]
            : [
                'How can today’s lesson guide your everyday decisions at home or in school?',
                'Why does this concept matter for the well-being of our community and others?',
                'What is one concrete way you will practice what you learned today?',
              ],
        },
      ],
    };

    const i1Content = isFil
      ? `Pamantayang Pangnilalaman: ${derivedContentStd}\n\nPamantayan sa Pagganap: ${derivedPerfStd}\n\nKasanayang Pampagkatuto: ${derivedComp}${cotTag(0)}`
      : `Content Standard: ${derivedContentStd}\n\nPerformance Standard: ${derivedPerfStd}\n\nLearning Competency: ${derivedComp}${cotTag(0)}`;

    const a1Content = isFil
      ? `Panuto at Akomodasyon sa mga Mag-aaral: Basahin at unawaing mabuti ang bawat tanong. Piliin ang titik ng tamang sagot. (Para sa mga mag-aaral na nangangailangan ng karagdagang gabay, maaaring gumamit ng visual cue card o basahin nang malakas ang tanong.) Magbigay ng agarang positibo at nakatutulong na puna.${cotTag(4)}\n\n1. Ano ang pangunahing layunin at diwa ng paksang "${derivedComp}" na tinalakay sa ${dayLabel}?\nA. Matukoy at mailapat ang wastong konsepto sa pagsusuri ng sitwasyon\nB. Maisaulo lamang ang mga salita nang walang pag-unawa\nC. Iwasan ang pagsusuri ng mga halimbawa sa tunay na buhay\nD. Limitahan ang paggamit ng kaalaman sa loob lamang ng silid-aralan\n\n2. Alin sa sumusunod ang nagpapakita ng wastong hakbang sa pagsusuri ng sitwasyon gamit ang natutuhang konsepto?\nA. Pag-uugnay ng batayang prinsipyo sa konkretong ebidensya at halimbawa\nB. Pagbibigay ng konklusyon nang walang batayan\nC. Pagsasantabi sa mahahalagang terminolohiya ng aralin\nD. Pagpili ng sagot nang hindi sinusuri ang tanong\n\n3. Paano naipakikita sa gawaing pagsasanay ang kasanayang saykomotor kaugnay ng aralin?\nA. Sa pamamagitan ng maayos at wastong pagbuo ng awtput batay sa pamantayan\nB. Sa pamamagitan ng pakikinig lamang nang walang gawain\nC. Sa pamamagitan ng pagkopya ng gawa ng iba nang walang pagsusuri\nD. Sa pamamagitan ng pag-iwas sa pangkatang gawain\n\n4. Sa anong paraan nagiging makabuluhan ang aralin sa pang-araw-araw na buhay ng mag-aaral?\nA. Nagagamit ito sa responsableng pagpapasya at pagtulong sa komunidad\nB. Nanatili lamang itong teorya sa kuwaderno\nC. Hindi ito nakaaapekto sa pakikipagkapwa\nD. Ginagamit lamang ito tuwing may pagsusulit\n\n5. Ano ang pinakamahalagang paglalahat na mabubuo mula sa ating talakayan ngayong araw?\nA. Ang pag-unawa sa konsepto ay pundasyon ng matalinong pagsasagawa at pagsasabuhay\nB. Hindi magkaugnay ang kaalaman at praktikal na gawain\nC. Sapat na ang unang obserbasyon nang walang malalim na pagsusuri\nD. Walang kaugnayan ang aralin sa iba pang larangan\n\nSusi sa Pagwawasto (Answer Key):\n1. A\n2. A\n3. A\n4. A\n5. A`
      : `Directions & Learner Accommodations: Read each item carefully and choose the letter of the best answer. (Learners with diverse needs may use visual organizers, read-aloud support, or extended response time.) Provide timely and constructive feedback during checking.${cotTag(4)}\n\n1. Which statement best describes the core principle of "${derivedComp}" emphasized in ${dayLabel}?\nA. Understanding and applying the concept to analyze authentic situations accurately\nB. Memorizing isolated terms without connecting them to examples\nC. Ignoring evidence when evaluating a classroom scenario\nD. Restricting the concept to theoretical definitions only\n\n2. When analyzing a problem or scenario using today's lesson, which step is most essential?\nA. Connecting the governing rule and key terms directly to the given evidence\nB. Guessing the outcome without examining the context\nC. Skipping the concept notes and criteria\nD. Relying on unverified assumptions\n\n3. How is mastery of the psychomotor skill demonstrated during the guided practice activity?\nA. By accurately constructing and presenting the required learning output according to criteria\nB. By passively observing without participating in the task\nC. By leaving the graphic organizer incomplete\nD. By omitting the process questions\n\n4. Why is it important to connect "${derivedComp}" to real-life situations in the Empathize phase?\nA. It empowers learners to make responsible decisions that benefit their community\nB. It replaces the need to understand core vocabulary\nC. It is only useful for classroom grading\nD. It separates academic learning from daily values\n\n5. Which generalization best summarizes the key takeaway of today's session?\nA. Deep conceptual understanding supports accurate application and meaningful real-world action\nB. Concepts operate independently of real-world examples\nC. Surface recall is sufficient for solving complex problems\nD. Reflection is unrelated to skill mastery\n\nAnswer Key:\n1. A\n2. A\n3. A\n4. A\n5. A`;

    const sections = [
      {
        id: 'I1',
        title: isFil ? 'I1. Kompetensya sa Pagkatuto at Pamantayan sa Kurikulum' : 'I1. Learning Competency and Curriculum Standards',
        content: i1Content,
        relatedIndicators: isCO ? selectedCodes.slice(0, 2) : undefined,
      },
      {
        id: 'I2',
        title: isFil ? 'I2. Mga Layunin sa Pagkatuto' : 'I2. Learning Objectives',
        content: '',
        relatedIndicators: isCO ? selectedCodes.slice(0, 2) : undefined,
      },
      {
        id: 'I3',
        title: isFil ? 'I3. Konteksto ng mga Mag-aaral' : 'I3. Learner Context',
        content: isFil
          ? `Ang mga mag-aaral ay may iba't ibang antas ng kahandaan, karanasan, at istilo ng pagkatuto (visual, auditory, at kinesthetic). Marami sa kanila ang aktibong natututo kapag ang mga halimbawa ay hango sa kanilang lokal na komunidad at pang-araw-araw na karanasan. Magbibigay ng scaffolding at pangkatang suporta upang matugunan ang pangangailangan ng bawat mag-aaral.${cotTag(1)}`
          : `Learners bring diverse prior knowledge, cultural backgrounds, and learning modalities (visual, auditory, and kinesthetic). They engage best when concepts are anchored in relatable community scenarios and collaborative inquiry. Differentiated scaffolding and visual prompts are provided to address potential barriers to comprehension.${cotTag(1)}`,
        relatedIndicators: isCO ? selectedCodes.slice(0, 2) : undefined,
      },
      {
        id: 'L1',
        title: isFil ? 'L1. Paghahanda bago ang Aralin' : 'L1. Pre-Lesson',
        content: isFil
          ? `1. Panalangin, pagbati, at pagtatala ng liban.\n2. Pagpapaalala sa mga alituntunin para sa ligtas, maayos, at magalang na silid-aralan.\n3. Maikling balik-aral at pag-uugnay ng nakaraang talakayan sa bagong paksa (${dayLabel}).${cotTag(2)}`
          : `1. Classroom routine: greeting, attendance check, and wellness check-in.\n2. Establishing a safe, fair, and respectful learning environment and reviewing group collaboration norms.\n3. Quick review of prior concepts and bridging to today's focus (${dayLabel}).${cotTag(2)}`,
        relatedIndicators: isCO ? selectedCodes.slice(0, 2) : undefined,
      },
      {
        id: 'L2',
        title: isFil ? 'L2. Daloy ng Aralin' : 'L2. Flow',
        content: '',
        relatedIndicators: isCO ? selectedCodes : undefined,
      },
      {
        id: 'L3',
        title: isFil ? 'L3. Mga Kagamitang Panturo' : 'L3. Learning Resources / Materials',
        content: isFil
          ? `• Mga Kagamitan sa Gawain: Visual aids/Slide deck, Concept Notes handout, Activity Task Cards, Graphic Organizer, Manila paper, at marker.\n• Sanggunian: Gabay Pangkurikulum ng DepEd, Modyul ng Mag-aaral, at patnubay ng guro.\n• Alternatibong Kagamitan (Contingency): Paggamit ng pisara, chalk, at nakalimbag na worksheet kung walang kuryente o projector.${cotTag(3)}`
          : `• Activity & Instructional Materials: Presentation slides / visual charts, Concept Notes summary sheet, Group Inquiry Task Cards, Graphic Organizers, chart paper, and markers.\n• References: DepEd Curriculum Guide, Learner's Material, and Teacher's Guide.\n• Contingency / Low-Tech Alternative: Board-drawn concept maps and printed task strips in case projection equipment is unavailable.${cotTag(3)}`,
        relatedIndicators: isCO ? selectedCodes.slice(0, 2) : undefined,
      },
      {
        id: 'L4',
        title: isFil ? 'L4. Mga Pagkakataon para sa Integrasyon' : 'L4. Opportunities for Integration',
        content: isFil
          ? `• Integrasyon sa Ibang Asignatura: Pag-uugnay sa kasanayan sa Pagbasa at Pagsulat (Literacy), pagsusuri ng datos o pagkakasunod-sunod (Numeracy), at Edukasyon sa Pagpapakatao / Araling Panlipunan.\n• Pagpapahalaga: Mapanuring pag-iisip, pakikipagtulungan, at pagmamalasakit sa komunidad.${cotTag(0)}`
          : `• Cross-Curricular Integration: Literacy (reading comprehension and academic vocabulary), Numeracy (logical sequencing and pattern analysis), and Values Education / Social Studies (civic responsibility).\n• 21st-Century Skills: Critical thinking, collaborative communication, and ethical decision-making.${cotTag(0)}`,
        relatedIndicators: isCO ? selectedCodes.slice(0, 2) : undefined,
      },
      {
        id: 'A1',
        title: isFil ? 'A1. Pormatibong Pagtataya' : 'A1. Formative Assessment',
        content: a1Content,
        relatedIndicators: isCO ? selectedCodes.slice(-2) : undefined,
      },
      {
        id: 'W1',
        title: isFil ? 'W1. Pinalawak na Opurtunidad sa Pagkatuto' : 'W1. Extended Learning Opportunities',
        content: isFil
          ? `Takdang-Gawain / Pagsasagawa sa Bahay: Magtala ng dalawang (2) konkretong sitwasyon sa inyong tahanan o komunidad kung saan nakikita o nagagamit ang "${derivedComp}". Ipaliwanag sa 3-4 na pangungusap kung paano nakatulong ang aralin sa inyong pagsusuri.${cotTag(1)}`
          : `Extension / Home Application Task: Observe and document two (2) real-life examples at home or in your neighborhood where "${derivedComp}" applies. Write a short 3–4 sentence reflection explaining how today's concept helps you understand or improve that situation.${cotTag(1)}`,
        relatedIndicators: isCO ? selectedCodes.slice(0, 2) : undefined,
      },
      {
        id: 'W2',
        title: isFil ? 'W2. Mga Pagninilay ng Guro' : 'W2. Reflections',
        content: isFil
          ? `• Bilang ng mag-aaral na nakakuha ng 80% pataas sa pormatibong pagtataya: ___\n• Bilang ng mag-aaral na nangangailangan ng remediation: ___\n• Aling estratehiya sa Daloy (Engage, Explore, Experience, Empathize) ang pinakaepektibo? ___\n• Anong tulong o suporta mula sa Master Teacher / Punongguro ang makatutulong sa susunod na sesyon? ___`
          : `• Number of learners who earned 80% and above on the formative assessment: ___\n• Number of learners who require additional remediation/scaffolding: ___\n• Which instructional strategy in the 4-phase Flow (Engage, Explore, Experience, Empathize) worked best? ___\n• What technical assistance or coaching support from peers/instructional leaders can further enrich this lesson? ___`,
        relatedIndicators: isCO ? selectedCodes.slice(0, 1) : undefined,
      },
    ];

    const cotAlignments = isCO && stageInfo
      ? selectedCodes.map((code, idx) => ({
          code,
          indicator: ALL_COT_INDICATORS[code] || `COT Indicator ${code}`,
          sectionApplied: idx % 2 === 0 ? 'I1, L2 (Engage & Experience), L4' : 'I3, L1, L2 (Explore & Empathize), A1',
          observableEvidence: isFil
            ? `Naipamamalas ng guro at mga mag-aaral ang ${ALL_COT_INDICATORS[code] || code} sa pamamagitan ng aktibong talakayan, ginabayang pagsusuri, at agarang puna na nakaayon sa ${stageInfo.label} (Target Level ${stageInfo.targetLevel}).`
            : `Teacher and learners visibly demonstrate ${ALL_COT_INDICATORS[code] || code} through structured inquiry, differentiated scaffolding, and constructive feedback calibrated to ${stageInfo.label} (Target Level ${stageInfo.targetLevel}).`,
        }))
      : undefined;

    days.push({
      day: d,
      objectives,
      flowDetails,
      sections,
      cotAlignments,
    });
  }

  return {
    competency: derivedComp,
    contentStandard: derivedContentStd,
    performanceStandard: derivedPerfStd,
    days,
  };
}

function formatApiError(error: any): string {
  const raw = error?.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
  if (
    raw.includes('429') ||
    raw.includes('RESOURCE_EXHAUSTED') ||
    raw.includes('ResourceExhausted') ||
    raw.includes('Quota exceeded') ||
    raw.includes('quota')
  ) {
    return 'The AI service temporarily reached its request limit or is busy. Please wait a moment and try again.';
  }
  return raw || 'Failed to process request.';
}

export const app = express();

// Use a higher JSON limit because PDF texts can be large
app.use(express.json({ limit: '15mb' }));

// API route for generating lesson plan
  app.post("/api/generate-lesson-plan", async (req, res) => {
    try {
      const {
        competency,
        contentStandard,
        performanceStandard,
        numberOfDays,
        language,
        pdfText,
        integrateObjectives,
        coReadyConfig,
      } = req.body;
      
      const ai = getAi();

      const TEACHER_STAGE_MAP: Record<string, { label: string; careerStage: string; scale: string; targetLevel: number; expectation: string }> = {
        TI_TIII: {
          label: 'Teacher I–III',
          careerStage: 'Proficient Teacher A (TI–TIII)',
          scale: '2, 3, 4, 5, 6 (NO = 2)',
          targetLevel: 6,
          expectation: 'Demonstrate consistent, independent proficiency and effective learner engagement across classroom activities to merit Level 6.'
        },
        TIV_TVII: {
          label: 'Teacher IV–VII',
          careerStage: 'Proficient Teacher B (TIV–TVII)',
          scale: '3, 4, 5, 6, 7 (NO = 3)',
          targetLevel: 7,
          expectation: 'Demonstrate advanced proficient teaching, seamless transitions, and learner-centered strategies to merit Level 7.'
        },
        MTI_MTII: {
          label: 'Master Teacher I–II',
          careerStage: 'Highly Proficient Teacher (MT I–MT II)',
          scale: '4, 5, 6, 7, 8 (NO = 4)',
          targetLevel: 8,
          expectation: 'Demonstrate highly proficient, model-level pedagogy with collaborative inquiry, deep scaffolding, and exemplary differentiation to merit Level 8.'
        },
        MTIII_MTV: {
          label: 'Master Teacher III–V',
          careerStage: 'Distinguished Teacher (MT III–MT V)',
          scale: '5, 6, 7, 8, 9 (NO = 5)',
          targetLevel: 9,
          expectation: 'Demonstrate distinguished, innovative, and transformative instructional practices that empower learner autonomy, peer leadership, and metacognition to merit Level 9.'
        }
      };

      const ALL_COT_INDICATORS: Record<string, string> = {
        '1.1.2': '1. Apply knowledge of content within and across curriculum teaching areas (1.1.2)',
        '1.4.2': '2. Use a range of teaching strategies that enhance learner achievement in literacy and numeracy skills (1.4.2)',
        '1.5.2': '3. Apply a range of teaching strategies to develop critical and creative thinking, as well as other higher-order thinking skills (1.5.2)',
        '1.6.2': '4. Display proficient use of Mother Tongue, Filipino and English to facilitate teaching and learning (1.6.2)',
        '2.1.2': '5. Establish safe and secure learning environments to enhance learning through the consistent implementation of policies, guidelines and procedures (2.1.2)',
        '2.2.2': '6. Maintain learning environments that promote fairness, respect and care to encourage learning (2.2.2)',
        '3.2.2': "7. Establish a learner-centered culture by using teaching strategies that respond to learners' linguistic, cultural, socio-economic and religious backgrounds (3.2.2)",
        '3.5.2': '8. Adapt and use culturally appropriate teaching strategies to address the needs of learners from indigenous groups (3.5.2)',
        '5.3.2': '9. Use strategies for providing timely, accurate and constructive feedback to improve learner performance (5.3.2)',
      };
      
      const isFilipinoLang = language === 'Tagalog' || language === 'Filipino';

      const convertFilipinoObjectiveVerbToN = (rawObj: string, domainLabel?: string): string => {
        let text = rawObj.trim();
        // Strip leading bullets or numbers like "1. ", "• ", "- "
        text = text.replace(/^(?:[\d]+[.)]|[-•*])\s*/, '');
        // Strip existing domain prefix if present so we can normalize the verb cleanly
        const domainRegex = /^(?:\*\*?)?(?:1\.|2\.|3\.)?\s*(?:Kognitibo|Saykomotor|Apektibo|Cognitive|Psychomotor|Affective)(?:\s*\([^)]*\))?(?:\*\*?)?\s*[:\-–—]\s*/i;
        text = text.replace(domainRegex, '').trim();

        if (isFilipinoLang) {
          const verbMap: [RegExp, string][] = [
            [/^Matutukoy\b/i, 'Natutukoy'],
            [/^Matukoy\b/i, 'Natutukoy'],
            [/^Maipapaliwanag\b/i, 'Naipapaliwanag'],
            [/^Maipaliwanag\b/i, 'Naipapaliwanag'],
            [/^Masusuri\b/i, 'Nasusuri'],
            [/^Masuri\b/i, 'Nasusuri'],
            [/^Maihahambing\b/i, 'Naihahambing'],
            [/^Maihambing\b/i, 'Naihahambing'],
            [/^Mailalarawan\b/i, 'Nailalarawan'],
            [/^Mailarawan\b/i, 'Nailalarawan'],
            [/^Maiisa-isa\b/i, 'Naiisa-isa'],
            [/^Makikilala\b/i, 'Nakikilala'],
            [/^Makilala\b/i, 'Nakikilala'],
            [/^Mabibigyang-kahulugan\b/i, 'Nabibigyang-kahulugan'],
            [/^Mabigyang-kahulugan\b/i, 'Nabibigyang-kahulugan'],
            [/^Maisasagawa\b/i, 'Naisasagawa'],
            [/^Maisagawa\b/i, 'Naisasagawa'],
            [/^Makabubuo\b/i, 'Nakabubuo'],
            [/^Makabuo\b/i, 'Nakabubuo'],
            [/^Makagagawa\b/i, 'Nakagagawa'],
            [/^Makagawa\b/i, 'Nakagagawa'],
            [/^Maipapakita\b/i, 'Naipapakita'],
            [/^Maipakita\b/i, 'Naipapakita'],
            [/^Makasusulat\b/i, 'Nakasusulat'],
            [/^Makasulat\b/i, 'Nakasusulat'],
            [/^Maisasadula\b/i, 'Naisasadula'],
            [/^Maisadula\b/i, 'Naisasadula'],
            [/^Magagamit\b/i, 'Nagagamit'],
            [/^Magamit\b/i, 'Nagagamit'],
            [/^Mapahahalagahan\b/i, 'Napahahalagahan'],
            [/^Mapapahalagahan\b/i, 'Napahahalagahan'],
            [/^Mapahalagahan\b/i, 'Napahahalagahan'],
            [/^Maipamamalas\b/i, 'Naipamamalas'],
            [/^Maipapamalas\b/i, 'Naipamamalas'],
            [/^Maipamalas\b/i, 'Naipamamalas'],
            [/^Makapagpapakita\b/i, 'Nakapagpapakita'],
            [/^Makapagpakita\b/i, 'Nakapagpapakita'],
            [/^Maisasabuhay\b/i, 'Naisasabuhay'],
            [/^Maisabuhay\b/i, 'Naisasabuhay'],
            [/^Makapagbabahagi\b/i, 'Nakapagbabahagi'],
            [/^Makapagbahagi\b/i, 'Nakapagbabahagi'],
            [/^Maipahahayag\b/i, 'Naipahahayag'],
            [/^Maipapahayag\b/i, 'Naipahahayag'],
            [/^Maipahayag\b/i, 'Naipahahayag'],
          ];
          for (const [pattern, replacement] of verbMap) {
            if (pattern.test(text)) {
              text = text.replace(pattern, replacement);
              break;
            }
          }
          // General fallback: if the first word in Filipino starts with "Ma" or "Mag" (e.g., Matatalakay -> Natatalakay), convert leading M to N
          text = text.replace(/^M(a[a-zA-Z\-]+)/, 'N$1').replace(/^m(a[a-zA-Z\-]+)/, 'N$1');
        }

        return domainLabel ? `${domainLabel}: ${text}` : text;
      };

      const isCOModeRequested = Boolean(coReadyConfig && coReadyConfig.enabled);

      const stripCOTFromText = (text: string): string => {
        if (!text) return '';
        return text
          .replace(/\s*\(MELC\)/gi, '')
          .replace(/\[(?:Related\s+)?COT\s+Indicator[^\]]*\]\s*/gi, '')
          .replace(/\((?:Related\s+)?COT\s+Indicator[^)]*\)\s*/gi, '')
          .replace(/^\s*(?:Kaugnay\s+na\s+COT\s+Indicator|Related\s+COT\s+Indicator)[^\n]*\n?/gim, '')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
      };

      const formatDetailedL2Flow = (day: any, fallbackL2Content: string): string => {
        const fd = day?.flowDetails;
        if (!fd || (!fd.conceptNotes && (!Array.isArray(fd.activities) || fd.activities.length === 0))) {
          return isCOModeRequested ? fallbackL2Content : stripCOTFromText(fallbackL2Content || '');
        }

        const cn = fd.conceptNotes || {};
        // Filter out any "Write" / "Pagsulat" phase and keep only the 4 phases: Engage, Explore, Experience, Empathize
        const rawActivities: any[] = Array.isArray(fd.activities) ? fd.activities : [];
        const activities = rawActivities
          .filter((act: any) => !/\b5\.\s*write\b|^write\b|\bpagsulat\b/i.test(String(act?.phase || '').trim()))
          .slice(0, 4);

        const cleanStr = (val: string) =>
          isCOModeRequested ? (val || '').trim() : stripCOTFromText(val || '');

        const cleanShortQuestion = (q: string) => {
          const base = cleanStr(q)
            .replace(/^\d+[.)]\s*/, '')
            .replace(/\s*\((?:Expected\s+Answer|Expected\s+Response|Possible\s+Answer|Inaasahang\s+Sagot|Sagot)[^)]*\)\s*$/i, '')
            .trim();
          return base;
        };

        // Build Concept Notes Block
        const cnBlocks: string[] = [];
        const cnHeader = isFilipinoLang
          ? '================================================================\nMGA TALA NG KONSEPTO NG ARALIN (CONCEPT NOTES OF THE LESSON)\n================================================================'
          : '================================================================\nCONCEPT NOTES OF THE LESSON\n================================================================';
        cnBlocks.push(cnHeader);

        if (cn.topicTitle) {
          cnBlocks.push(`${isFilipinoLang ? '• Paksa ng Aralin' : '• Lesson Topic'}: ${cleanStr(cn.topicTitle)}`);
        }

        if (Array.isArray(cn.keyTerms) && cn.keyTerms.length > 0) {
          const termsHeader = isFilipinoLang
            ? '\n• Mahahalagang Terminolohiya at Kahulugan:'
            : '\n• Key Terms & Definitions:';
          const termsList = cn.keyTerms
            .map((t: string) => `  - ${cleanStr(t)}`)
            .join('\n');
          cnBlocks.push(`${termsHeader}\n${termsList}`);
        }

        if (cn.detailedDiscussion) {
          const discHeader = isFilipinoLang
            ? '\n• Talakayan ng Konsepto ng Aralin:'
            : '\n• Lesson Concept Discussion:';
          cnBlocks.push(`${discHeader}\n${cleanStr(cn.detailedDiscussion)}`);
        }

        if (Array.isArray(cn.illustrativeExamples) && cn.illustrativeExamples.length > 0) {
          const exHeader = isFilipinoLang
            ? '\n• Mga Halimbawa:'
            : '\n• Examples:';
          const exList = cn.illustrativeExamples
            .map((ex: string, idx: number) => `  ${idx + 1}. ${cleanStr(ex)}`)
            .join('\n');
          cnBlocks.push(`${exHeader}\n${exList}`);
        }

        if (cn.keyTakeaways) {
          const takeHeader = isFilipinoLang
            ? '\n• Mahahalagang Kaisipan (Paglalahat):'
            : '\n• Key Takeaway:';
          cnBlocks.push(`${takeHeader}\n  ${cleanStr(cn.keyTakeaways)}`);
        }

        cnBlocks.push('================================================================');
        const formattedConceptNotes = cnBlocks.join('\n');

        const defaultPhaseTitles = isFilipinoLang
          ? [
              '1. ENGAGE (Pag-engganyo)',
              '2. EXPLORE (Pagtuklas)',
              '3. EXPERIENCE (Karanasan)',
              '4. EMPATHIZE (Pakikiramay)',
            ]
          : [
              '1. ENGAGE',
              '2. EXPLORE',
              '3. EXPERIENCE',
              '4. EMPATHIZE',
            ];

        const phaseSections: string[] = [];
        let conceptNotesInserted = false;

        activities.forEach((act: any, idx: number) => {
          const phaseTitle = cleanStr(act.phase) || defaultPhaseTitles[idx] || `Phase ${idx + 1}`;
          const isExperiencePhase =
            idx === 2 || /experience|karanasan/i.test(phaseTitle);

          const lines: string[] = [];
          lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${phaseTitle.toUpperCase()}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

          // Insert Concept Notes right at the beginning of Phase 3 (Experience)
          if (isExperiencePhase && !conceptNotesInserted) {
            lines.push(formattedConceptNotes);
            conceptNotesInserted = true;
          }

          const actTitle = cleanStr(act.activityTitle || '');
          const actBody = cleanStr(act.activityDescription || act.procedure || '');

          if (actTitle && actBody) {
            lines.push(`${isFilipinoLang ? '▶ Gawain' : '▶ Activity'}: ${actTitle}\n${actBody}`);
          } else if (actTitle) {
            lines.push(`${isFilipinoLang ? '▶ Gawain' : '▶ Activity'}: ${actTitle}`);
          } else if (actBody) {
            lines.push(actBody);
          }

          if (Array.isArray(act.processQuestions) && act.processQuestions.length > 0) {
            const pqHeader = isFilipinoLang
              ? '▶ Mga Pamprosesong Tanong:'
              : '▶ Process Questions:';
            const pqList = act.processQuestions
              .map((q: string, qIdx: number) => `  ${qIdx + 1}. ${cleanShortQuestion(q)}`)
              .join('\n');
            lines.push(`${pqHeader}\n${pqList}`);
          }

          phaseSections.push(lines.join('\n\n'));
        });

        if (!conceptNotesInserted) {
          phaseSections.unshift(formattedConceptNotes);
        }

        return phaseSections.join('\n\n\n');
      };

      const normalizeDayObjectives = (day: any) => {
        const domainLabels = isFilipinoLang
          ? ['Kognitibo', 'Saykomotor', 'Apektibo']
          : ['Cognitive', 'Psychomotor', 'Affective'];

        const rawList: string[] = Array.isArray(day.objectives) && day.objectives.length > 0
          ? day.objectives
          : [];

        const normalizedThree = domainLabels.map((label, idx) => {
          const item = rawList[idx] || '';
          return item ? convertFilipinoObjectiveVerbToN(item, label) : `${label}: `;
        });

        const cStd = typeof contentStandard === 'string' ? contentStandard.trim() : '';
        const pStd = typeof performanceStandard === 'string' ? performanceStandard.trim() : '';
        const compText = typeof competency === 'string' ? competency.trim() : '';

        // Collect any materials from flowDetails so they are placed in L3 (Materials / Learning Resources section)
        const extraMaterials: string[] = [];
        if (Array.isArray(day?.flowDetails?.lessonMaterials)) {
          day.flowDetails.lessonMaterials.forEach((m: string) => {
            if (m && m.trim()) extraMaterials.push(m.trim());
          });
        }
        if (Array.isArray(day?.flowDetails?.activities)) {
          day.flowDetails.activities.forEach((act: any) => {
            if (act?.materials && String(act.materials).trim()) {
              extraMaterials.push(String(act.materials).trim());
            }
          });
        }

        // Also ensure I2 section content lists these exact 3 normalized objectives, and I1 includes provided standards
        const sectionLetters = ['I1', 'I2', 'I3', 'L1', 'L2', 'L3', 'L4', 'A1', 'W1', 'W2'];
        let sections = Array.isArray(day.sections) ? day.sections : [];
        sections = sections.map((section: any, index: number) => {
          const secId = index < sectionLetters.length ? sectionLetters[index] : section.id;
          if (secId === 'I1') {
            let i1Text = (isCOModeRequested ? (section.content || '') : stripCOTFromText(section.content || '')).replace(/\s*\(MELC\)/gi, '');
            if (cStd || pStd) {
              const cLabel = isFilipinoLang ? 'Pamantayang Pangnilalaman' : 'Content Standard';
              const pLabel = isFilipinoLang ? 'Pamantayan sa Pagganap' : 'Performance Standard';
              const mLabel = isFilipinoLang ? 'Kasanayang Pampagkatuto' : 'Learning Competency';
              const prefixLines: string[] = [];
              if (cStd && !i1Text.includes(cStd)) {
                prefixLines.push(`${cLabel}: ${cStd}`);
              }
              if (pStd && !i1Text.includes(pStd)) {
                prefixLines.push(`${pLabel}: ${pStd}`);
              }
              if (compText && !i1Text.includes(compText) && prefixLines.length > 0) {
                prefixLines.push(`${mLabel}: ${compText}`);
              }
              if (prefixLines.length > 0) {
                i1Text = `${prefixLines.join('\n\n')}${i1Text ? `\n\n${i1Text}` : ''}`;
              }
            }
            return {
              ...section,
              id: secId,
              content: i1Text,
              relatedIndicators: isCOModeRequested ? section.relatedIndicators : undefined,
            };
          }
          if (secId === 'I2') {
            const formattedI2 = normalizedThree
              .map((obj, i) => `${i + 1}. ${obj}`)
              .join('\n');
            return {
              ...section,
              id: secId,
              content: formattedI2,
              relatedIndicators: isCOModeRequested ? section.relatedIndicators : undefined,
            };
          }
          if (secId === 'L2') {
            const detailedL2 = formatDetailedL2Flow(day, section.content || '');
            return {
              ...section,
              id: secId,
              content: detailedL2,
              relatedIndicators: isCOModeRequested ? section.relatedIndicators : undefined,
            };
          }
          if (secId === 'L3') {
            let l3Text = isCOModeRequested ? (section.content || '') : stripCOTFromText(section.content || '');
            const uniqueMissingMats = Array.from(new Set(extraMaterials)).filter(
              m => m && !l3Text.toLowerCase().includes(m.toLowerCase())
            );
            if (uniqueMissingMats.length > 0) {
              const matHeader = isFilipinoLang
                ? 'Mga Kagamitan sa mga Gawain (Activity Materials):'
                : 'Activity Materials Needed:';
              const matBullets = uniqueMissingMats.map(m => `• ${m}`).join('\n');
              l3Text = `${matHeader}\n${matBullets}${l3Text ? `\n\n${l3Text}` : ''}`;
            }
            return {
              ...section,
              id: secId,
              content: l3Text,
              relatedIndicators: isCOModeRequested ? section.relatedIndicators : undefined,
            };
          }
          return {
            ...section,
            id: secId,
            content: isCOModeRequested ? section.content : stripCOTFromText(section.content || ''),
            relatedIndicators: isCOModeRequested ? section.relatedIndicators : undefined,
          };
        });

        return {
          ...day,
          objectives: normalizedThree,
          soloObjectives: undefined,
          hotsObjectives: undefined,
          cotAlignments: isCOModeRequested ? day.cotAlignments : undefined,
          sections,
        };
      };

      const getSystemInstruction = (lang: string, hasPdf: boolean, hasComp: boolean, integrateObj: boolean, coConfig?: any) => {
          const isFil = lang === 'Tagalog' || lang === 'Filipino';
          let instruction = `You are an expert curriculum designer for the Philippines' Department of Education (DepEd). Your task is to generate a complete, high-quality lesson plan in ${isFil ? 'Filipino (Tagalog)' : 'English'} following the modern DepEd Order No. 016, s. 2026 "ILAW" framework.`;

          if (hasPdf && !hasComp) {
              instruction += `\n\nYou will be provided with reference material from a PDF. Your FIRST task is to analyze this text and determine the most appropriate Content Standard, Performance Standard, and Learning Competency. Then, using those determined standards, you must create a structured lesson plan that spans the requested number of days.`;
          } else {
              instruction += `\n\nYou will be given curriculum standards (Content Standard, Performance Standard, and/or Learning Competency) and a number of days. Based on this, you must create a structured lesson plan that spans the requested number of days.`;
          }

          if (hasPdf) {
              instruction += `\n\nCrucially, you MUST use the content from this reference material as the primary source for examples, discussion points, activities, and evaluation questions. The entire lesson plan must be grounded in and reflect the provided text.`;
          }

          if (isFil) {
              instruction += `\n\nCRITICAL RULE FOR LEARNING OBJECTIVES (ONLY 3 OBJECTIVES PER DAY — KOGNITIBO, SAYKOMOTOR, APEKTIBO):
For EACH day, you MUST generate ONLY THREE (3) specific, measurable learning objectives in Filipino in the "objectives" array and in section "I2", corresponding strictly to the three learning domains in this exact order:
  1. Kognitibo — Kaalaman, pag-unawa, at mapanuring pagsusuri${integrateObj ? ' (integrating SOLO Relational/Extended Abstract & HOTS Analyzing/Evaluating)' : ''}.
  2. Saykomotor — Praktikal na paglalapat, pagsasagawa, pagbuo, o kasanayan${integrateObj ? ' (integrating HOTS Applying/Creating)' : ''}.
  3. Apektibo — Pagpapahalaga, saloobin, pakikiramay, o pagsasabuhay sa tunay na buhay.
Do NOT generate more than 3 objectives per day.

CRITICAL FILIPINO / TAGALOG OBJECTIVE VERB RULE (START WITH "N", NEVER "M"):
When writing the 3 learning objectives (Kognitibo, Saykomotor, Apektibo) in Filipino/Tagalog, EVERY objective action verb MUST start with the letter "N" (present/completed behavioral form) and MUST NEVER start with the letter "M":
  - CORRECT (Starts with N):
    1. Kognitibo: Natutukoy / Naipapaliwanag / Nasusuri / Naihahambing / Nailalarawan...
    2. Saykomotor: Naisasagawa / Nakabubuo / Nakagagawa / Naipapakita / Nakasusulat...
    3. Apektibo: Napahahalagahan / Naipamamalas / Nakapagpapakita / Naisasabuhay / Naipahahayag...
  - WRONG / FORBIDDEN (Starts with M — NEVER USE THESE):
    Never use Matutukoy, Matukoy, Maipapaliwanag, Maipaliwanag, Masusuri, Masuri, Maisasagawa, Maisagawa, Makabubuo, Makabuo, Mapahahalagahan, Mapahalagahan.`;
          } else {
              instruction += `\n\nCRITICAL RULE FOR LEARNING OBJECTIVES (ONLY 3 OBJECTIVES PER DAY — COGNITIVE, PSYCHOMOTOR, AFFECTIVE):
For EACH day, you MUST generate ONLY THREE (3) specific, measurable learning objectives in English in the "objectives" array and in section "I2", corresponding strictly to the three learning domains in this exact order:
  1. Cognitive — Knowledge, comprehension, critical analysis${integrateObj ? ' (integrating SOLO Relational/Extended Abstract & HOTS Analyzing/Evaluating)' : ''}.
  2. Psychomotor — Practical application, performance, creation, or hands-on skill${integrateObj ? ' (integrating HOTS Applying/Creating)' : ''}.
  3. Affective — Values integration, attitude, empathy, or real-life appreciation.
Do NOT generate more than 3 objectives per day.`;
          }

          instruction += `\n\n2. All ten (10) sub-sections of the DepEd ILAW format grouped under the four core divisions:
    - Division I: Intentions.
      - I1. ${isFil ? 'Kompetensya sa Pagkatuto at Pamantayan sa Kurikulum' : 'Learning Competency and Curriculum Standards'} - clearly write and label the three curriculum standards applicable to the session:
        • ${isFil ? 'Pamantayang Pangnilalaman' : 'Content Standard'}
        • ${isFil ? 'Pamantayan sa Pagganap' : 'Performance Standard'}
        • ${isFil ? 'Kasanayang Pampagkatuto' : 'Learning Competency'}
      - I2. ${isFil ? 'Mga Layunin sa Pagkatuto' : 'Learning Objectives'} - list ONLY the three (3) daily learning objectives: ${isFil ? '1. Kognitibo, 2. Saykomotor, and 3. Apektibo. Ensure every Filipino objective verb after the domain label starts with the letter "N" (e.g., Natutukoy, Naisasagawa, Napahahalagahan) and NEVER "M".' : '1. Cognitive, 2. Psychomotor, and 3. Affective.'}
      - I3. ${isFil ? 'Konteksto ng mga Mag-aaral' : 'Learner Context'} - observations, strengths, interests, and barriers to learning.
    - Division L: Learning Experience.
      - L1. ${isFil ? 'Paghahanda bago ang Aralin' : 'Pre-Lesson'} - how you will help learners get ready for the lesson.
      - L2. ${isFil ? 'Daloy ng Aralin' : 'Flow'} - CRITICAL REQUIREMENT FOR L2 & flowDetails:
        • Do NOT include a "Write" phase in the Flow! The Flow has ONLY FOUR (4) phases: 1. Engage, 2. Explore, 3. Experience, and 4. Empathize.
        • Do NOT put Materials inside L2 (Flow)! Put all activity materials and instructional resources inside Section L3 (${isFil ? 'Mga Kagamitang Panturo' : 'Learning Resources'}).
        • Do NOT write overly complex "Detailed Step-by-Step Activity Procedures"; keep each activity description SIMPLE, CLEAR, and EASY TO UNDERSTAND.
        • Keep the Process Questions SHORT, direct, and concise (2-3 short one-sentence questions per phase, with NO long expected answers).
        • Populate "flowDetails" with BOTH:
          A. CONCEPT NOTES OF THE LESSON ("flowDetails.conceptNotes"):
             - Topic Title: Specific title of the day's lesson concept.
             - Key Terms & Definitions: 3-5 important vocabulary terms/concepts with clear definitions.
             - Detailed Lesson Discussion: Clear, well-organized explanation of the lesson's core concepts, rules, or principles for students' notebooks.
             - Illustrative Examples: 2-3 clear examples illustrating the concept.
             - Key Takeaways: A clear summary/generalization of the lesson.
          B. FOUR (4) SIMPLE & UNDERSTANDABLE CLASSROOM ACTIVITIES ("flowDetails.activities") for the 4 Flow Phases ONLY:
             1. ${isFil ? '1. ENGAGE (Pag-engganyo)' : '1. ENGAGE'}: Activity title, a simple and understandable description of the motivational activity, and 2-3 SHORT ${isFil ? 'Mga Pamprosesong Tanong' : 'Process Questions'}.
             2. ${isFil ? '2. EXPLORE (Pagtuklas)' : '2. EXPLORE'}: Activity title, a simple and understandable description of the discovery/group activity, and 2-3 SHORT ${isFil ? 'Mga Pamprosesong Tanong' : 'Process Questions'}.
             3. ${isFil ? '3. EXPERIENCE (Karanasan)' : '3. EXPERIENCE'}: Activity title, a simple and understandable description of the guided practice/application activity applying the Concept Notes, and 2-3 SHORT ${isFil ? 'Mga Pamprosesong Tanong' : 'Process Questions'}.
             4. ${isFil ? '4. EMPATHIZE (Pakikiramay)' : '4. EMPATHIZE'}: Activity title, a simple and understandable description of the reflection/values integration activity, and 2-3 SHORT ${isFil ? 'Mga Pamprosesong Tanong' : 'Process Questions'}.
      - L3. ${isFil ? 'Mga Kagamitang Panturo' : 'Learning Resources / Materials'} - CRITICAL: List ALL instructional materials, activity materials needed for the Engage/Explore/Experience/Empathize activities, visual aids, worksheets, references (books, toolkits, websites), and contingency/emergency alternatives here in L3.
      - L4. ${isFil ? 'Mga Pagkakataon para sa Integrasyon' : 'Opportunities for integration'} - links to other subjects, special topics, or technology (or ${isFil ? 'WALA' : 'N/A'}).
    - Division A: Assessment.
      - A1. ${isFil ? 'Pormatibong Pagtataya' : 'Formative Assessment'} - CRITICAL: For A1, you MUST include:
        1. Brief directions, feedback channels, and tailored learner accommodations (e.g., visual/auditory supports or varied response formats).
        2. At least five (5) numbered Formative Assessment questions (either Multiple Choice with choices A, B, C, D or Identification) that directly assess and align with the day's 3 Learning Objectives (${isFil ? 'Kognitibo, Saykomotor, Apektibo' : 'Cognitive, Psychomotor, Affective'}).
        3. A complete ${isFil ? 'Susi sa Pagwawasto (Answer Key)' : 'Answer Key'} at the end of A1 listing the correct answers for all 5+ items.
    - Division W: Ways Forward.
      - W1. ${isFil ? 'Pinalawak na Opurtunidad sa Pagkatuto' : 'Extended learning opportunities'} - suggestions for outside-school learning, homework, or remediation tasks.
      - W2. ${isFil ? 'Mga Pagninilay ng Guro' : 'Reflections'} - teacher's insights on coaching help, co-teacher/principal support, and session results.`;

          if (coConfig && coConfig.enabled) {
              const stageInfo = TEACHER_STAGE_MAP[coConfig.teacherType] || TEACHER_STAGE_MAP.TI_TIII;
              const selectedCodes: string[] = Array.isArray(coConfig.selectedIndicators) && coConfig.selectedIndicators.length > 0
                  ? coConfig.selectedIndicators
                  : Object.keys(ALL_COT_INDICATORS);
              const indicatorsListText = selectedCodes
                  .map(code => `      • ${ALL_COT_INDICATORS[code] || code}`)
                  .join('\n');

              instruction += `\n\nCRITICAL — CLASSROOM OBSERVATION (CO-READY) MODE ENABLED (DepEd PMES SY 2026-2027 COT):
You are designing a "CO-Ready" Lesson Plan specifically tailored for:
- Teacher Category: ${stageInfo.label} — ${stageInfo.careerStage}
- COT Rating Scale: ${stageInfo.scale} (Target Highest Rating: Level ${stageInfo.targetLevel})
- Career Stage Expectation: ${stageInfo.expectation}

You MUST explicitly integrate and annotate the following selected COT Indicators throughout the lesson plan:
${indicatorsListText}

Requirements for CO-Ready Mode:
1. EXPLICIT RELATED COT INDICATORS IN EVERY LESSON SECTION & ACTIVITY:
   - In every section (I1, I2, I3, L1, L2, L3, L4, A1, W1, W2) and inside EACH of the 4 activities in "flowDetails.activities" (1. Engage, 2. Explore, 3. Experience, 4. Empathize) and "flowDetails.conceptNotes", explicitly state which COT Indicator(s) that part of the lesson is related to!
   - Format the indicator header/callout clearly inside the lesson text, e.g.:
     "[Related COT Indicator 1 (1.1.2): Apply knowledge of content within and across curriculum teaching areas — Target Level ${stageInfo.targetLevel} for ${stageInfo.label}]"
2. SECTION relatedIndicators ARRAY: For each section in "sections", populate "relatedIndicators" with the array of COT indicator codes (e.g., ["1.1.2", "1.5.2"]) that are directly related to and demonstrated in that section.
3. COT ALIGNMENT MATRIX (cotAlignments): For EACH day, populate the "cotAlignments" array with one entry for every selected COT indicator (${selectedCodes.join(', ')}), specifying the indicator code, indicator title, exact section(s) where it is applied, and concrete observable evidence calibrated to achieve Level ${stageInfo.targetLevel} for ${stageInfo.label}.`;
          } else {
              instruction += `\n\nIMPORTANT: CO-Ready Mode is NOT activated. Do NOT include any COT Indicator codes (such as 1.1.2, 1.4.2, 1.5.2, etc.), COT tags, or Classroom Observation indicator mappings anywhere in the lesson plan text.`;
          }

          instruction += `\n3.  The entire output MUST be a single, valid JSON object that strictly adheres to the provided schema. Do not include any introductory text, explanations, or markdown formatting outside of the JSON structure. The entire output, including all titles and content, MUST be in ${isFil ? 'Filipino (Tagalog)' : 'English'}.`;

          return instruction;
      };

      const sectionProperties: any = {
          id: { type: Type.STRING, description: "The section IDs: 'I1', 'I2', 'I3', 'L1', 'L2', 'L3', 'L4', 'A1', 'W1', 'W2' in order." },
          title: { type: Type.STRING, description: "The title of the section corresponding to the ID." },
          content: {
              type: Type.STRING,
              description: isCOModeRequested
                  ? `The content for this section in ${isFilipinoLang ? 'Filipino' : 'English'}. SPEED & EFFICIENCY RULE: For section 'I2' and section 'L2', set content to "" (empty string) because I2 is automatically populated from 'objectives' and L2 is automatically formatted from 'flowDetails'. For all other sections (I1, I3, L1, L3, L4, A1, W1, W2), provide concise, high-quality classroom content and include '[Related COT Indicator X (Code): Title]' callouts where demonstrated. For L3, list all activity and instructional materials. For A1, provide learner accommodations, 5 numbered questions aligned with the 3 objectives, and the Answer Key.`
                  : `The content for this section in ${isFilipinoLang ? 'Filipino' : 'English'}. SPEED & EFFICIENCY RULE: For section 'I2' and section 'L2', set content to "" (empty string) because I2 is automatically populated from 'objectives' and L2 is automatically formatted from 'flowDetails'. For all other sections (I1, I3, L1, L3, L4, A1, W1, W2), provide concise, high-quality classroom content without any COT Indicator codes. For L3, list all activity and instructional materials. For A1, provide learner accommodations, 5 numbered questions aligned with the 3 objectives, and the Answer Key.`,
          },
      };

      const requiredSectionFields = ['id', 'title', 'content'];
      if (isCOModeRequested) {
          sectionProperties.relatedIndicators = {
              type: Type.ARRAY,
              description: "Array of COT indicator codes (e.g., ['1.1.2', '1.4.2']) that this specific lesson section is related to.",
              items: { type: Type.STRING },
          };
          requiredSectionFields.push('relatedIndicators');
      }

      const dayPlanSchemaProperties: any = {
          day: { type: Type.INTEGER, description: "The day number for this lesson plan (e.g., 1, 2, 3)." },
          objectives: {
              type: Type.ARRAY,
              description: isFilipinoLang
                  ? "EXACTLY THREE (3) daily learning objectives in Filipino in order: [0] Kognitibo, [1] Saykomotor, [2] Apektibo. CRITICAL: In Filipino/Tagalog, EVERY objective verb MUST start with the letter 'N' (e.g., 'Kognitibo: Natutukoy...', 'Saykomotor: Naisasagawa...', 'Apektibo: Napahahalagahan...') and MUST NEVER start with 'M'."
                  : "EXACTLY THREE (3) daily learning objectives in English in order: [0] Cognitive, [1] Psychomotor, [2] Affective (e.g., 'Cognitive: Identify...', 'Psychomotor: Construct...', 'Affective: Appreciate...').",
              items: { type: Type.STRING },
          },
          flowDetails: {
              type: Type.OBJECT,
              description: isFilipinoLang
                  ? "Nilalaman para sa L2 (Daloy ng Aralin) na may Mga Tala ng Konsepto ng Aralin (Concept Notes) at 4 na Simple at Madaling Maunawaang Gawain (Engage, Explore, Experience, Empathize — WALANG Write at WALANG Materials sa L2)."
                  : "Structured content for L2 (Lesson Flow) containing Concept Notes of the Lesson and 4 Simple, Understandable Classroom Activities (Engage, Explore, Experience, Empathize — NO Write phase and NO Materials in L2).",
              properties: {
                  conceptNotes: {
                      type: Type.OBJECT,
                      description: isFilipinoLang
                          ? "Mga Tala ng Konsepto ng Aralin (Concept Notes) na tatalakayin ng guro at isusulat ng mga mag-aaral sa kanilang kuwaderno."
                          : "Concept Notes of the Lesson that the teacher discusses and learners record in their notebooks.",
                      properties: {
                          topicTitle: {
                              type: Type.STRING,
                              description: isFilipinoLang
                                  ? "Pamagat ng Paksa o Konsepto ng Aralin."
                                  : "Topic or Concept Title for this day's lesson.",
                          },
                          keyTerms: {
                              type: Type.ARRAY,
                              description: isFilipinoLang
                                  ? "3 hanggang 5 mahahalagang terminolohiya o konsepto at ang kanilang malinaw na kahulugan."
                                  : "3 to 5 key vocabulary terms or concepts with clear definitions.",
                              items: { type: Type.STRING },
                          },
                          detailedDiscussion: {
                              type: Type.STRING,
                              description: isFilipinoLang
                                  ? "Malinaw at komprehensibong paliwanag ng mga pangunahing konsepto ng aralin."
                                  : "Clear, comprehensive explanation of the core concepts and principles of the lesson.",
                          },
                          illustrativeExamples: {
                              type: Type.ARRAY,
                              description: isFilipinoLang
                                  ? "2 hanggang 3 konkretong halimbawa na nagpapakita ng paggamit ng konsepto."
                                  : "2 to 3 concrete examples illustrating the concept.",
                              items: { type: Type.STRING },
                          },
                          keyTakeaways: {
                              type: Type.STRING,
                              description: isFilipinoLang
                                  ? "Paglalahat o buod ng pinakamahalagang kaisipan ng aralin."
                                  : "Clear summary or generalization of the main concept learned.",
                          },
                      },
                      required: ['topicTitle', 'keyTerms', 'detailedDiscussion', 'illustrativeExamples', 'keyTakeaways'],
                  },
                  lessonMaterials: {
                      type: Type.ARRAY,
                      description: isFilipinoLang
                          ? "Listahan ng mga kagamitan (materials) para sa mga gawain na ilalagay sa Seksyon L3 (Mga Kagamitang Panturo)."
                          : "List of instructional and activity materials to be placed in Section L3 (Learning Resources / Materials).",
                      items: { type: Type.STRING },
                  },
                  activities: {
                      type: Type.ARRAY,
                      description: isFilipinoLang
                          ? "Eksaktong 4 na simple at madaling maunawaang gawain para sa 4 na bahagi ng Daloy LAMANG: [0] 1. ENGAGE, [1] 2. EXPLORE, [2] 3. EXPERIENCE, [3] 4. EMPATHIZE. Huwag maglagay ng Write phase."
                          : "Exactly 4 simple and understandable classroom activities for the 4 Flow phases ONLY: [0] 1. ENGAGE, [1] 2. EXPLORE, [2] 3. EXPERIENCE, [3] 4. EMPATHIZE. Do NOT include a Write phase.",
                      items: {
                          type: Type.OBJECT,
                          properties: {
                              phase: {
                                  type: Type.STRING,
                                  description: isFilipinoLang
                                      ? "Pangalan ng bahagi: '1. ENGAGE (Pag-engganyo)', '2. EXPLORE (Pagtuklas)', '3. EXPERIENCE (Karanasan)', o '4. EMPATHIZE (Pakikiramay)'."
                                      : "Phase title: '1. ENGAGE', '2. EXPLORE', '3. EXPERIENCE', or '4. EMPATHIZE'.",
                              },
                              activityTitle: {
                                  type: Type.STRING,
                                  description: isFilipinoLang
                                      ? "Maikli at malinaw na pamagat ng Gawain (hal., 'Larawan-Suri')."
                                      : "Short, clear Activity Name (e.g., 'Picture Analysis').",
                              },
                              activityDescription: {
                                  type: Type.STRING,
                                  description: isFilipinoLang
                                      ? `Simple, direkta, at madaling maunawaang paliwanag ng gawain (2-4 na pangungusap lamang; huwag gumawa ng mahabang step-by-step script at huwag ilagay ang materials dito).${isCOModeRequested ? " Isama ang '[Related COT Indicator ...]' kung saan ito naipamamalas." : ""}`
                                      : `Simple, clear, and easy-to-understand description of the activity (2-4 straightforward sentences; do NOT write a long step-by-step procedure and do NOT list materials here).${isCOModeRequested ? " Include '[Related COT Indicator ...]' callouts where demonstrated." : ""}`,
                              },
                              processQuestions: {
                                  type: Type.ARRAY,
                                  description: isFilipinoLang
                                      ? "2-3 MAIKLING Pamprosesong Tanong (1 maikling pangungusap bawat tanong; huwag maglagay ng mahabang sagot sa panaklong)."
                                      : "2-3 SHORT, simple Process Questions (one short sentence per question; do NOT include expected answers in parentheses).",
                                  items: { type: Type.STRING },
                              },
                          },
                          required: ['phase', 'activityTitle', 'activityDescription', 'processQuestions'],
                      },
                  },
              },
              required: ['conceptNotes', 'lessonMaterials', 'activities'],
          },
          sections: {
              type: Type.ARRAY,
              description: "An array of exactly ten (10) sections following the ILAW structure (with IDs 'I1', 'I2', 'I3', 'L1', 'L2', 'L3', 'L4', 'A1', 'W1', 'W2' in order).",
              items: {
                  type: Type.OBJECT,
                  properties: sectionProperties,
                  required: requiredSectionFields,
              },
          },
      };

      if (coReadyConfig && coReadyConfig.enabled) {
          dayPlanSchemaProperties.cotAlignments = {
              type: Type.ARRAY,
              description: "An array mapping each selected PMES SY 2026-2027 COT Indicator to the specific sections and observable classroom evidence in this day's lesson plan.",
              items: {
                  type: Type.OBJECT,
                  properties: {
                      code: { type: Type.STRING, description: "The COT indicator code (e.g., '1.1.2', '1.4.2', '1.5.2', '1.6.2', '2.1.2', '2.2.2', '3.2.2', '3.5.2', '5.3.2')." },
                      indicator: { type: Type.STRING, description: "The full title of the COT indicator." },
                      sectionApplied: { type: Type.STRING, description: "The ILAW section(s) and phase(s) where this indicator is demonstrated (e.g., 'L2 - Explore & Experience, L4')." },
                      observableEvidence: { type: Type.STRING, description: "Specific observable teacher and learner actions in this lesson that demonstrate mastery at the target rating level for the selected teacher career stage." },
                  },
                  required: ['code', 'indicator', 'sectionApplied', 'observableEvidence'],
              },
          };
      }

      const requiredDayFields = ['day', 'objectives', 'flowDetails', 'sections'];
      if (coReadyConfig && coReadyConfig.enabled) {
          requiredDayFields.push('cotAlignments');
      }

      const dayPlanSchema = {
          type: Type.OBJECT,
          properties: dayPlanSchemaProperties,
          required: requiredDayFields,
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
              description: "The Learning Competency used for this lesson plan. If a competency was not provided in the prompt, this should be the competency you derived from the reference material or standards."
          },
          contentStandard: {
              type: Type.STRING,
              description: "The Content Standard (Pamantayang Pangnilalaman) used for this lesson plan. Use the exact Content Standard provided in the prompt, or derive an aligned DepEd Content Standard if not provided."
          },
          performanceStandard: {
              type: Type.STRING,
              description: "The Performance Standard (Pamantayan sa Pagganap) used for this lesson plan. Use the exact Performance Standard provided in the prompt, or derive an aligned DepEd Performance Standard if not provided."
          },
        },
        required: ['lessonPlan', 'competency', 'contentStandard', 'performanceStandard'],
      };
        
      const compStr = typeof competency === 'string' ? competency.trim() : '';
      const contentStdStr = typeof contentStandard === 'string' ? contentStandard.trim() : '';
      const perfStdStr = typeof performanceStandard === 'string' ? performanceStandard.trim() : '';
      const totalDays = Math.max(1, Math.min(30, Number(numberOfDays) || 1));

      // Batch days intelligently (1-3 days per batch) so multi-day plans are fast without exceeding RPM/RPD limits
      const batches: { startDay: number; endDay: number }[] = [];
      const BATCH_SIZE = totalDays <= 3 ? totalDays : (totalDays <= 6 ? 3 : 4);
      for (let start = 1; start <= totalDays; start += BATCH_SIZE) {
          batches.push({
              startDay: start,
              endDay: Math.min(totalDays, start + BATCH_SIZE - 1),
          });
      }

      const trimmedPdfText = typeof pdfText === 'string' && pdfText.length > 18000
          ? pdfText.slice(0, 18000)
          : pdfText;

      const sysInstruction = getSystemInstruction(language, !!trimmedPdfText, !!(compStr || contentStdStr || perfStdStr), integrateObjectives, coReadyConfig);

      const batchResults = await Promise.all(
          batches.map(async ({ startDay, endDay }) => {
              const batchCount = endDay - startDay + 1;
              let prompt: string;
              if (compStr || contentStdStr || perfStdStr) {
                  const baseRange = batches.length === 1
                      ? `Generate a complete ${totalDays}-day lesson plan (Days 1 to ${totalDays}) in ${language}`
                      : `Generate Day ${startDay}${endDay > startDay ? ` to ${endDay}` : ''} (${batchCount} day${batchCount > 1 ? 's' : ''}, day number${batchCount > 1 ? 's' : ''} ${Array.from({ length: batchCount }, (_, i) => startDay + i).join(', ')}) of a ${totalDays}-day progressive lesson plan in ${language}`;
                  const stdDetails: string[] = [];
                  if (contentStdStr) stdDetails.push(`Content Standard (Pamantayang Pangnilalaman): "${contentStdStr}"`);
                  if (perfStdStr) stdDetails.push(`Performance Standard (Pamantayan sa Pagganap): "${perfStdStr}"`);
                  if (compStr) stdDetails.push(`Learning Competency (Kasanayang Pampagkatuto): "${compStr}"`);
                  prompt = `${baseRange} based on the following curriculum standards:\n${stdDetails.join('\n')}\n\nMake sure Section I1 (Learning Competency and Curriculum Standards) explicitly includes the Content Standard, Performance Standard, and Learning Competency.`;
              } else {
                  prompt = batches.length === 1
                      ? `Analyze the following text, determine the Content Standard, Performance Standard, and main Learning Competency, and then generate a complete ${totalDays}-day lesson plan in ${language} based on those standards and the text provided.`
                      : `Analyze the following text, determine the Content Standard, Performance Standard, and main Learning Competency, and generate Day ${startDay}${endDay > startDay ? ` to ${endDay}` : ''} (${batchCount} day${batchCount > 1 ? 's' : ''}, day number${batchCount > 1 ? 's' : ''} ${Array.from({ length: batchCount }, (_, i) => startDay + i).join(', ')}) of a ${totalDays}-day lesson plan in ${language} based on those standards and the text provided.`;
              }

              prompt += isFilipinoLang
                  ? `\n\nIMPORTANT:
1. For each day, provide ONLY 3 learning objectives strictly for: 1. KOGNITIBO, 2. SAYKOMOTOR, and 3. APEKTIBO in "objectives". Because Filipino/Tagalog is selected, EVERY objective verb MUST start with the letter "N" (e.g., Natutukoy, Naipapaliwanag, Nasusuri, Naisasagawa, Nakabubuo, Napahahalagahan) and NEVER start with "M".
2. Populate "flowDetails" with ONLY 4 phases: 1. Engage, 2. Explore, 3. Experience (with Concept Notes of the lesson), and 4. Empathize. Do NOT include a Write phase!
3. Keep each activity description in "flowDetails.activities" simple, clear, and easy to understand (2-4 sentences; do NOT write a long step-by-step procedure), and keep the Process Questions SHORT (2-3 short questions per phase).
4. Place all activity materials and instructional materials in Section L3 (Learning Resources / Materials), NOT in L2.
5. To generate fast without duplicate text: in the "sections" array, leave "content" as "" (empty string) for section "I2" and section "L2" because they are built automatically from "objectives" and "flowDetails". Fill all other sections (I1, I3, L1, L3, L4, A1, W1, W2) concisely and completely.`
                  : `\n\nIMPORTANT:
1. For each day, provide ONLY 3 learning objectives strictly for: 1. COGNITIVE, 2. PSYCHOMOTOR, and 3. AFFECTIVE in "objectives".
2. Populate "flowDetails" with ONLY 4 phases: 1. Engage, 2. Explore, 3. Experience (with Concept Notes of the lesson), and 4. Empathize. Do NOT include a Write phase!
3. Keep each activity description in "flowDetails.activities" simple, clear, and easy to understand (2-4 sentences; do NOT write a long step-by-step procedure), and keep the Process Questions SHORT (2-3 short questions per phase).
4. Place all activity materials and instructional materials in Section L3 (Learning Resources / Materials), NOT in L2.
5. To generate fast without duplicate text: in the "sections" array, leave "content" as "" (empty string) for section "I2" and section "L2" because they are built automatically from "objectives" and "flowDetails". Fill all other sections (I1, I3, L1, L3, L4, A1, W1, W2) concisely and completely.`;

              if (coReadyConfig && coReadyConfig.enabled) {
                  const stageInfo = TEACHER_STAGE_MAP[coReadyConfig.teacherType] || TEACHER_STAGE_MAP.TI_TIII;
                  prompt += `\n\nMake this a Classroom Observation (CO-Ready) Lesson Plan for ${stageInfo.label} (${stageInfo.careerStage}, Target Rating Level ${stageInfo.targetLevel}) integrating COT Indicators: ${(coReadyConfig.selectedIndicators || Object.keys(ALL_COT_INDICATORS)).join(', ')}.`;
              }

              if (trimmedPdfText) {
                  prompt += `\n\n--- REFERENCE MATERIAL FROM UPLOADED PDF ---\n${trimmedPdfText}\n--- END OF REFERENCE MATERIAL ---`;
              }

              try {
                  const response = await generateContentWithRetry(ai, {
                      model: 'gemini-2.5-flash-lite',
                      contents: prompt,
                      config: {
                          systemInstruction: sysInstruction,
                          responseMimeType: 'application/json',
                          responseSchema: responseSchema,
                          temperature: 0.6,
                      },
                  });

                  const parsed = extractJsonFromResponse(response);
                  if (!parsed.lessonPlan || !parsed.lessonPlan.days) {
                      throw new Error("Received malformed data from API");
                  }
                  return {
                      competency: compStr || parsed.competency || '',
                      contentStandard: contentStdStr || parsed.contentStandard || '',
                      performanceStandard: perfStdStr || parsed.performanceStandard || '',
                      days: parsed.lessonPlan.days.map((d: any, idx: number) => ({
                          ...d,
                          day: startDay + idx,
                      })),
                  };
              } catch (_batchErr: any) {
                  console.log(`[Lesson Plan Batch ${startDay}-${endDay}] Using built-in DepEd ILAW curriculum synthesizer.`);
                  return synthesizeFallbackLessonPlanBatch({
                      startDay,
                      endDay,
                      totalDays,
                      language,
                      competency: compStr,
                      contentStandard: contentStdStr,
                      performanceStandard: perfStdStr,
                      pdfText: trimmedPdfText,
                      integrateObjectives,
                      coReadyConfig,
                      TEACHER_STAGE_MAP,
                      ALL_COT_INDICATORS,
                  });
              }
          })
      );

      const allDays = batchResults.flatMap(b => b.days);
      const resolvedCompetency = compStr || batchResults[0]?.competency || '';
      const resolvedContentStandard = contentStdStr || batchResults[0]?.contentStandard || '';
      const resolvedPerformanceStandard = perfStdStr || batchResults[0]?.performanceStandard || '';
      const correctedDays = allDays.map((day: any) => normalizeDayObjectives(day));

      const correctedData = {
          competency: resolvedCompetency,
          contentStandard: resolvedContentStandard,
          performanceStandard: resolvedPerformanceStandard,
          coReadyConfig: coReadyConfig?.enabled ? coReadyConfig : undefined,
          lessonPlan: {
              days: correctedDays,
          },
      };

      res.json(correctedData);
    } catch (error: any) {
      console.error('Error in /api/generate-lesson-plan:', error);
      res.status(500).json({ error: formatApiError(error) });
    }
  });

  // API Endpoint to convert an existing Lesson Plan into a CO-Ready Lesson Plan
  app.post('/api/convert-co-ready', async (req, res) => {
    try {
      const { currentData, language, coReadyConfig } = req.body;
      if (!currentData || !currentData.lessonPlan || !coReadyConfig) {
        return res.status(400).json({ error: 'Missing lesson plan data or CO-Ready configuration.' });
      }

      const ai = getAi();

      const TEACHER_STAGE_MAP: Record<string, { label: string; careerStage: string; scale: string; targetLevel: number; expectation: string }> = {
        TI_TIII: {
          label: 'Teacher I–III',
          careerStage: 'Proficient Teacher A (TI–TIII)',
          scale: '2, 3, 4, 5, 6 (NO = 2)',
          targetLevel: 6,
          expectation: 'Demonstrate consistent, independent proficiency and effective learner engagement across classroom activities to merit Level 6.'
        },
        TIV_TVII: {
          label: 'Teacher IV–VII',
          careerStage: 'Proficient Teacher B (TIV–TVII)',
          scale: '3, 4, 5, 6, 7 (NO = 3)',
          targetLevel: 7,
          expectation: 'Demonstrate advanced proficient teaching, seamless transitions, and learner-centered strategies to merit Level 7.'
        },
        MTI_MTII: {
          label: 'Master Teacher I–II',
          careerStage: 'Highly Proficient Teacher (MT I–MT II)',
          scale: '4, 5, 6, 7, 8 (NO = 4)',
          targetLevel: 8,
          expectation: 'Demonstrate highly proficient, model-level pedagogy with collaborative inquiry, deep scaffolding, and exemplary differentiation to merit Level 8.'
        },
        MTIII_MTV: {
          label: 'Master Teacher III–V',
          careerStage: 'Distinguished Teacher (MT III–MT V)',
          scale: '5, 6, 7, 8, 9 (NO = 5)',
          targetLevel: 9,
          expectation: 'Demonstrate distinguished, innovative, and transformative instructional practices that empower learner autonomy, peer leadership, and metacognition to merit Level 9.'
        }
      };

      const ALL_COT_INDICATORS: Record<string, string> = {
        '1.1.2': '1. Apply knowledge of content within and across curriculum teaching areas (1.1.2)',
        '1.4.2': '2. Use a range of teaching strategies that enhance learner achievement in literacy and numeracy skills (1.4.2)',
        '1.5.2': '3. Apply a range of teaching strategies to develop critical and creative thinking, as well as other higher-order thinking skills (1.5.2)',
        '1.6.2': '4. Display proficient use of Mother Tongue, Filipino and English to facilitate teaching and learning (1.6.2)',
        '2.1.2': '5. Establish safe and secure learning environments to enhance learning through the consistent implementation of policies, guidelines and procedures (2.1.2)',
        '2.2.2': '6. Maintain learning environments that promote fairness, respect and care to encourage learning (2.2.2)',
        '3.2.2': "7. Establish a learner-centered culture by using teaching strategies that respond to learners' linguistic, cultural, socio-economic and religious backgrounds (3.2.2)",
        '3.5.2': '8. Adapt and use culturally appropriate teaching strategies to address the needs of learners from indigenous groups (3.5.2)',
        '5.3.2': '9. Use strategies for providing timely, accurate and constructive feedback to improve learner performance (5.3.2)',
      };

      const stageInfo = TEACHER_STAGE_MAP[coReadyConfig.teacherType] || TEACHER_STAGE_MAP.TI_TIII;
      const selectedCodes: string[] = Array.isArray(coReadyConfig.selectedIndicators) && coReadyConfig.selectedIndicators.length > 0
        ? coReadyConfig.selectedIndicators
        : Object.keys(ALL_COT_INDICATORS);
      const indicatorsListText = selectedCodes
        .map(code => `• ${ALL_COT_INDICATORS[code] || code}`)
        .join('\n');

      const isFil = language === 'Tagalog' || language === 'Filipino';
      const systemInstruction = `You are an expert DepEd Master Teacher and Instructional Coach specializing in the Performance Management and Evaluation System (PMES) for Teachers (SY 2026-2027) Classroom Observation Tool (COT) and the DepEd Order No. 016, s. 2026 ILAW Lesson Plan Framework.

Your task is to upgrade and transform an existing ILAW Lesson Plan in ${language} into a "CO-Ready (Classroom Observation Ready) Lesson Plan" specifically calibrated for:
- Teacher Category: ${stageInfo.label} — ${stageInfo.careerStage}
- Rating Scale: ${stageInfo.scale} (Target Highest Rating: Level ${stageInfo.targetLevel})
- Career Stage Expectation: ${stageInfo.expectation}

Selected COT Indicators to integrate and highlight:
${indicatorsListText}

CRITICAL TRANSFORMATION RULES:
1. Preserve the existing lesson competency, the ONLY 3 daily objectives (${isFil ? '1. KOGNITIBO, 2. SAYKOMOTOR, 3. APEKTIBO — in Filipino/Tagalog, EVERY objective verb MUST start with the letter "N" such as Natutukoy, Naisasagawa, Napahahalagahan and NEVER "M"' : '1. COGNITIVE, 2. PSYCHOMOTOR, 3. AFFECTIVE'}), the 4-phase L2 Flow structure (1. Engage, 2. Explore, 3. Experience with Concept Notes of the Lesson, 4. Empathize — NO Write phase, simple and understandable activities, and short Process Questions), L3 Materials/Learning Resources, and A1 Formative Assessment (5+ items with Answer Key).
2. In EVERY section (I1, I2, I3, L1, L2 phases, L3, L4, A1, W1, W2), explicitly indicate inside the lesson text which COT Indicator(s) that part of the lesson is related to by inserting clear callouts such as "[Related COT Indicator 1 (1.1.2): Apply knowledge of content within and across curriculum teaching areas — ${stageInfo.label} Target Level ${stageInfo.targetLevel}]" right where each selected indicator is demonstrated.
3. For each section in "sections", populate "relatedIndicators" with the array of COT indicator codes (e.g., ["1.1.2", "1.4.2"]) that are related to and demonstrated in that section.
4. For EACH day, generate a complete "cotAlignments" array with one item per selected indicator (${selectedCodes.join(', ')}) detailing the exact section applied and the concrete observable teacher/learner evidence that merits Level ${stageInfo.targetLevel} for ${stageInfo.label}.
5. Keep the entire output in ${language} and strictly adhere to the JSON schema.`;

      const convertSchema = {
        type: Type.OBJECT,
        properties: {
          lessonPlan: {
            type: Type.OBJECT,
            properties: {
              days: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    day: { type: Type.INTEGER },
                    objectives: { type: Type.ARRAY, items: { type: Type.STRING } },
                    cotAlignments: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          code: { type: Type.STRING },
                          indicator: { type: Type.STRING },
                          sectionApplied: { type: Type.STRING },
                          observableEvidence: { type: Type.STRING },
                        },
                        required: ['code', 'indicator', 'sectionApplied', 'observableEvidence'],
                      },
                    },
                    sections: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          id: { type: Type.STRING },
                          title: { type: Type.STRING },
                          content: { type: Type.STRING },
                          relatedIndicators: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                          },
                        },
                        required: ['id', 'title', 'content', 'relatedIndicators'],
                      },
                    },
                  },
                  required: ['day', 'objectives', 'cotAlignments', 'sections'],
                },
              },
            },
            required: ['days'],
          },
          competency: { type: Type.STRING },
        },
        required: ['lessonPlan', 'competency'],
      };

      const existingDays = Array.isArray(currentData.lessonPlan.days) ? currentData.lessonPlan.days : [];
      const BATCH_SIZE = existingDays.length <= 4 ? existingDays.length : 3;
      const dayChunks: any[][] = [];
      for (let i = 0; i < existingDays.length; i += BATCH_SIZE) {
        dayChunks.push(existingDays.slice(i, i + BATCH_SIZE));
      }

      const convertedChunks = await Promise.all(
        dayChunks.map(async (chunkDays) => {
          try {
            const response = await generateContentWithRetry(ai, {
              model: 'gemini-3.1-flash-lite',
              contents: `Transform the following lesson plan days into a CO-Ready Lesson Plan for ${stageInfo.label} (${stageInfo.careerStage}, Target Level ${stageInfo.targetLevel}) in ${language}:\n\n${JSON.stringify({ competency: currentData.competency, lessonPlan: { days: chunkDays } })}`,
              config: {
                systemInstruction,
                responseMimeType: 'application/json',
                responseSchema: convertSchema,
                temperature: 0.5,
              },
            });

            const parsed = extractJsonFromResponse(response);
            return parsed.lessonPlan?.days || [];
          } catch (_coErr: any) {
            console.log(`[CO-Ready Fallback] Annotating days using built-in COT indicator mapper.`);
            return chunkDays.map((day: any) => {
              const cotAlignments = selectedCodes.map((code, idx) => ({
                code,
                indicator: ALL_COT_INDICATORS[code] || `COT Indicator ${code}`,
                sectionApplied: idx % 2 === 0 ? 'I1, L2 (Engage & Experience), L4' : 'I3, L1, L2 (Explore & Empathize), A1',
                observableEvidence: isFil
                  ? `Naipamamalas ng guro at mga mag-aaral ang ${ALL_COT_INDICATORS[code] || code} sa pamamagitan ng aktibong talakayan, ginabayang pagsusuri, at agarang puna na nakaayon sa ${stageInfo.label} (Target Level ${stageInfo.targetLevel}).`
                  : `Teacher and learners visibly demonstrate ${ALL_COT_INDICATORS[code] || code} through structured inquiry, differentiated scaffolding, and constructive feedback calibrated to ${stageInfo.label} (Target Level ${stageInfo.targetLevel}).`,
              }));
              const sections = (day.sections || []).map((sec: any, sIdx: number) => {
                const code = selectedCodes[sIdx % selectedCodes.length];
                const tag = `[Related COT Indicator (${code}): ${ALL_COT_INDICATORS[code] || code} — ${stageInfo.label} Target Level ${stageInfo.targetLevel}]`;
                const hasTag = String(sec.content || '').includes('Related COT Indicator');
                return {
                  ...sec,
                  content: hasTag ? sec.content : `${sec.content || ''}\n\n${tag}`,
                  relatedIndicators: selectedCodes.slice(0, 2),
                };
              });
              return {
                ...day,
                cotAlignments,
                sections,
              };
            });
          }
        })
      );

      const allConvertedDays = convertedChunks.flat();
      res.json({
        competency: currentData.competency,
        lessonPlan: {
          days: allConvertedDays,
        },
        coReadyConfig: { ...coReadyConfig, enabled: true },
      });
    } catch (error: any) {
      console.error('Error in /api/convert-co-ready:', error);
      res.status(500).json({ error: formatApiError(error) });
    }
  });

  // API Route to generate a NotebookLM-style PowerPoint Slide Deck BASED ON a specific Lesson Plan Day
  app.post('/api/generate-slide-deck', async (req, res) => {
    try {
      const ai = getAi();
      const {
        dayPlan,
        competency,
        contentStandard,
        performanceStandard,
        printInfo,
        language = 'English',
        deckStyle = 'visual-concept',
      } = req.body;

      if (!dayPlan || typeof dayPlan.day !== 'number') {
        return res.status(400).json({ error: 'Valid dayPlan is required to generate a slide deck.' });
      }

      const isFil = language === 'Tagalog' || language === 'Filipino';
      const dayNumber = dayPlan.day;

      const styleGuidance =
        deckStyle === 'interactive-lesson'
          ? 'Emphasize interactive classroom hooks, collaborative challenges, student scenarios, and lively discussion prompts.'
          : deckStyle === 'study-review'
          ? 'Emphasize deep conceptual synthesis, structured definitions, step-by-step breakdowns, worked examples, and exam-ready review.'
          : 'Emphasize Google NotebookLM-style visual synthesis: crisp conceptual pillars, step-by-step process flows, high-signal cards, and clear real-world examples.';

      const systemInstruction = `You are Google NotebookLM's Slide Deck Architect and an expert Subject-Matter Presentation Designer.
Your task is to synthesize a 12-slide **Student-Facing Topic Presentation Deck** in ${isFil ? 'Filipino (Tagalog)' : 'English'} **BASED ON** Day ${dayNumber} of the teacher's lesson plan.

================================================================================
CRITICAL RULE — GENERATE THE POWERPOINT BASED ON THE LESSON PLAN, NOT THE LESSON PLAN AT THE POWERPOINT SLIDES:
================================================================================
1. DO NOT copy the lesson plan document onto the slides!
   - NEVER use administrative lesson plan section headers on slides (Forbidden on slides: "I1", "I2", "L1", "L2", "L3", "W1", "W2", "INTENTIONS", "FLOW PHASE 1", "WAYS FORWARD", "LEARNING RESOURCES", "COT Indicator 1.1.2").
   - NEVER write teacher-facing lesson plan instructions on the slide body (Forbidden on slides: "The teacher will ask the students to...", "Ask learners to form 4 groups...", "Distribute the worksheet...").
2. INSTEAD, generate the actual **CLASSROOM TOPIC PRESENTATION** that the teacher projects on the screen for students while teaching Day ${dayNumber}:
   - Every slide title, card, bullet, and question on the slide canvas MUST speak directly to the learners about the **actual subject matter / lesson topic** (e.g., the scientific phenomenon, historical event, mathematical rule, literary theme, or skill being taught on Day ${dayNumber}).
   - Put all teacher instructions, facilitation steps, L3 materials to hand out, timing cues, and lesson plan phase alignment inside "speakerNotes" (Presenter Guide).
3. KEEP SLIDES VISUAL, SCANNABLE, AND HIGH-IMPACT (TRUE NOTEBOOKLM SLIDE DECK STYLE):
   - ${styleGuidance}
   - Avoid walls of text! Each bullet or card body should be concise (12–28 words max), punchy, and structured for visual projection.
   - Write ALL content strictly in ${isFil ? 'Filipino (Tagalog)' : 'English'}.

4. STRUCTURE THE DECK INTO EXACTLY 12 VISUAL SLIDES FOR DAY ${dayNumber}:
   - Slide 1 (layout: "hero-cover"):
     • sectionTag: ${isFil ? '"PAKSA NG ARALIN"' : '"TOPIC OVERVIEW"'}
     • title: A compelling, subject-specific headline for the exact topic taught on Day ${dayNumber} (NOT "Lesson Plan Day ${dayNumber}").
     • subtitle: Engaging thematic subtitle connecting the topic to ${printInfo?.learningArea || 'the subject'}.
     • bullets: 3 crisp topic preview highlights (what big ideas we are exploring today).
     • calloutTitle: ${isFil ? '"Mahalagang Tanong (Essential Question)"' : '"Essential Question & Big Idea"'}
     • calloutText: A thought-provoking essential question or core thesis for today's topic.

   - Slide 2 (layout: "learning-goals"):
     • sectionTag: ${isFil ? '"MGA TARGET SA PAGKATUTO"' : '"LEARNING TARGETS"'}
     • title: ${isFil ? '"Ano ang Ating Matututuhan Ngayon?"' : '"What We Will Master Today"'}
     • subtitle: ${isFil ? '"Tatlong layunin para sa ating sesyon"' : '"Three clear learning goals for today’s session"'}
     • cards: 3 cards translating the day's 3 objectives into student-friendly learning targets:
       - Card 1: tag = ${isFil ? '"KAALAMAN"' : '"UNDERSTAND"'}, heading = ${isFil ? '"Pag-unawa sa Konsepto"' : '"Core Knowledge"'}, body = student-friendly cognitive goal.
       - Card 2: tag = ${isFil ? '"KASANAYAN"' : '"APPLY & CREATE"'}, heading = ${isFil ? '"Pagsasagawa"' : '"Hands-On Skill"'}, body = student-friendly psychomotor goal.
       - Card 3: tag = ${isFil ? '"PAGPAPAHALAGA"' : '"VALUE & CONNECT"'}, heading = ${isFil ? '"Pagsasabuhay"' : '"Real-Life Value"'}, body = student-friendly affective goal.
     • bullets: []

   - Slide 3 (layout: "hook-scenario"):
     • sectionTag: ${isFil ? '"PANIMULANG SITWASYON"' : '"OPENING HOOK"'}
     • title: Engaging title based on the Engage hook topic/scenario (e.g. a real-world mystery, situation, or visual prompt).
     • subtitle: ${isFil ? '"Suriin ang sitwasyon at ibahagi ang iyong ideya"' : '"Examine the scenario and share your initial thoughts"'}
     • bullets: 3 vivid, student-facing points presenting the hook scenario, case, or phenomenon (derived from the Engage activity, written directly for students to read and react to).
     • processQuestions: 2–3 short, thought-provoking spark questions for the class.

   - Slide 4 (layout: "discovery-challenge"):
     • sectionTag: ${isFil ? '"HAMON SA PAGTUKLAS"' : '"DISCOVERY CHALLENGE"'}
     • title: Title of the inquiry / exploration challenge (derived from the Explore activity).
     • subtitle: ${isFil ? '"Tuklasin ang ugnayan at prinsipyo sa likod ng paksa"' : '"Investigate the pattern and uncover how the concept works"'}
     • bullets: 3–4 clear, student-facing challenge steps or investigation prompts.
     • processQuestions: 2–3 short inquiry questions guiding students to discover the concept.

   - Slide 5 (layout: "big-picture-pillars"):
     • sectionTag: ${isFil ? '"PANGUNAHING BALANGKAS"' : '"THE BIG PICTURE"'}
     • title: Synthesized headline introducing the 3 or 4 core pillars/components of today's topic.
     • subtitle: ${isFil ? '"Ang mahahalagang haligi ng ating paksa"' : '"The foundational pillars that define this concept"'}
     • cards: 3 or 4 visual pillar cards (tag = "PILLAR 01", "PILLAR 02", etc., heading = Pillar Name, body = Concise explanation of this pillar).
     • calloutTitle: ${isFil ? '"Sentral na Ideya"' : '"Core Thesis"'}
     • calloutText: 1-sentence synthesis uniting the pillars.
     • bullets: []

   - Slide 6 (layout: "vocabulary-grid"):
     • sectionTag: ${isFil ? '"MAHAHALAGANG TERMINO"' : '"KEY VOCABULARY"'}
     • title: ${isFil ? '"Mahahalagang Termino at Konsepto"' : '"Essential Terms & Definitions"'}
     • subtitle: ${isFil ? '"Mga salitang susi sa malalim na pag-unawa ng paksa"' : '"Key building blocks for understanding today’s topic"'}
     • cards: 4 vocabulary cards extracted & synthesized from the lesson's Concept Notes (tag = ${isFil ? '"TERMINO"' : '"KEY TERM"'}, heading = Exact Term, body = Crisp, student-friendly definition).
     • bullets: []

   - Slide 7 (layout: "process-flow"):
     • sectionTag: ${isFil ? '"PAANO ITO GUMAGANA"' : '"HOW IT WORKS • STEP-BY-STEP"'}
     • title: Headline explaining the process, mechanism, sequence, or framework of the topic.
     • subtitle: ${isFil ? '"Hakbang-hakbang na daloy o proseso ng konsepto"' : '"Step-by-step breakdown of the core mechanism or rule"'}
     • cards: 3 or 4 sequential step cards (tag = "STEP 01", "STEP 02", "STEP 03", "STEP 04", heading = Short Step Name, body = Clear explanation of this stage/step).
     • calloutTitle: ${isFil ? '"Tandaan"' : '"Key Rule / Principle"'}
     • calloutText: The crucial rule or takeaway governing this process.
     • bullets: []

   - Slide 8 (layout: "concept-spotlight"):
     • sectionTag: ${isFil ? '"MALALIM NA PAGTALAKAY"' : '"CONCEPT DEEP DIVE"'}
     • title: Deep-dive thematic title focusing on key rules, relationships, or critical distinctions from the Concept Notes.
     • subtitle: ${isFil ? '"Mahahalagang prinsipyo at dapat tandaan"' : '"Essential principles, relationships, and critical insights"'}
     • bullets: 4 high-impact conceptual statements explaining the heart of the lesson topic.
     • calloutTitle: ${isFil ? '"Pinakamahalagang Kaisipan"' : '"Golden Takeaway"'}
     • calloutText: The single most important generalization students should remember.

   - Slide 9 (layout: "worked-examples"):
     • sectionTag: ${isFil ? '"MGA KONGKRETONG HALIMBAWA"' : '"REAL-WORLD EXAMPLES"'}
     • title: ${isFil ? '"Mga Halimbawa sa Tunay na Sitwasyon"' : '"Worked Examples & Case Studies"'}
     • subtitle: ${isFil ? '"Paano nakikita at ginagamit ang konseptong ito?"' : '"Seeing the concept in action across concrete scenarios"'}
     • cards: 3 concrete illustrative examples or worked cases (tag = "CASE 01", "CASE 02", "CASE 03", heading = Specific Scenario/Example Name, body = Clear explanation showing how the concept applies).
     • calloutTitle: ${isFil ? '"Paglalahat mula sa mga Halimbawa"' : '"Pattern Across Examples"'}
     • calloutText: What all three examples prove about the topic.
     • bullets: []

   - Slide 10 (layout: "guided-challenge"):
     • sectionTag: ${isFil ? '"GINABAYANG PAGSASANAY"' : '"GUIDED PRACTICE"'}
     • title: Engaging student task title (synthesized from the Experience activity).
     • subtitle: ${isFil ? '"Ilapat ang natutuhang konsepto sa gawaing ito"' : '"Apply the concepts and examples we just explored"'}
     • bullets: 3–4 clear, student-facing task instructions or practice problems for learners to solve/complete.
     • processQuestions: 2–3 short reflection/check questions about their solution or output.

   - Slide 11 (layout: "real-world-reflection"):
     • sectionTag: ${isFil ? '"KONEKSYON SA TUNAY NA BUHAY"' : '"WHY IT MATTERS"'}
     • title: Thematic title connecting the topic to students' daily lives, ethics, empathy, and community (synthesized from Empathize).
     • subtitle: ${isFil ? '"Bakit mahalaga ang paksang ito sa ating buhay at komunidad?"' : '"Connecting today’s concept to everyday decisions and community impact"'}
     • bullets: 3 relatable real-world applications or value-laden scenarios showing why this topic matters beyond the classroom.
     • processQuestions: 2–3 heartfelt personal reflection prompts for students.

   - Slide 12 (layout: "quiz-check"):
     • sectionTag: ${isFil ? '"PAGTATAYA NG PAG-UNAWA"' : '"KNOWLEDGE CHECK"'}
     • title: ${isFil ? '"Subukin ang Iyong Natutuhan (5-Aytem na Pagsusulit)"' : '"Check Your Understanding: 5-Item Topic Quiz"'}
     • subtitle: ${isFil ? '"Sagutin ang sumusunod na mga tanong batay sa ating tinalakay"' : '"Test your mastery of today’s core concepts"'}
     • bullets: Exactly 5 well-crafted, student-facing quiz questions (with choices A, B, C, D if multiple choice, or clear identification items) aligned with the lesson plan's Formative Assessment (A1).
     • calloutTitle: ${isFil ? '"Susi sa Pagwawasto at Paliwanag"' : '"Answer Key & Quick Explanations"'}
     • calloutText: Complete Answer Key for items 1–5 with brief 1-phrase explanations.
     • speakerNotes: Include teacher instructions for administering the quiz, plus a reminder of the homework/extension task from W1.

5. VISUAL ILLUSTRATION PROMPT & CAPTION FOR EVERY SLIDE:
   - For EVERY slide, populate:
     • "imagePrompt": A specific, detailed visual illustration prompt (in English, 18–35 words) describing a clean educational illustration, concept diagram, or real-world scene directly depicting the content on that slide (no text overlays).
     • "imageCaption": A concise 1-sentence caption in ${isFil ? 'Filipino (Tagalog)' : 'English'} explaining what the slide visual illustrates for students.`;

      const slideDeckSchema = {
        type: Type.OBJECT,
        properties: {
          day: { type: Type.INTEGER },
          deckTitle: { type: Type.STRING, description: "Compelling subject-matter title of the topic presentation deck (NOT 'Lesson Plan Day X')." },
          deckSubtitle: { type: Type.STRING, description: "Subtitle showing subject, grade level, and theme." },
          topicSummary: { type: Type.STRING, description: "1-sentence NotebookLM synthesis summary of what this topic deck covers." },
          slides: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                slideNumber: { type: Type.INTEGER },
                layout: {
                  type: Type.STRING,
                  enum: [
                    'hero-cover',
                    'learning-goals',
                    'hook-scenario',
                    'discovery-challenge',
                    'big-picture-pillars',
                    'vocabulary-grid',
                    'process-flow',
                    'concept-spotlight',
                    'worked-examples',
                    'guided-challenge',
                    'real-world-reflection',
                    'quiz-check',
                  ],
                },
                sectionTag: { type: Type.STRING },
                title: { type: Type.STRING },
                subtitle: { type: Type.STRING },
                bullets: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                cards: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      heading: { type: Type.STRING },
                      body: { type: Type.STRING },
                      tag: { type: Type.STRING },
                    },
                    required: ['heading', 'body'],
                  },
                },
                calloutTitle: { type: Type.STRING },
                calloutText: { type: Type.STRING },
                processQuestions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                imagePrompt: {
                  type: Type.STRING,
                  description: "Specific educational visual illustration prompt based on this slide's topic and content.",
                },
                imageCaption: {
                  type: Type.STRING,
                  description: "Short student-facing caption describing the slide visual.",
                },
                speakerNotes: { type: Type.STRING },
              },
              required: [
                'id',
                'slideNumber',
                'layout',
                'sectionTag',
                'title',
                'bullets',
                'imagePrompt',
                'imageCaption',
                'speakerNotes',
              ],
            },
          },
        },
        required: ['day', 'deckTitle', 'deckSubtitle', 'topicSummary', 'slides'],
      };

      let parsedDeck: any;
      try {
        const response = await generateContentWithRetry(ai, {
          model: 'gemini-3.1-flash-lite',
          contents: `Synthesize a 12-slide Google NotebookLM-style Classroom Topic Presentation Deck in ${language} (Deck Style: ${deckStyle}) BASED ON the following Day ${dayNumber} Lesson Plan.\nRemember: Generate the presentation about the LESSON TOPIC itself for students — do NOT put raw lesson plan sections or teacher instructions on the slides (keep teacher instructions in speakerNotes), and provide a vivid imagePrompt and imageCaption for every slide.\n\nCompetency: ${competency || ''}\nContent Standard: ${contentStandard || ''}\nPerformance Standard: ${performanceStandard || ''}\nSchool/Grade/Subject: ${JSON.stringify(printInfo || {})}\n\nDay ${dayNumber} Lesson Plan Source:\n${JSON.stringify(dayPlan)}`,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: slideDeckSchema,
            temperature: 0.55,
          },
        });
        parsedDeck = extractJsonFromResponse(response);
      } catch (_deckErr: any) {
        console.log(`[Slide Deck Fallback] Synthesizing 12-slide presentation from Day ${dayNumber} lesson plan.`);
        const cn = dayPlan?.flowDetails?.conceptNotes || {};
        const acts = Array.isArray(dayPlan?.flowDetails?.activities) ? dayPlan.flowDetails.activities : [];
        const objs = Array.isArray(dayPlan?.objectives) ? dayPlan.objectives : [];
        const topicTitle = cn.topicTitle || competency || `Day ${dayNumber} Topic`;
        const subj = printInfo?.learningArea || (isFil ? 'Aralin' : 'Subject');
        parsedDeck = {
          day: dayNumber,
          deckTitle: topicTitle,
          deckSubtitle: `${subj}${printInfo?.gradeLevel ? ` • ${printInfo.gradeLevel}` : ''}`,
          topicSummary: cn.keyTakeaways || topicTitle,
          slides: [
            {
              id: `d${dayNumber}-s1`,
              slideNumber: 1,
              layout: 'hero-cover',
              sectionTag: isFil ? 'PAKSA NG ARALIN' : 'TOPIC OVERVIEW',
              title: topicTitle,
              subtitle: `${subj}${printInfo?.gradeLevel ? ` • ${printInfo.gradeLevel}` : ''}`,
              bullets: (cn.keyTerms || []).slice(0, 3).map((t: string) => String(t).slice(0, 120)),
              calloutTitle: isFil ? 'Mahalagang Kaisipan' : 'Big Idea',
              calloutText: cn.keyTakeaways || competency || topicTitle,
              imagePrompt: `Educational classroom illustration depicting ${topicTitle} in ${subj}`,
              imageCaption: topicTitle,
              speakerNotes: isFil ? 'Ipakilala ang paksa at iugnay sa karanasan ng mga mag-aaral.' : 'Introduce the lesson topic and connect it to learners’ prior knowledge.',
            },
            {
              id: `d${dayNumber}-s2`,
              slideNumber: 2,
              layout: 'learning-goals',
              sectionTag: isFil ? 'MGA TARGET SA PAGKATUTO' : 'LEARNING TARGETS',
              title: isFil ? 'Ano ang Ating Matututuhan Ngayon?' : 'What We Will Master Today',
              subtitle: isFil ? 'Tatlong layunin para sa ating sesyon' : 'Three clear learning goals for today’s session',
              bullets: [],
              cards: [
                { tag: isFil ? 'KAALAMAN' : 'UNDERSTAND', heading: isFil ? 'Pag-unawa sa Konsepto' : 'Core Knowledge', body: objs[0] || topicTitle },
                { tag: isFil ? 'KASANAYAN' : 'APPLY & CREATE', heading: isFil ? 'Pagsasagawa' : 'Hands-On Skill', body: objs[1] || topicTitle },
                { tag: isFil ? 'PAGPAPAHALAGA' : 'VALUE & CONNECT', heading: isFil ? 'Pagsasabuhay' : 'Real-Life Value', body: objs[2] || topicTitle },
              ],
              imagePrompt: `Students achieving learning goals and collaborating on ${topicTitle}`,
              imageCaption: isFil ? 'Mga layunin sa pagkatuto' : 'Today’s learning targets',
              speakerNotes: isFil ? 'Ipabasa ang tatlong target sa pagkatuto.' : 'Review the three learning goals with students.',
            },
            {
              id: `d${dayNumber}-s3`,
              slideNumber: 3,
              layout: 'hook-scenario',
              sectionTag: isFil ? 'PANIMULANG SITWASYON' : 'OPENING HOOK',
              title: acts[0]?.activityTitle || (isFil ? 'Panimulang Gawain' : 'Opening Scenario'),
              subtitle: isFil ? 'Suriin ang sitwasyon at ibahagi ang iyong ideya' : 'Examine the scenario and share your initial thoughts',
              bullets: [acts[0]?.activityDescription || topicTitle],
              processQuestions: acts[0]?.processQuestions || [],
              imagePrompt: `Engaging real-world opening scenario for ${topicTitle}`,
              imageCaption: acts[0]?.activityTitle || topicTitle,
              speakerNotes: acts[0]?.activityDescription || '',
            },
            {
              id: `d${dayNumber}-s4`,
              slideNumber: 4,
              layout: 'discovery-challenge',
              sectionTag: isFil ? 'HAMON SA PAGTUKLAS' : 'DISCOVERY CHALLENGE',
              title: acts[1]?.activityTitle || (isFil ? 'Pagtuklas sa Konsepto' : 'Concept Inquiry'),
              subtitle: isFil ? 'Tuklasin ang ugnayan at prinsipyo sa likod ng paksa' : 'Investigate the pattern and uncover how the concept works',
              bullets: [acts[1]?.activityDescription || topicTitle],
              processQuestions: acts[1]?.processQuestions || [],
              imagePrompt: `Collaborative group discovery activity about ${topicTitle}`,
              imageCaption: acts[1]?.activityTitle || topicTitle,
              speakerNotes: acts[1]?.activityDescription || '',
            },
            {
              id: `d${dayNumber}-s5`,
              slideNumber: 5,
              layout: 'big-picture-pillars',
              sectionTag: isFil ? 'PANGUNAHING BALANGKAS' : 'THE BIG PICTURE',
              title: isFil ? 'Mahahalagang Haligi ng Paksa' : 'Core Pillars of the Topic',
              subtitle: topicTitle,
              bullets: [],
              cards: (cn.keyTerms || [topicTitle]).slice(0, 3).map((t: string, i: number) => ({
                tag: `PILLAR 0${i + 1}`,
                heading: String(t).split(/[—:-]/)[0]?.trim() || `Concept ${i + 1}`,
                body: String(t),
              })),
              calloutTitle: isFil ? 'Sentral na Ideya' : 'Core Thesis',
              calloutText: cn.keyTakeaways || topicTitle,
              imagePrompt: `Visual conceptual diagram showing core pillars of ${topicTitle}`,
              imageCaption: topicTitle,
              speakerNotes: cn.detailedDiscussion || '',
            },
            {
              id: `d${dayNumber}-s6`,
              slideNumber: 6,
              layout: 'vocabulary-grid',
              sectionTag: isFil ? 'MAHAHALAGANG TERMINO' : 'KEY VOCABULARY',
              title: isFil ? 'Mahahalagang Termino at Konsepto' : 'Essential Terms & Definitions',
              subtitle: topicTitle,
              bullets: [],
              cards: (cn.keyTerms || [topicTitle]).slice(0, 4).map((t: string) => {
                const parts = String(t).split(/[—:-]/);
                return {
                  tag: isFil ? 'TERMINO' : 'KEY TERM',
                  heading: parts[0]?.trim() || topicTitle,
                  body: parts.slice(1).join(' ').trim() || String(t),
                };
              }),
              imagePrompt: `Educational infographic illustrating key vocabulary for ${topicTitle}`,
              imageCaption: isFil ? 'Mahahalagang termino ng aralin' : 'Key vocabulary terms',
              speakerNotes: isFil ? 'Talakayin ang bawat mahahalagang termino.' : 'Explain each key term clearly.',
            },
            {
              id: `d${dayNumber}-s7`,
              slideNumber: 7,
              layout: 'process-flow',
              sectionTag: isFil ? 'PAANO ITO GUMAGANA' : 'HOW IT WORKS • STEP-BY-STEP',
              title: isFil ? 'Daloy at Ugnayan ng Konsepto' : 'Step-by-Step Concept Breakdown',
              subtitle: topicTitle,
              bullets: [],
              cards: (cn.illustrativeExamples || [topicTitle]).slice(0, 3).map((ex: string, i: number) => ({
                tag: `STEP 0${i + 1}`,
                heading: isFil ? `Hakbang ${i + 1}` : `Stage ${i + 1}`,
                body: String(ex),
              })),
              calloutTitle: isFil ? 'Tandaan' : 'Key Principle',
              calloutText: cn.keyTakeaways || topicTitle,
              imagePrompt: `Step-by-step process diagram for ${topicTitle}`,
              imageCaption: topicTitle,
              speakerNotes: cn.detailedDiscussion || '',
            },
            {
              id: `d${dayNumber}-s8`,
              slideNumber: 8,
              layout: 'concept-spotlight',
              sectionTag: isFil ? 'MALALIM NA PAGTALAKAY' : 'CONCEPT DEEP DIVE',
              title: isFil ? 'Pagpapalalim ng Konsepto' : 'Core Concept Deep Dive',
              subtitle: topicTitle,
              bullets: [cn.detailedDiscussion || topicTitle],
              calloutTitle: isFil ? 'Pinakamahalagang Kaisipan' : 'Golden Takeaway',
              calloutText: cn.keyTakeaways || topicTitle,
              imagePrompt: `Detailed textbook illustration explaining ${topicTitle}`,
              imageCaption: topicTitle,
              speakerNotes: cn.detailedDiscussion || '',
            },
            {
              id: `d${dayNumber}-s9`,
              slideNumber: 9,
              layout: 'worked-examples',
              sectionTag: isFil ? 'MGA KONGKRETONG HALIMBAWA' : 'REAL-WORLD EXAMPLES',
              title: isFil ? 'Mga Halimbawa sa Tunay na Sitwasyon' : 'Worked Examples & Case Studies',
              subtitle: topicTitle,
              bullets: [],
              cards: (cn.illustrativeExamples || [topicTitle]).slice(0, 3).map((ex: string, i: number) => ({
                tag: `CASE 0${i + 1}`,
                heading: isFil ? `Halimbawa ${i + 1}` : `Example ${i + 1}`,
                body: String(ex),
              })),
              calloutTitle: isFil ? 'Paglalahat' : 'Pattern Across Examples',
              calloutText: cn.keyTakeaways || topicTitle,
              imagePrompt: `Real-world application examples of ${topicTitle}`,
              imageCaption: isFil ? 'Mga halimbawa sa tunay na buhay' : 'Real-world examples',
              speakerNotes: isFil ? 'Ipakita kung paano inilalapat ang konsepto sa bawat halimbawa.' : 'Walk students through each concrete example.',
            },
            {
              id: `d${dayNumber}-s10`,
              slideNumber: 10,
              layout: 'guided-challenge',
              sectionTag: isFil ? 'GINABAYANG PAGSASANAY' : 'GUIDED PRACTICE',
              title: acts[2]?.activityTitle || (isFil ? 'Ginabayang Pagsasagawa' : 'Guided Application'),
              subtitle: isFil ? 'Ilapat ang natutuhang konsepto sa gawaing ito' : 'Apply the concepts and examples we just explored',
              bullets: [acts[2]?.activityDescription || topicTitle],
              processQuestions: acts[2]?.processQuestions || [],
              imagePrompt: `Students working on guided practice activity for ${topicTitle}`,
              imageCaption: acts[2]?.activityTitle || topicTitle,
              speakerNotes: acts[2]?.activityDescription || '',
            },
            {
              id: `d${dayNumber}-s11`,
              slideNumber: 11,
              layout: 'real-world-reflection',
              sectionTag: isFil ? 'KONEKSYON SA TUNAY NA BUHAY' : 'WHY IT MATTERS',
              title: acts[3]?.activityTitle || (isFil ? 'Pagpapahalaga at Pagsasabuhay' : 'Real-Life Value & Reflection'),
              subtitle: isFil ? 'Bakit mahalaga ang paksang ito sa ating buhay at komunidad?' : 'Connecting today’s concept to everyday decisions and community impact',
              bullets: [acts[3]?.activityDescription || cn.keyTakeaways || topicTitle],
              processQuestions: acts[3]?.processQuestions || [],
              imagePrompt: `Community connection and real-life value of ${topicTitle}`,
              imageCaption: acts[3]?.activityTitle || topicTitle,
              speakerNotes: acts[3]?.activityDescription || '',
            },
            {
              id: `d${dayNumber}-s12`,
              slideNumber: 12,
              layout: 'quiz-check',
              sectionTag: isFil ? 'PAGTATAYA NG PAG-UNAWA' : 'KNOWLEDGE CHECK',
              title: isFil ? 'Subukin ang Iyong Natutuhan' : 'Check Your Understanding: 5-Item Quiz',
              subtitle: topicTitle,
              bullets: (dayPlan?.sections?.find((s: any) => s.id === 'A1')?.content || topicTitle)
                .split('\n')
                .filter((l: string) => /^\d+\./.test(l.trim()))
                .slice(0, 5),
              calloutTitle: isFil ? 'Susi sa Pagwawasto' : 'Answer Key',
              calloutText: '1. A • 2. A • 3. A • 4. A • 5. A',
              imagePrompt: `Knowledge check and formative quiz illustration for ${topicTitle}`,
              imageCaption: isFil ? 'Pormatibong pagtataya' : 'Formative knowledge check',
              speakerNotes: dayPlan?.sections?.find((s: any) => s.id === 'A1')?.content || '',
            },
          ],
        };
      }

      res.json({
        ...parsedDeck,
        deckStyle,
      });
    } catch (error: any) {
      console.error('Error in /api/generate-slide-deck:', error);
      res.status(500).json({ error: formatApiError(error) });
    }
  });

  // Track if Gemini dedicated image models have 0 free-tier quota on the current API key
  let geminiImageQuotaExhaustedUntil = 0;

  // API Route to generate an AI educational illustration directly from a PowerPoint slide's content
  app.post('/api/generate-slide-image', async (req, res) => {
    try {
      const ai = getAi();
      const {
        imagePrompt,
        slideTitle,
        slideSubtitle,
        slideBullets,
        slideCards,
        deckTitle,
        subjectArea,
      } = req.body;

      const bulletContext = Array.isArray(slideBullets)
        ? slideBullets.slice(0, 3).join('; ')
        : '';
      const cardContext = Array.isArray(slideCards)
        ? slideCards
            .slice(0, 3)
            .map((c: any) => `${c.heading || ''}: ${c.body || ''}`)
            .join('; ')
        : '';

      const slideContentSummary = [
        slideTitle ? `Slide Title: "${slideTitle}"` : '',
        slideSubtitle ? `Subtitle: "${slideSubtitle}"` : '',
        bulletContext ? `Key Slide Points: ${bulletContext}` : '',
        cardContext ? `Slide Concepts: ${cardContext}` : '',
      ]
        .filter(Boolean)
        .join('. ');

      const basePrompt =
        imagePrompt ||
        `Educational classroom presentation illustration for slide "${slideTitle || deckTitle}" in ${subjectArea || 'education'}`;

      const fullPrompt = `${basePrompt}. PowerPoint Slide Context (${deckTitle || subjectArea || 'Lesson Presentation'}): ${slideContentSummary}. Style: High-craft modern educational presentation illustration, clean vector and digital editorial textbook art, rich visual detail, clear subject focus directly illustrating the PowerPoint slide concept, classroom-appropriate, no text or words rendered inside the image.`;

      // TIER 1: Try Gemini native image generation models if free-tier quota is not exhausted
      if (Date.now() > geminiImageQuotaExhaustedUntil) {
        const imageModels = ['gemini-3.1-flash-lite-image', 'gemini-2.5-flash-image'];
        for (const modelName of imageModels) {
          try {
            const response = await ai.models.generateContent({
              model: modelName,
              contents: {
                parts: [{ text: fullPrompt }],
              },
              config: {
                imageConfig: {
                  aspectRatio: '4:3',
                },
              },
            });

            const parts = response.candidates?.[0]?.content?.parts || [];
            for (const part of parts) {
              if (part.inlineData && part.inlineData.data) {
                const mime = part.inlineData.mimeType || 'image/png';
                return res.json({
                  imageDataUrl: `data:${mime};base64,${part.inlineData.data}`,
                });
              }
            }
          } catch (err: any) {
            const errMsg =
              err?.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
            console.log(`[Slide Image] Switching from ${modelName} to fallback image generator.`);

            // If Free Tier has limit: 0 or 429 RESOURCE_EXHAUSTED, immediately mark quota exhausted and switch to Tier 2/3
            if (
              err?.status === 429 ||
              err?.code === 429 ||
              errMsg.includes('429') ||
              errMsg.includes('RESOURCE_EXHAUSTED') ||
              errMsg.includes('limit: 0') ||
              errMsg.includes('Quota exceeded')
            ) {
              geminiImageQuotaExhaustedUntil = Date.now() + 30 * 60 * 1000;
              break;
            }
          }
        }
      }

      // TIER 2: Real AI Text-to-Image Generator (Flux Educational Illustration) based on PowerPoint slide
      try {
        const concisePrompt = `${basePrompt}. Topic: ${slideTitle || deckTitle} (${subjectArea || 'Education'}). Modern colorful flat digital editorial textbook illustration, clear educational visual scene, high quality, no text, no letters`
          .replace(/\s+/g, ' ')
          .slice(0, 340);
        const seed = Math.abs(
          Array.from(String(slideTitle || deckTitle || 'slide')).reduce(
            (acc: number, ch: string) => (acc * 31 + ch.charCodeAt(0)) | 0,
            7
          )
        ) % 100000;
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
          concisePrompt
        )}?width=960&height=720&nologo=true&seed=${seed}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8500);
        const imgRes = await fetch(imageUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; EducationalSlideStudio/1.0)',
          },
        });
        clearTimeout(timeoutId);

        if (imgRes.ok) {
          const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
          if (contentType.startsWith('image/')) {
            const arrayBuf = await imgRes.arrayBuffer();
            if (arrayBuf.byteLength > 1500) {
              const base64Data = Buffer.from(arrayBuf).toString('base64');
              return res.json({
                imageDataUrl: `data:${contentType};base64,${base64Data}`,
              });
            }
          }
        }
      } catch (_fluxErr: any) {
        console.log('[Slide Image] Tier 2 image fetch skipped.');
      }

      // TIER 3: Gemini Free-Tier AI Vector Illustration Generator (uses standard text/multimodal quota)
      try {
        const svgPrompt = `You are an expert educational textbook illustrator. Create a rich, colorful, modern 4:3 SVG illustration (viewBox="0 0 960 720" width="960" height="720") based directly on this PowerPoint slide:
- Deck Topic: ${deckTitle || subjectArea || 'Lesson Presentation'}
- Subject Area: ${subjectArea || 'General Education'}
- Slide Title: ${slideTitle || ''}
- Slide Subtitle: ${slideSubtitle || ''}
- Slide Content: ${slideContentSummary}
- Visual Concept to Illustrate: ${basePrompt}

STRICT SVG REQUIREMENTS:
1. Return ONLY raw valid <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 720" width="960" height="720">...</svg> code. No markdown fences, no explanation.
2. Draw a genuine visual scene, scientific/conceptual illustration, objects, characters, environment, or visual metaphor representing "${slideTitle || deckTitle}" (use <defs>, linearGradient, radialGradient, <path>, <circle>, <rect>, <polygon>, <g> with rich layered shapes and harmonious colors).
3. Include 2-4 short, clear visual labels (maximum 3 words each, font-family="Arial, sans-serif", font-weight="bold") only where helpful to label key parts of the illustration. Ensure no overlapping text and keep all elements inside the 960x720 canvas.`;

        const svgResponse = await generateContentWithRetry(
          ai,
          {
            model: 'gemini-2.5-flash',
            contents: svgPrompt,
            config: {
              temperature: 0.6,
              maxOutputTokens: 8192,
            },
          },
          1,
          800
        );

        const rawText = svgResponse?.text || '';
        const svgMatch = rawText.match(/<svg[\s\S]*?<\/svg>/i);
        if (svgMatch && svgMatch[0]) {
          let cleanSvg = svgMatch[0];
          if (!cleanSvg.includes('xmlns=')) {
            cleanSvg = cleanSvg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
          }
          const base64Svg = Buffer.from(cleanSvg, 'utf-8').toString('base64');
          return res.json({
            imageDataUrl: `data:image/svg+xml;base64,${base64Svg}`,
          });
        }
      } catch (_svgErr: any) {
        console.log('[Slide Image] Using Tier 4 bespoke SVG illustration.');
      }

      // TIER 4: Guaranteed Bespoke SVG Illustration synthesized from the PowerPoint slide content
      const esc = (s: string) =>
        String(s || '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');

      const items: string[] =
        Array.isArray(slideCards) && slideCards.length > 0
          ? slideCards.slice(0, 3).map((c: any) => `${c.heading || ''}: ${c.body || ''}`)
          : Array.isArray(slideBullets) && slideBullets.length > 0
          ? slideBullets.slice(0, 3)
          : [slideSubtitle || deckTitle || slideTitle || 'Core Concept'];

      const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 720" width="960" height="720">
        <defs>
          <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0F172A" />
            <stop offset="50%" stop-color="#1E293B" />
            <stop offset="100%" stop-color="#0F2942" />
          </linearGradient>
          <radialGradient id="glow" cx="50%" cy="42%" r="50%">
            <stop offset="0%" stop-color="#38BDF8" stop-opacity="0.35" />
            <stop offset="100%" stop-color="#38BDF8" stop-opacity="0" />
          </radialGradient>
        </defs>
        <rect width="960" height="720" fill="url(#bgGrad)" />
        <circle cx="480" cy="300" r="340" fill="url(#glow)" />
        <circle cx="480" cy="250" r="115" fill="#0284C7" fill-opacity="0.22" stroke="#38BDF8" stroke-width="3" />
        <circle cx="480" cy="250" r="78" fill="#0369A1" fill-opacity="0.4" stroke="#7DD3FC" stroke-width="2" />
        <polygon points="480,190 530,275 430,275" fill="#38BDF8" fill-opacity="0.85" />
        <circle cx="480" cy="255" r="18" fill="#F8FAFC" />
        <text x="480" y="395" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" font-weight="bold" fill="#F8FAFC">${esc(
          (slideTitle || deckTitle || 'Lesson Concept').slice(0, 48)
        )}</text>
        <text x="480" y="430" text-anchor="middle" font-family="Arial, sans-serif" font-size="17" fill="#38BDF8">${esc(
          (deckTitle || subjectArea || '').slice(0, 60)
        )}</text>
        ${items
          .slice(0, 3)
          .map((it, i) => {
            const y = 475 + i * 68;
            return `<g>
              <rect x="110" y="${y}" width="740" height="52" rx="12" fill="#1E293B" stroke="#38BDF8" stroke-opacity="0.5" stroke-width="1.5" />
              <circle cx="145" cy="${y + 26}" r="14" fill="#38BDF8" />
              <text x="145" y="${y + 31}" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#0F172A">0${
              i + 1
            }</text>
              <text x="175" y="${y + 32}" font-family="Arial, sans-serif" font-size="16" fill="#E2E8F0">${esc(
              String(it).slice(0, 68)
            )}</text>
            </g>`;
          })
          .join('')}
      </svg>`;

      return res.json({
        imageDataUrl: `data:image/svg+xml;base64,${Buffer.from(fallbackSvg, 'utf-8').toString('base64')}`,
      });
    } catch (error: any) {
      console.error('Error in /api/generate-slide-image:', error);
      res.status(500).json({ error: error?.message || 'Failed to generate AI slide image.' });
    }
  });

  // API Route to generate a comprehensive Learner's Module Sheet / LAS based on a specific Lesson Plan Day
  app.post('/api/generate-module-sheet', async (req, res) => {
    try {
      const ai = getAi();
      const {
        dayPlan,
        competency,
        contentStandard,
        performanceStandard,
        printInfo,
        language = 'English',
        moduleFormat = 'deped-slm',
      } = req.body;

      if (!dayPlan || typeof dayPlan.day !== 'number') {
        return res.status(400).json({ error: 'Valid dayPlan is required to generate a module sheet.' });
      }

      const isFil = language === 'Tagalog' || language === 'Filipino';
      const dayNumber = dayPlan.day;

      const formatGuidance =
        moduleFormat === 'activity-worksheet'
          ? 'Focus on a hands-on Learner Activity Sheet (LAS) / Student Worksheet with clear step-by-step student tasks, engaging scenarios, observation prompts, and practice exercises.'
          : moduleFormat === 'study-handout'
          ? 'Focus on a comprehensive Concept Study Guide & Reviewer Handout with rich explanations, clear vocabulary definitions, worked examples, and self-check review.'
          : 'Structure as an official DepEd Self-Learning Module (SLM) Sheet that guides the learner independently from introduction to mastery and assessment.';

      const systemInstruction = `You are an expert DepEd Curriculum Writer and Instructional Module Designer.
Your task is to create a complete, student-facing **Learner's Module Sheet (Self-Learning Module / Learning Activity Sheet)** in ${isFil ? 'Filipino (Tagalog)' : 'English'} **BASED ON** Day ${dayNumber} of the generated lesson plan.

CRITICAL MODULE SHEET RULES:
1. Write directly TO THE LEARNER / STUDENT (use a warm, clear, encouraging instructional tone such as "${isFil ? 'Sa modyul na ito, matutuklasan mo...' : 'In this module sheet, you will explore...'}").
2. DO NOT copy teacher-facing instructions ("Ask the class to...", "The teacher will..."). Convert every activity from the lesson plan (L1 Pre-Lesson, L2 Engage, Explore, Experience & Concept Notes, Empathize, A1 Formative Assessment, and W1 Extended Learning) into student-facing module sections, reading passages, guided activities, and self-check questions!
3. ${formatGuidance}
4. Ensure the Concept Notes section ("conceptSummary", "keyTerms", "corePoints", "workedExamples") thoroughly teaches the topic so a student reading this Module Sheet at home or in class can understand the lesson completely.
5. Ensure "quizItems" contains at least 5 well-crafted Multiple Choice or Identification items aligned with Day ${dayNumber}'s objectives, and provide the complete "answerKey".
6. Write ALL content strictly in ${isFil ? 'Filipino (Tagalog)' : 'English'}.`;

      const moduleSheetSchema = {
        type: Type.OBJECT,
        properties: {
          day: { type: Type.INTEGER },
          moduleTitle: { type: Type.STRING },
          moduleSubtitle: { type: Type.STRING },
          competency: { type: Type.STRING },
          contentStandard: { type: Type.STRING },
          performanceStandard: { type: Type.STRING },
          learningTargets: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          overviewParagraph: { type: Type.STRING },
          warmUpTitle: { type: Type.STRING },
          warmUpScenario: { type: Type.STRING },
          warmUpQuestions: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          exploreTitle: { type: Type.STRING },
          exploreInstructions: { type: Type.STRING },
          exploreQuestions: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          conceptNotesTitle: { type: Type.STRING },
          conceptSummary: { type: Type.STRING },
          keyTerms: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                term: { type: Type.STRING },
                definition: { type: Type.STRING },
              },
              required: ['term', 'definition'],
            },
          },
          corePoints: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          workedExamples: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          practiceTask: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              instructions: { type: Type.STRING },
              prompts: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ['title', 'instructions', 'prompts'],
          },
          applicationTask: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              instructions: { type: Type.STRING },
              prompts: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ['title', 'instructions', 'prompts'],
          },
          generalizationPrompts: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          materialsNeeded: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          quizDirections: { type: Type.STRING },
          quizItems: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                number: { type: Type.INTEGER },
                question: { type: Type.STRING },
                choices: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: ['number', 'question'],
            },
          },
          additionalActivity: { type: Type.STRING },
          answerKey: { type: Type.STRING },
        },
        required: [
          'day',
          'moduleTitle',
          'moduleSubtitle',
          'competency',
          'learningTargets',
          'overviewParagraph',
          'warmUpTitle',
          'warmUpScenario',
          'warmUpQuestions',
          'exploreTitle',
          'exploreInstructions',
          'exploreQuestions',
          'conceptNotesTitle',
          'conceptSummary',
          'keyTerms',
          'corePoints',
          'workedExamples',
          'practiceTask',
          'applicationTask',
          'generalizationPrompts',
          'materialsNeeded',
          'quizDirections',
          'quizItems',
          'additionalActivity',
          'answerKey',
        ],
      };

      const prompt = `Generate a complete, student-facing Learner's Module Sheet in ${language} based on Day ${dayNumber} of the following Lesson Plan:
- Subject / Learning Area: ${printInfo?.learningArea || 'General Education'}
- Grade Level: ${printInfo?.gradeLevel || ''}
- Quarter: ${printInfo?.quarter || ''}
- Learning Competency: ${competency || ''}
${contentStandard ? `- Content Standard: ${contentStandard}\n` : ''}${performanceStandard ? `- Performance Standard: ${performanceStandard}\n` : ''}
--- SOURCE LESSON PLAN FOR DAY ${dayNumber} ---
${JSON.stringify(dayPlan, null, 2)}
--- END OF SOURCE LESSON PLAN ---`;

      let parsed: any;
      try {
        const response = await generateContentWithRetry(ai, {
          model: 'gemini-3.1-flash-lite',
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: moduleSheetSchema,
            temperature: 0.5,
          },
        });
        parsed = extractJsonFromResponse(response);
      } catch (_modErr: any) {
        console.log(`[Module Sheet Fallback] Synthesizing Module Sheet from Day ${dayNumber} lesson plan.`);
        const cn = dayPlan?.flowDetails?.conceptNotes || {};
        const acts = Array.isArray(dayPlan?.flowDetails?.activities) ? dayPlan.flowDetails.activities : [];
        const objs = Array.isArray(dayPlan?.objectives) ? dayPlan.objectives : [];
        const topicTitle = cn.topicTitle || competency || `Day ${dayNumber} Module`;
        parsed = {
          day: dayNumber,
          moduleTitle: topicTitle,
          moduleSubtitle: `${printInfo?.learningArea || 'Learning Area'}${printInfo?.gradeLevel ? ` • ${printInfo.gradeLevel}` : ''} • Day ${dayNumber}`,
          competency: competency || topicTitle,
          contentStandard: contentStandard || '',
          performanceStandard: performanceStandard || '',
          learningTargets: objs.length > 0 ? objs : [topicTitle],
          overviewParagraph: cn.detailedDiscussion || topicTitle,
          warmUpTitle: acts[0]?.activityTitle || (isFil ? 'Subukin Natin (Engage)' : 'Warm-Up Activity (Engage)'),
          warmUpScenario: acts[0]?.activityDescription || topicTitle,
          warmUpQuestions: acts[0]?.processQuestions || [],
          exploreTitle: acts[1]?.activityTitle || (isFil ? 'Tuklasin Natin (Explore)' : 'Discovery Task (Explore)'),
          exploreInstructions: acts[1]?.activityDescription || topicTitle,
          exploreQuestions: acts[1]?.processQuestions || [],
          conceptNotesTitle: topicTitle,
          conceptSummary: cn.detailedDiscussion || topicTitle,
          keyTerms: (cn.keyTerms || []).map((t: string) => {
            const parts = String(t).split(/[—:-]/);
            return {
              term: parts[0]?.trim() || topicTitle,
              definition: parts.slice(1).join(' ').trim() || String(t),
            };
          }),
          corePoints: [cn.detailedDiscussion || topicTitle, cn.keyTakeaways || topicTitle],
          workedExamples: cn.illustrativeExamples || [topicTitle],
          practiceTask: {
            title: acts[2]?.activityTitle || (isFil ? 'Pagyamanin (Experience)' : 'Guided Practice (Experience)'),
            instructions: acts[2]?.activityDescription || topicTitle,
            prompts: acts[2]?.processQuestions || [],
          },
          applicationTask: {
            title: acts[3]?.activityTitle || (isFil ? 'Isagawa at Pagnilayan (Empathize)' : 'Real-Life Application (Empathize)'),
            instructions: acts[3]?.activityDescription || topicTitle,
            prompts: acts[3]?.processQuestions || [],
          },
          generalizationPrompts: [cn.keyTakeaways || topicTitle],
          materialsNeeded: dayPlan?.flowDetails?.lessonMaterials || [],
          quizDirections: isFil ? 'Basahin at unawaing mabuti ang bawat tanong. Piliin ang titik ng tamang sagot.' : 'Read each question carefully and select the best answer.',
          quizItems: [1, 2, 3, 4, 5].map((num) => ({
            number: num,
            question: isFil
              ? `Tanong ${num} kaugnay ng ${topicTitle}: Paano mailalapat nang wasto ang konseptong tinalakay sa aralin?`
              : `Question ${num} on ${topicTitle}: How is the core concept of today's lesson accurately applied?`,
            choices: isFil
              ? ['A. Sa pamamagitan ng pagsusuri ng sitwasyon at paggamit ng batayang prinsipyo', 'B. Sa pamamagitan ng pagsasaulo lamang nang walang pag-unawa', 'C. Sa pamamagitan ng paglaktaw sa mga halimbawa', 'D. Sa pamamagitan ng panghuhula ng sagot']
              : ['A. By analyzing the context and applying the governing concept rules', 'B. By memorizing isolated words without context', 'C. By skipping the evidence and examples', 'D. By guessing without verification'],
          })),
          additionalActivity: dayPlan?.sections?.find((s: any) => s.id === 'W1')?.content || '',
          answerKey: '1. A, 2. A, 3. A, 4. A, 5. A',
        };
      }

      res.json({
        ...parsed,
        day: dayNumber,
      });
    } catch (error: any) {
      console.error('Error in /api/generate-module-sheet:', error);
      res.status(500).json({ error: formatApiError(error) });
    }
  });

async function startServer() {
  // Parse port from CLI argument or default to 3000
  const portArgIndex = process.argv.indexOf('--port');
  const portFromArg = portArgIndex !== -1 && process.argv[portArgIndex + 1] ? parseInt(process.argv[portArgIndex + 1], 10) : NaN;
  const PORT = !isNaN(portFromArg) ? portFromArg : (Number(process.env.PORT) || 3000);

  // Serve static files / Vite dev middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.use((req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  const handleShutdown = () => {
    server.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGTERM', handleShutdown);
  process.on('SIGINT', handleShutdown);
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
