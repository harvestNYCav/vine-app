import type { Module } from '@/types'

const module: Module = {
  slug: 'parts-of-speech',
  track: 'ela',
  titleEn: 'Parts of Speech',
  descriptionEn: 'Practice nouns, verbs, adjectives, and adverbs in clear sentences.',
  icon: 'Pencil',
  vocab: [
    {
      id: 'noun',
      en: 'noun',
      exampleEn: 'A noun names a person, place, thing, or idea.',
    },
    {
      id: 'verb',
      en: 'verb',
      exampleEn: 'A verb shows action or being.',
    },
    {
      id: 'adjective',
      en: 'adjective',
      exampleEn: 'An adjective describes a noun.',
    },
    {
      id: 'adverb',
      en: 'adverb',
      exampleEn: 'An adverb describes a verb, often telling how.',
    },
    {
      id: 'sentence',
      en: 'sentence',
      exampleEn: 'A sentence shares a complete thought.',
    },
  ],
  quiz: [
    {
      id: 'q1',
      type: 'multiple-choice',
      promptEn: 'In "The dog runs," which word is the verb?',
      answer: 'runs',
      options: ['runs', 'dog', 'the', 'The dog'],
    },
    {
      id: 'q2',
      type: 'multiple-choice',
      promptEn: 'A noun names:',
      answer: 'a person, place, thing, or idea',
      options: ['a person, place, thing, or idea', 'only an action', 'only a color', 'only a question'],
    },
    {
      id: 'q3',
      type: 'multiple-choice',
      promptEn: 'In "the bright sun," which word is the adjective?',
      answer: 'bright',
      options: ['bright', 'sun', 'the', 'the bright'],
    },
    {
      id: 'q4',
      type: 'multiple-choice',
      promptEn: 'Which word can describe how someone walked?',
      answer: 'quickly',
      options: ['quickly', 'table', 'green', 'teacher'],
    },
  ],
  teachingScenarios: [
    {
      label: 'Part 1: Naming parts of speech',
      text: 'You are a student writing sentences for school. You know the words, but you need help naming each part of speech and making the sentence complete.',
    },
  ],
  worksheet: [
    { id: 'w1', promptEn: 'A ____ shows action or being.', answer: 'verb' },
    { id: 'w2', promptEn: 'A ____ names a person, place, thing, or idea.', answer: 'noun' },
    { id: 'w3', promptEn: 'An ____ describes a noun.', answer: 'adjective' },
  ],
}

export default module
