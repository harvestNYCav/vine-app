import type { GradeLevel } from '@/lib/grade-levels'
import type {
  ElaExamSectionDefinition,
  ElaPassageAsset,
  ElaPassageReference,
  ElaSkill,
  ElaWorkedExample,
} from './types'

type SkillMeta = {
  emoji: string
  title: string
  shortDescription: string
  goals: [string, string, string]
  strategy: string
}

type GradeReadingProfile = {
  overview: string
  evidenceMove: string
  independenceMove: string
}

type SectionInput = {
  stimulusId: string
  passageLabel: string
  questionStart: number
  questionEnd: number
  passage: ElaPassageAsset
  passageReferences: ElaPassageReference[]
  skills: ElaSkill[]
  standards: string[]
  questionIds: string[]
}

export const ELA_SKILL_ORDER: ElaSkill[] = [
  'key-ideas-details',
  'craft-structure',
  'integration-knowledge',
  'language-vocabulary',
]

const SKILL_META: Record<ElaSkill, SkillMeta> = {
  'key-ideas-details': {
    emoji: '🔎',
    title: 'Key Ideas & Details',
    shortDescription: 'Find what the text says, infer what it suggests, and identify central ideas.',
    goals: [
      'answer literal and inferential questions with relevant text evidence',
      'determine a central idea, theme, or lesson and connect it to details',
      'explain how people, events, ideas, or plot elements develop',
    ],
    strategy: 'Restate the question, predict what evidence would answer it, and then scan for two details that point to the same conclusion. Choose the answer that accounts for both details without adding an unsupported idea.',
  },
  'craft-structure': {
    emoji: '🧰',
    title: 'Craft & Structure',
    shortDescription: 'Analyze word choice, text structure, point of view, and author’s purpose.',
    goals: [
      'determine the meaning and effect of words or phrases in context',
      'use paragraph, scene, stanza, and whole-text structure to follow the author’s ideas',
      'analyze point of view, perspective, purpose, and the effect of an author’s choices',
    ],
    strategy: 'Read around the target line, name the job it performs, and test each option in the passage. A strong answer explains both the local words and their role in the larger text.',
  },
  'integration-knowledge': {
    emoji: '🔗',
    title: 'Integration of Knowledge & Ideas',
    shortDescription: 'Connect details across a text, compare sources, and evaluate reasons and evidence.',
    goals: [
      'combine information from words, illustrations, charts, or other text features',
      'trace claims, reasons, and evidence and decide whether they support one another',
      'compare how texts or authors treat related topics, events, themes, or ideas',
    ],
    strategy: 'Make a quick two-column evidence list for the sources or ideas being connected. Identify what each contributes, then select the answer that states a relationship supported on both sides.',
  },
  'language-vocabulary': {
    emoji: '💬',
    title: 'Language & Vocabulary',
    shortDescription: 'Use context, word parts, and relationships among words to determine meaning.',
    goals: [
      'use sentence and paragraph context to infer a word’s meaning',
      'use roots, prefixes, suffixes, reference skills, and word relationships',
      'interpret figurative language, shades of meaning, and domain-specific vocabulary',
    ],
    strategy: 'Cover the unfamiliar word, replace it with your own plain-language meaning, and reread the sentence. Then check word parts and nearby contrasts, examples, or causes before matching a choice.',
  },
}

