import type { Module } from '@/types'

const module: Module = {
  slug: 'sentence-structure',
  track: 'ela',
  titleEn: 'Building Sentences',
  titleEs: 'Construir Oraciones',
  descriptionEn: 'Learn how to build longer, clearer sentences using "because" and "I want".',
  descriptionEs: 'Aprende a construir oraciones más largas y claras usando "because" e "I want".',
  icon: 'MessageSquare',
  vocab: [
    {
      id: 'because',
      en: 'because',
      es: 'porque',
      exampleEn: 'I am studying English because I want a better job.',
      exampleEs: 'Estoy estudiando inglés porque quiero un mejor trabajo.',
    },
    {
      id: 'i-want',
      en: 'I want...',
      es: 'Quiero...',
      exampleEn: 'I want to learn English. I want a coffee, please.',
      exampleEs: 'Quiero aprender inglés. Quiero un café, por favor.',
    },
    {
      id: 'i-need',
      en: 'I need...',
      es: 'Necesito...',
      exampleEn: 'I need help with my English. I need a doctor.',
      exampleEs: 'Necesito ayuda con mi inglés. Necesito un médico.',
    },
    {
      id: 'i-would-like',
      en: 'I would like...',
      es: 'Me gustaría... / Quisiera...',
      exampleEn: 'I would like a glass of water, please.',
      exampleEs: 'Me gustaría un vaso de agua, por favor.',
    },
    {
      id: 'can-you-help',
      en: 'Can you help me?',
      es: '¿Me puede ayudar?',
      exampleEn: 'Excuse me, can you help me? I am lost.',
      exampleEs: 'Disculpe, ¿me puede ayudar? Estoy perdido.',
    },
    {
      id: 'i-dont-understand',
      en: 'I don\'t understand',
      es: 'No entiendo',
      exampleEn: 'I don\'t understand. Can you speak more slowly?',
      exampleEs: 'No entiendo. ¿Puede hablar más despacio?',
    },
    {
      id: 'please-repeat',
      en: 'Please repeat that',
      es: 'Por favor repita eso',
      exampleEn: 'I\'m sorry, please repeat that more slowly.',
      exampleEs: 'Lo siento, por favor repita eso más despacio.',
    },
    {
      id: 'how-do-you-say',
      en: 'How do you say... in English?',
      es: '¿Cómo se dice... en inglés?',
      exampleEn: 'How do you say "autobús" in English?',
      exampleEs: '¿Cómo se dice "autobús" en inglés?',
    },
  ],
  quiz: [
    {
      id: 'q1',
      type: 'multiple-choice',
      promptEn: '"Porque" in English is:',
      promptEs: '"Porque" en inglés es:',
      answer: 'because',
      options: ['because', 'but', 'and', 'so'],
    },
    {
      id: 'q2',
      type: 'multiple-choice',
      promptEn: 'Which is more polite when ordering at a restaurant?',
      promptEs: '¿Cuál es más educado al ordenar en un restaurante?',
      answer: 'I would like a coffee, please',
      options: ['I would like a coffee, please', 'I want coffee', 'Give me coffee', 'Coffee now'],
    },
    {
      id: 'q3',
      type: 'multiple-choice',
      promptEn: 'How do you say "No entiendo"?',
      promptEs: '¿Cómo se dice "No entiendo"?',
      answer: 'I don\'t understand',
      options: ['I don\'t understand', 'I don\'t know', 'I can\'t speak', 'I need help'],
    },
    {
      id: 'q4',
      type: 'multiple-choice',
      promptEn: 'Complete the sentence: "I am learning English ___ I want a better job."',
      promptEs: 'Completa la oración: "I am learning English ___ I want a better job."',
      answer: 'because',
      options: ['because', 'but', 'and', 'or'],
    },
    {
      id: 'q5',
      type: 'multiple-choice',
      promptEn: 'How do you ask someone to repeat something?',
      promptEs: '¿Cómo le pides a alguien que repita algo?',
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
    { id: 'w1', promptEn: 'I am learning English ____ I want a better job.', promptEs: 'Estoy aprendiendo inglés porque quiero un mejor trabajo. (I am learning English ____ I want a better job.)', answer: 'because' },
    { id: 'w2', promptEn: 'I ____ help with my English.', promptEs: 'Necesito ayuda con mi inglés. (I ____ help with my English.)', answer: 'need' },
    { id: 'w3', promptEn: '____ you help me?', promptEs: '¿Me puede ayudar? (____ you help me?)', answer: 'Can' },
  ],
}

export default module
