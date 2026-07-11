import type { Module } from '@/types'

const module: Module = {
  slug: 'parts-of-speech',
  track: 'ela',
  titleEn: 'Parts of Speech',
  titleEs: 'Partes de la oración',
  descriptionEn: 'Practice nouns, verbs, adjectives, and adverbs in clear sentences.',
  descriptionEs: 'Practica sustantivos, verbos, adjetivos y adverbios en oraciones claras.',
  icon: 'Pencil',
  vocab: [
    {
      id: 'noun',
      en: 'noun',
      es: 'sustantivo',
      exampleEn: 'A noun names a person, place, thing, or idea.',
      exampleEs: 'Un sustantivo nombra una persona, lugar, cosa o idea.',
    },
    {
      id: 'verb',
      en: 'verb',
      es: 'verbo',
      exampleEn: 'A verb shows action or being.',
      exampleEs: 'Un verbo muestra acción o estado.',
    },
    {
      id: 'adjective',
      en: 'adjective',
      es: 'adjetivo',
      exampleEn: 'An adjective describes a noun.',
      exampleEs: 'Un adjetivo describe un sustantivo.',
    },
    {
      id: 'adverb',
      en: 'adverb',
      es: 'adverbio',
      exampleEn: 'An adverb describes a verb, often telling how.',
      exampleEs: 'Un adverbio describe un verbo, muchas veces diciendo cómo.',
    },
    {
      id: 'sentence',
      en: 'sentence',
      es: 'oración',
      exampleEn: 'A sentence shares a complete thought.',
      exampleEs: 'Una oración comparte una idea completa.',
    },
  ],
  quiz: [
    {
      id: 'q1',
      type: 'multiple-choice',
      promptEn: 'In "The dog runs," which word is the verb?',
      promptEs: 'En "The dog runs", ¿qué palabra es el verbo?',
      answer: 'runs',
      options: ['runs', 'dog', 'the', 'The dog'],
    },
    {
      id: 'q2',
      type: 'multiple-choice',
      promptEn: 'A noun names:',
      promptEs: 'Un sustantivo nombra:',
      answer: 'a person, place, thing, or idea',
      options: ['a person, place, thing, or idea', 'only an action', 'only a color', 'only a question'],
    },
    {
      id: 'q3',
      type: 'multiple-choice',
      promptEn: 'In "the bright sun," which word is the adjective?',
      promptEs: 'En "the bright sun", ¿qué palabra es el adjetivo?',
      answer: 'bright',
      options: ['bright', 'sun', 'the', 'the bright'],
    },
    {
      id: 'q4',
      type: 'multiple-choice',
      promptEn: 'Which word can describe how someone walked?',
      promptEs: '¿Qué palabra puede describir cómo caminó alguien?',
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
    { id: 'w1', promptEn: 'A ____ shows action or being.', promptEs: 'Un verbo muestra acción o estado. (A ____ shows action or being.)', answer: 'verb' },
    { id: 'w2', promptEn: 'A ____ names a person, place, thing, or idea.', promptEs: 'Un sustantivo nombra una persona, lugar, cosa o idea. (A ____ names a person, place, thing, or idea.)', answer: 'noun' },
    { id: 'w3', promptEn: 'An ____ describes a noun.', promptEs: 'Un adjetivo describe un sustantivo. (An ____ describes a noun.)', answer: 'adjective' },
  ],
}

export default module