const GRADE_PROFILES: Record<GradeLevel, GradeReadingProfile> = {
  3: {
    overview: 'Grade 3 readers move from recounting a text to explaining how its details work together. Stories often require attention to character actions and sequence; informational texts require links among events, ideas, and procedures.',
    evidenceMove: 'Point to the sentence, paragraph, picture detail, or text feature that directly supports the answer.',
    independenceMove: 'Retell each part in a short phrase before deciding what the whole passage shows.',
  },
  4: {
    overview: 'Grade 4 readers explain a text with specific details, summarize without inserting opinions, and track how structure and perspective shape meaning. Questions increasingly require a conclusion supported by evidence from more than one place.',
    evidenceMove: 'Pair a conclusion with the two strongest details and explain how each one supports it.',
    independenceMove: 'Pause after each section to name its main job and its link to the section before it.',
  },
  5: {
    overview: 'Grade 5 readers quote or paraphrase accurately, compare elements across a text, and explain how an author develops a theme, idea, or purpose. Correct answers often synthesize details rather than repeat one sentence.',
    evidenceMove: 'Gather evidence from different parts of the passage and reject choices that fit only one isolated detail.',
    independenceMove: 'Annotate shifts in time, speaker, idea, or text structure so the passage’s development stays visible.',
  },
  6: {
    overview: 'Grade 6 readers cite evidence for explicit ideas and inferences, determine how details develop a central idea or theme, and analyze how language and structure affect meaning. Evidence must be precise, not merely related to the topic.',
    evidenceMove: 'State the inference in your own words, then identify the exact evidence chain that makes it reasonable.',
    independenceMove: 'Separate what the text states, what it implies, and what you already knew before evaluating choices.',
  },
  7: {
    overview: 'Grade 7 readers cite several pieces of evidence, trace interacting ideas and events, and analyze how form, perspective, and evidence influence a text. Strong answers account for nuance and development across the whole passage.',
    evidenceMove: 'Rank evidence by strength and use the details that most directly establish the answer, not just repeat its topic.',
    independenceMove: 'Track changes, contrasts, and cause-and-effect links in the margin before synthesizing the text.',
  },
  8: {
    overview: 'Grade 8 readers select the strongest evidence, analyze relationships among ideas or story elements, and evaluate how an author’s choices shape meaning and impact. Distractors may be partly true but incomplete or weakly supported.',
    evidenceMove: 'Compare the relevance and sufficiency of possible evidence, then choose the detail or combination that proves the claim most fully.',
    independenceMove: 'Form a provisional interpretation, test it against the entire passage, and revise it when a later detail changes the pattern.',
  },
}

