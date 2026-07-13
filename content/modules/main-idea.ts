import type { Module } from '@/types'

const module: Module = {
  slug: 'main-idea',
  track: 'ela',
  titleEn: 'Main Idea',
  descriptionEn: 'Find what a paragraph is mostly about and use details as evidence.',
  icon: 'BookOpen',
  vocab: [
    {
      id: 'main-idea',
      en: 'main idea',
      exampleEn: 'The main idea is what the story is mostly about.',
    },
    {
      id: 'detail',
      en: 'detail',
      exampleEn: 'A detail tells more about the main idea.',
    },
    {
      id: 'evidence',
      en: 'evidence',
      exampleEn: 'Use evidence from the text to prove your answer.',
    },
    {
      id: 'summarize',
      en: 'summarize',
      exampleEn: 'Summarize the paragraph in one sentence.',
    },
    {
      id: 'paragraph',
      en: 'paragraph',
      exampleEn: 'A paragraph has sentences about one topic.',
    },
  ],
  quiz: [
    {
      id: 'q1',
      type: 'multiple-choice',
      promptEn: 'The main idea tells:',
      answer: 'what the text is mostly about',
      options: ['what the text is mostly about', 'one small fact', 'the author name', 'a spelling rule'],
    },
    {
      id: 'q2',
      type: 'multiple-choice',
      promptEn: 'Which word means a fact from the text that supports an answer?',
      answer: 'evidence',
      options: ['evidence', 'paragraph', 'title', 'question'],
    },
    {
      id: 'q3',
      type: 'multiple-choice',
      promptEn: 'A detail should:',
      answer: 'support the main idea',
      options: ['support the main idea', 'change the topic', 'be unrelated', 'repeat the title only'],
    },
    {
      id: 'q4',
      type: 'multiple-choice',
      promptEn: 'To summarize means to:',
      answer: 'tell the most important points briefly',
      options: ['tell the most important points briefly', 'copy every sentence', 'guess without reading', 'list only names'],
    },
  ],
  teachingScenarios: [
    {
      label: 'Part 1: Finding the main idea',
      text: 'You are a student reading a short paragraph. You can find facts, but you need help explaining the main idea and choosing evidence that supports it.',
    },
  ],
  worksheet: [
    { id: 'w1', promptEn: 'The ____ idea is what the text is mostly about.', answer: 'main' },
    { id: 'w2', promptEn: 'Use ____ from the text to prove your answer.', answer: 'evidence' },
    { id: 'w3', promptEn: 'A ____ has sentences about one topic.', answer: 'paragraph' },
  ],
}

export default module
