import type { Module } from '@/types'

const module: Module = {
  slug: 'sentence-structure',
  track: 'ela',
  titleEn: 'Building Sentences',
  descriptionEn: 'Learn how to build longer, clearer sentences using "because" and "I want".',
  icon: 'MessageSquare',
  vocab: [
    {
      id: 'because',
      en: 'because',
      exampleEn: 'I am studying English because I want a better job.',
    },
    {
      id: 'i-want',
      en: 'I want...',
      exampleEn: 'I want to learn English. I want a coffee, please.',
    },
    {
      id: 'i-need',
      en: 'I need...',
      exampleEn: 'I need help with my English. I need a doctor.',
    },
    {
      id: 'i-would-like',
      en: 'I would like...',
      exampleEn: 'I would like a glass of water, please.',
    },
    {
      id: 'can-you-help',
      en: 'Can you help me?',
      exampleEn: 'Excuse me, can you help me? I am lost.',
    },
    {
      id: 'i-dont-understand',
      en: 'I don\'t understand',
      exampleEn: 'I don\'t understand. Can you speak more slowly?',
    },
    {
      id: 'please-repeat',
      en: 'Please repeat that',
      exampleEn: 'I\'m sorry, please repeat that more slowly.',
    },
    {
      id: 'how-do-you-say',
      en: 'How do you say... in English?',
      exampleEn: 'How do you say "autobús" in English?',
    },
  ],
  quiz: [
    {
      id: 'q1',
      type: 'multiple-choice',
      promptEn: 'Which word connects a reason to a sentence?',
      answer: 'because',
      options: ['because', 'but', 'and', 'so'],
    },
    {
      id: 'q2',
      type: 'multiple-choice',
      promptEn: 'Which is more polite when ordering at a restaurant?',
      answer: 'I would like a coffee, please',
      options: ['I would like a coffee, please', 'I want coffee', 'Give me coffee', 'Coffee now'],
    },
    {
      id: 'q3',
      type: 'multiple-choice',
      promptEn: 'Which phrase means you did not understand something?',
      answer: 'I don\'t understand',
      options: ['I don\'t understand', 'I don\'t know', 'I can\'t speak', 'I need help'],
    },
    {
      id: 'q4',
      type: 'multiple-choice',
      promptEn: 'Complete the sentence: "I am learning English ___ I want a better job."',
      answer: 'because',
      options: ['because', 'but', 'and', 'or'],
    },
    {
      id: 'q5',
      type: 'multiple-choice',
      promptEn: 'How do you ask someone to repeat something?',
      answer: 'Please repeat that',
      options: ['Please repeat that', 'I don\'t understand', 'Can you help me?', 'How do you say...?'],
    },
  ],
  teachingScenarios: [
    {
      label: 'Part 1: Building full sentences',
      text: 'You are having a conversation with someone in English but you keep forgetting how to build full sentences. You know individual words but struggle to connect them together and to express what you want or need.',
    },
  ],
  worksheet: [
    { id: 'w1', promptEn: 'I am learning English ____ I want a better job.', answer: 'because' },
    { id: 'w2', promptEn: 'I ____ help with my English.', answer: 'need' },
    { id: 'w3', promptEn: '____ you help me?', answer: 'Can' },
  ],
}

export default module