const WORKED_EXAMPLES: Record<GradeLevel, Record<ElaSkill, ElaWorkedExample>> = {
  3: {
    'key-ideas-details': {
      prompt: 'Vine example: Nia’s kite falls into a tree. She tries a stick, asks a taller neighbor for help, and then thanks him. What lesson does the scene suggest?',
      steps: ['Name the problem: the kite is stuck.', 'Track Nia’s actions: she tries a solution and then asks for help.', 'Choose a lesson that fits both actions, not just the last sentence.'],
      takeaway: 'A supported lesson is that solving a problem may require persistence and help from others.',
    },
    'craft-structure': {
      prompt: 'Vine example: A paragraph says the rain “tapped softly” and later “pounded the roof.” Why does the author use those two descriptions?',
      steps: ['Compare the verbs tapped and pounded.', 'Notice that the sound changes from gentle to forceful.', 'Connect that change to the paragraph’s sequence.'],
      takeaway: 'The word choice shows that the storm becomes stronger.',
    },
    'integration-knowledge': {
      prompt: 'Vine example: A diagram labels a frog’s webbed feet, while the paragraph explains how frogs swim. How do the two parts work together?',
      steps: ['State what the diagram adds: the location and shape of the feet.', 'State what the paragraph adds: what the feet help the frog do.', 'Combine the two contributions.'],
      takeaway: 'The diagram shows the body part that the paragraph explains in action.',
    },
    'language-vocabulary': {
      prompt: 'Vine example: “The path was narrow, so the hikers walked in a single line.” What does narrow mean?',
      steps: ['Use the result: the hikers must walk single file.', 'Replace narrow with a plain phrase: not wide.', 'Reread to confirm that the replacement makes sense.'],
      takeaway: 'Narrow means having little width.',
    },
  },
  4: {
    'key-ideas-details': {
      prompt: 'Vine example: Malik practices a difficult song slowly, marks the troublesome measures, and finally performs it smoothly. Which details best support perseverance as the theme?',
      steps: ['State the possible theme in your own words.', 'Select actions that show continued effort despite difficulty.', 'Exclude the performance detail if it only shows the final result.'],
      takeaway: 'Practicing slowly and returning to difficult measures are the strongest evidence of perseverance.',
    },
    'craft-structure': {
      prompt: 'Vine example: An article first describes overflowing trash bins and then explains a neighborhood compost plan. What is the purpose of this structure?',
      steps: ['Label the first part as a problem.', 'Label the second part as a response or solution.', 'Explain why that order helps the reader.'],
      takeaway: 'The problem–solution structure shows why the compost plan was needed.',
    },
    'integration-knowledge': {
      prompt: 'Vine example: A timeline lists three bridge designs, and the text explains why each new design held more weight. What must a good answer combine?',
      steps: ['Use the timeline to establish the order.', 'Use the text to identify the reason for each change.', 'Connect chronology with improvement.'],
      takeaway: 'Together, the sources show when each design appeared and how the engineering improved.',
    },
    'language-vocabulary': {
      prompt: 'Vine example: “Unlike the brittle dry twig, the fresh branch was flexible.” What does brittle mean?',
      steps: ['Notice the contrast word unlike.', 'Use flexible as the opposite clue.', 'Choose a meaning that describes something likely to snap.'],
      takeaway: 'Brittle means hard but easily broken.',
    },
  },
  5: {
    'key-ideas-details': {
      prompt: 'Vine example: An inventor records three failed designs, changes one feature after each trial, and uses the results to build a working model. What central idea develops?',
      steps: ['Summarize the repeated pattern of trial, evidence, and revision.', 'Look for details from the beginning and end.', 'State an idea broad enough to cover the whole sequence.'],
      takeaway: 'Careful testing and revision can turn failures into useful information.',
    },
    'craft-structure': {
      prompt: 'Vine example: A narrator calls a crowded workshop “a forest of half-built machines.” What effect does the metaphor create?',
      steps: ['Identify what is compared: machines and a forest.', 'List shared qualities such as number, height, or difficulty of moving through.', 'Connect the image to the narrator’s impression.'],
      takeaway: 'The metaphor emphasizes how dense and overwhelming the workshop feels.',
    },
    'integration-knowledge': {
      prompt: 'Vine example: One account praises a new park for creating habitat; another worries that construction disturbed nesting birds. How are the perspectives related?',
      steps: ['Record each source’s main concern.', 'Identify the shared topic: effects on wildlife.', 'Describe the contrast without claiming that either source ignores wildlife.'],
      takeaway: 'Both focus on habitat, but they judge the project’s short- and long-term effects differently.',
    },
    'language-vocabulary': {
      prompt: 'Vine example: In “reusable,” how do the prefix re- and suffix -able help determine the meaning?',
      steps: ['Identify re- as again.', 'Identify -able as capable of being.', 'Combine the base use with both affixes.'],
      takeaway: 'Reusable means capable of being used again.',
    },
  },
  6: {
    'key-ideas-details': {
      prompt: 'Vine example: A student council initially rejects a garden proposal, but survey results and a revised budget change its vote. Which evidence chain best supports the inference that evidence can change decisions?',
      steps: ['Separate the initial decision from the final decision.', 'Identify what enters between them: survey data and a revised budget.', 'Connect those details causally without assuming an unstated motive.'],
      takeaway: 'The before-and-after decisions, joined by new evidence, support the inference.',
    },
    'craft-structure': {
      prompt: 'Vine example: An essay opens with one family’s week without clean water, then presents regional data. Why might the author order the ideas this way?',
      steps: ['Identify the opening as a concrete personal case.', 'Identify the data as broader context.', 'Explain how moving from specific to general affects understanding.'],
      takeaway: 'The case makes the issue immediate before the statistics establish its larger scale.',
    },
    'integration-knowledge': {
      prompt: 'Vine example: A claim says later school start times improve attention. A table shows attention ratings before and after one school changed its schedule. What should a reader evaluate?',
      steps: ['Check whether the table measures the same idea as the claim.', 'Compare the before and after values.', 'Consider whether one school’s data is relevant but limited evidence.'],
      takeaway: 'The table can support the claim while still leaving questions about how broadly it applies.',
    },
    'language-vocabulary': {
      prompt: 'Vine example: “The committee’s response was measured rather than hasty.” What does measured mean here?',
      steps: ['Reject the common measurement meaning because it does not fit response.', 'Use rather than hasty as a contrast clue.', 'Substitute calm and carefully considered.'],
      takeaway: 'Measured describes a deliberate, controlled response.',
    },
  },
  7: {
    'key-ideas-details': {
      prompt: 'Vine example: Across a story, Lena hides a mistake, watches the consequences grow, and finally admits what happened before anyone confronts her. How does her motivation develop?',
      steps: ['Track what Lena wants at each stage.', 'Connect the growing consequences to her changing choice.', 'Select evidence that shows both the initial fear and later responsibility.'],
      takeaway: 'Her motivation shifts from avoiding blame to preventing further harm and accepting responsibility.',
    },
    'craft-structure': {
      prompt: 'Vine example: A memoir interrupts a tense competition with a brief childhood memory of learning the same skill. What is the structural effect?',
      steps: ['Locate the interruption in the present action.', 'Identify what the memory reveals about preparation or emotion.', 'Explain how returning to the competition gains new meaning.'],
      takeaway: 'The flashback explains the event’s personal importance and heightens the present tension.',
    },
    'integration-knowledge': {
      prompt: 'Vine example: Two authors agree that urban trees reduce heat. One emphasizes public health data; the other emphasizes energy costs. How do their approaches differ?',
      steps: ['State the shared conclusion.', 'Categorize each author’s evidence.', 'Describe the different emphasis without inventing disagreement.'],
      takeaway: 'They support the same conclusion through different consequences: health and household energy use.',
    },
    'language-vocabulary': {
      prompt: 'Vine example: “Her apology sounded polished, but its vague wording made it ring hollow.” What does ring hollow suggest?',
      steps: ['Notice the contrast between polished and vague.', 'Treat the phrase as figurative, not a literal sound.', 'Infer the judgment implied by the surrounding sentence.'],
      takeaway: 'Ring hollow means to seem insincere or lacking real meaning.',
    },
  },
  8: {
    'key-ideas-details': {
      prompt: 'Vine example: An editorial acknowledges that a transit plan costs more at first, presents maintenance projections, and argues that long-term savings justify it. Which evidence most strongly supports the central claim?',
      steps: ['Distinguish the concession from the main claim.', 'Identify evidence that compares costs over the relevant time span.', 'Prefer sufficient numerical or causal evidence over a favorable opinion.'],
      takeaway: 'The strongest evidence directly demonstrates that projected long-term savings exceed the added initial cost.',
    },
    'craft-structure': {
      prompt: 'Vine example: A speech repeats “we chose to begin” before each example of community action. How does the repetition shape the speech?',
      steps: ['Identify the phrase and where it recurs.', 'Notice the shared emphasis on agency and beginnings.', 'Connect the pattern to tone and purpose.'],
      takeaway: 'The repetition creates momentum and emphasizes collective responsibility for change.',
    },
    'integration-knowledge': {
      prompt: 'Vine example: A report claims a restoration project increased fish populations. A graph shows an increase, while a methods note says two sampling sites changed. How should the sources be integrated?',
      steps: ['Use the graph to identify the reported pattern.', 'Use the methods note to identify a limit on comparison.', 'Choose a conclusion that recognizes both support and uncertainty.'],
      takeaway: 'The data supports an increase, but changed sampling sites limit how confidently it can be attributed or compared.',
    },
    'language-vocabulary': {
      prompt: 'Vine example: “The proposal was not a cure-all; at best, it was a useful first step.” What does cure-all mean in context?',
      steps: ['Use the semicolon to compare the two descriptions.', 'Contrast a complete solution with a first step.', 'Apply the figurative meaning to the proposal.'],
      takeaway: 'A cure-all is something claimed to solve every part of a problem.',
    },
  },
}

export function getElaSkillLesson(skill: ElaSkill, grade: GradeLevel) {
  const meta = SKILL_META[skill]
  const profile = GRADE_PROFILES[grade]
  return {
    emoji: meta.emoji,
    title: meta.title,
    description: meta.shortDescription,
    overview: `${profile.overview} In this section, focus on ${meta.title.toLowerCase()}: ${meta.shortDescription.toLowerCase()}`,
    learningGoals: meta.goals.map(goal => `In a Grade ${grade} passage, ${goal}.`),
    strategy: `${meta.strategy} Grade ${grade} evidence check: ${profile.evidenceMove} Independent-reading move: ${profile.independenceMove}`,
    workedExample: WORKED_EXAMPLES[grade][skill],
  }
}

export function buildElaExamSection(
  input: SectionInput,
  grade: GradeLevel,
  focusSkill: ElaSkill,
): ElaExamSectionDefinition {
  const lesson = getElaSkillLesson(focusSkill, grade)
  const skillLessons = input.skills.map(skill => ({
    skill,
    ...getElaSkillLesson(skill, grade),
  }))
  return {
    slug: `questions-${input.questionStart}-${input.questionEnd}`,
    stimulusId: input.stimulusId,
    passageLabel: input.passageLabel,
    questionStart: input.questionStart,
    questionEnd: input.questionEnd,
    passage: input.passage,
    passageReferences: input.passageReferences,
    focusSkill,
    skills: input.skills,
    skillLessons,
    standards: input.standards,
    emoji: lesson.emoji,
    title: `${input.passageLabel}: ${lesson.title}`,
    description: lesson.description,
    overview: lesson.overview,
    learningGoals: lesson.learningGoals,
    strategy: lesson.strategy,
    workedExample: lesson.workedExample,
    questionIds: input.questionIds,
  }
}
