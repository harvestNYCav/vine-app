import type { Module } from '@/types'

const module: Module = {
  slug: 'tenses',
  track: 'esl',
  titleEn: 'Tenses',
  titleEs: 'Los Tiempos Verbales',
  descriptionEn: 'Learn how to talk about the present, past, and future in English.',
  descriptionEs: 'Aprende a hablar del presente, pasado y futuro en inglés.',
  icon: 'Clock',
  vocab: [
    { id: 'today-now', en: 'today / now', es: 'hoy / ahora',
      exampleEn: 'I am working today.', exampleEs: 'Estoy trabajando hoy.' },
    { id: 'yesterday', en: 'yesterday', es: 'ayer',
      exampleEn: 'I worked yesterday.', exampleEs: 'Trabajé ayer.' },
    { id: 'tomorrow', en: 'tomorrow', es: 'mañana',
      exampleEn: 'I will work tomorrow.', exampleEs: 'Trabajaré mañana.' },
    { id: 'i-work-worked-will-work', en: 'I work / I worked / I will work', es: 'Trabajo / Trabajé / Trabajaré',
      exampleEn: 'I work every day. I worked yesterday. I will work tomorrow.', exampleEs: 'Trabajo todos los días. Trabajé ayer. Trabajaré mañana.' },
    { id: 'i-am-working', en: 'I am ...-ing (right now)', es: 'Estoy + -ando/-iendo (ahora mismo)',
      exampleEn: 'I am working right now.', exampleEs: 'Estoy trabajando ahora mismo.' },
    { id: 'was-were', en: 'was / were', es: 'estaba (yo, él, ella) / estaban (tú, nosotros, ellos)',
      exampleEn: 'I was at home. They were at work.', exampleEs: 'Yo estaba en casa. Ellos estaban en el trabajo.' },
    { id: 'will', en: 'will', es: '(verbo en futuro)',
      exampleEn: 'I will call you tomorrow.', exampleEs: 'Te llamaré mañana.' },
    { id: 'go-went', en: 'go / went', es: 'ir / fui (pasado)',
      exampleEn: 'I go to church every Sunday. Yesterday I went to the store.', exampleEs: 'Voy a la iglesia todos los domingos. Ayer fui a la tienda.' },
    { id: 'every-day', en: 'every day', es: 'todos los días',
      exampleEn: 'I take the bus every day.', exampleEs: 'Tomo el autobús todos los días.' },
    { id: 'last-week', en: 'last week', es: 'la semana pasada',
      exampleEn: 'I saw the doctor last week.', exampleEs: 'Vi al doctor la semana pasada.' },
    { id: 'next-week', en: 'next week', es: 'la próxima semana',
      exampleEn: 'I will start my new job next week.', exampleEs: 'Empezaré mi nuevo trabajo la próxima semana.' },
    { id: 'if-then', en: 'If..., I will...', es: 'Si..., (verbo en futuro)...',
      exampleEn: 'If it rains, I will stay home.', exampleEs: 'Si llueve, me quedaré en casa.' },
    { id: 'was-built-passive', en: 'The house was built in 1990.', es: 'La casa fue construida en 1990.',
      exampleEn: 'The house was built in 1990.', exampleEs: 'La casa fue construida en 1990.' },
    { id: 'always-sometimes-never', en: 'always / sometimes / never', es: 'siempre / a veces / nunca',
      exampleEn: 'I always work on Mondays. I never work on Sundays.', exampleEs: 'Siempre trabajo los lunes. Nunca trabajo los domingos.' },
  ],
  grammar: [
    {
      titleEn: 'Three basic tenses: present, past, future',
      titleEs: 'Tres tiempos básicos: presente, pasado, futuro',
      explanationEn: 'Use the simple present for routines and facts: I work. Use the simple past for things already finished, often with "-ed": I worked. Use "will" + the base verb for the future: I will work. Some verbs change form in the past instead of adding "-ed," like go → went.',
      explanationEs: 'Usa el presente simple para rutinas y hechos: I work. Usa el pasado simple para cosas ya terminadas, a menudo con "-ed": I worked. Usa "will" + el verbo base para el futuro: I will work. Algunos verbos cambian de forma en el pasado en vez de agregar "-ed," como go → went.',
      examples: [
        { en: 'I work every day. I worked yesterday. I will work tomorrow.', es: 'Trabajo todos los días. Trabajé ayer. Trabajaré mañana.' },
        { en: 'I go to church every Sunday. Yesterday I went to the store.', es: 'Voy a la iglesia todos los domingos. Ayer fui a la tienda.' },
      ],
    },
    {
      titleEn: 'Right now vs every day: "am + -ing" vs simple present',
      titleEs: 'Ahora mismo vs todos los días: "am + -ing" vs presente simple',
      explanationEn: 'Use "am/is/are + -ing" for something happening at this exact moment: I am working right now. Use the simple present for habits and things that are always true: I work every day. I always work on Mondays.',
      explanationEs: 'Usa "am/is/are + -ing" para algo que sucede en este momento exacto: I am working right now. Usa el presente simple para hábitos y cosas que siempre son verdad: I work every day. I always work on Mondays.',
      examples: [
        { en: 'I am working right now.', es: 'Estoy trabajando ahora mismo.' },
        { en: 'I always work on Mondays. I never work on Sundays.', es: 'Siempre trabajo los lunes. Nunca trabajo los domingos.' },
      ],
    },
  ],
  quiz: [
    { id: 'q1', type: 'multiple-choice', promptEn: '"Ayer" in English is:', promptEs: '"Ayer" en inglés es:',
      answer: 'yesterday', options: ['yesterday', 'today', 'tomorrow', 'always'] },
    { id: 'q2', type: 'multiple-choice', promptEn: 'Complete: "I ___ to the store yesterday."', promptEs: 'Completa: "I ___ to the store yesterday."',
      answer: 'went', options: ['went', 'go', 'will go', 'going'] },
    { id: 'q3', type: 'multiple-choice', promptEn: 'Complete: "I ___ work tomorrow."', promptEs: 'Completa: "I ___ work tomorrow."',
      answer: 'will', options: ['will', 'was', 'went', 'am'] },
    { id: 'q4', type: 'multiple-choice', promptEn: 'Which sentence describes something happening right now?', promptEs: '¿Qué oración describe algo que pasa en este momento?',
      answer: 'I am working', options: ['I am working', 'I worked', 'I will work', 'I work every day'] },
    { id: 'q5', type: 'multiple-choice', promptEn: '"Si llueve, me quedaré en casa" in English is:', promptEs: '"Si llueve, me quedaré en casa" en inglés es:',
      answer: 'If it rains, I will stay home', options: ['If it rains, I will stay home', 'It rained, I stayed home', 'It is raining now', 'I will rain today'] },
    { id: 'q6', type: 'multiple-choice', promptEn: 'Complete: "I ___ at home yesterday."', promptEs: 'Completa: "I ___ at home yesterday."',
      answer: 'was', options: ['was', 'am', 'will', 'go'] },
    { id: 'q7', type: 'multiple-choice', promptEn: 'Which word signals the future tense?', promptEs: '¿Qué palabra señala el tiempo futuro?',
      answer: 'will', options: ['will', 'yesterday', 'always', 'was'] },
    { id: 'q8', type: 'multiple-choice', promptEn: '"La semana pasada" in English is:', promptEs: '"La semana pasada" en inglés es:',
      answer: 'last week', options: ['last week', 'next week', 'every day', 'tomorrow'] },
  ],
  teachingScenarios: [
    { label: 'Part 1: Your daily routine',
      text: 'Talk about what you do every day.',
      wordBank: [
        { en: 'work', es: 'trabajar' },
        { en: 'walk', es: 'caminar' },
        { en: 'cook', es: 'cocinar' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: 'What do you do every day?', es: '¿Qué haces todos los días?' },
          { speaker: 'student', en: 'I work every day.', es: 'Trabajo todos los días.' },
        ],
        [
          { speaker: 'tutor', en: 'How do you get to work?', es: '¿Cómo llegas al trabajo?' },
          { speaker: 'student', en: 'I take the bus.', es: 'Tomo el autobús.' },
        ],
        [
          { speaker: 'tutor', en: 'What are you doing right now?', es: '¿Qué estás haciendo ahora mismo?' },
          { speaker: 'student', en: 'I am working right now.', es: 'Estoy trabajando ahora mismo.' },
        ],
      ] },
    { label: 'Part 2: What happened yesterday or last week',
      text: 'Talk about something that already happened.',
      wordBank: [
        { en: 'yesterday', es: 'ayer' },
        { en: 'last week', es: 'la semana pasada' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: 'What did you do yesterday?', es: '¿Qué hiciste ayer?' },
          { speaker: 'student', en: 'I worked yesterday.', es: 'Ayer trabajé.' },
        ],
        [
          { speaker: 'tutor', en: 'Did anything happen last week?', es: '¿Pasó algo la semana pasada?' },
          { speaker: 'student', en: 'I saw the doctor last week.', es: 'Vi al doctor la semana pasada.' },
        ],
        [
          { speaker: 'tutor', en: 'Where were you?', es: '¿Dónde estabas?' },
          { speaker: 'student', en: "I was at the doctor's office.", es: 'Estaba en el consultorio del doctor.' },
        ],
      ] },
    { label: 'Part 3: Future plans and a simple "if"',
      text: 'Talk about plans for tomorrow and next week.',
      wordBank: [
        { en: 'tomorrow', es: 'mañana' },
        { en: 'next week', es: 'la próxima semana' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: 'What are your plans for tomorrow?', es: '¿Cuáles son tus planes para mañana?' },
          { speaker: 'student', en: 'I will work tomorrow.', es: 'Trabajaré mañana.' },
        ],
        [
          { speaker: 'tutor', en: 'What about next week?', es: '¿Y la próxima semana?' },
          { speaker: 'student', en: 'I will start my new job.', es: 'Empezaré mi nuevo trabajo.' },
        ],
        [
          { speaker: 'tutor', en: 'What will you do if it rains?', es: '¿Qué harás si llueve?' },
          { speaker: 'student', en: 'If it rains, I will stay home.', es: 'Si llueve, me quedaré en casa.' },
        ],
      ] },
  ],
  practiceActivities: [
    {
      titleEn: 'Yesterday, Today, Tomorrow',
      titleEs: 'Ayer, Hoy, Mañana',
      instructionsEn: 'Say one activity in the past and the future.',
      instructionsEs: 'Di una actividad en el pasado y en el futuro.',
      wordBank: [
        { en: 'cook', es: 'cocinar' },
        { en: 'clean', es: 'limpiar' },
        { en: 'study', es: 'estudiar' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: 'Yesterday, you...?', es: '¿Ayer, tú...?' },
          { speaker: 'student', en: 'I cooked yesterday.', es: 'Ayer cociné.' },
        ],
        [
          { speaker: 'tutor', en: 'Tomorrow, you will...?', es: '¿Mañana, tú...?' },
          { speaker: 'student', en: 'I will cook tomorrow.', es: 'Cocinaré mañana.' },
        ],
      ],
    },
    {
      titleEn: 'Tell Me About Last Week',
      titleEs: 'Cuéntame Sobre la Semana Pasada',
      instructionsEn: 'Answer real questions about last week.',
      instructionsEs: 'Responde preguntas reales sobre la semana pasada.',
      chunks: [
        [
          { speaker: 'tutor', en: 'Where were you last week?', es: '¿Dónde estabas la semana pasada?' },
          { speaker: 'student', en: 'I was at home.', es: 'Estaba en casa.' },
        ],
        [
          { speaker: 'tutor', en: 'What did you do?', es: '¿Qué hiciste?' },
          { speaker: 'student', en: 'I cleaned my house.', es: 'Limpié mi casa.' },
        ],
      ],
    },
    {
      titleEn: 'My Plans',
      titleEs: 'Mis Planes',
      instructionsEn: 'Share one real plan for next week.',
      instructionsEs: 'Comparte un plan real para la próxima semana.',
      chunks: [
        [
          { speaker: 'tutor', en: 'What is one plan for next week?', es: '¿Cuál es un plan para la próxima semana?' },
          { speaker: 'student', en: 'I will visit my family.', es: 'Visitaré a mi familia.' },
        ],
        [
          { speaker: 'tutor', en: 'When will you visit them?', es: '¿Cuándo los visitarás?' },
          { speaker: 'student', en: 'If I have time, I will visit them.', es: 'Si tengo tiempo, los visitaré.' },
        ],
      ],
    },
  ],
  worksheet: [
    { id: 'w1', promptEn: 'I ____ to church every Sunday.', promptEs: 'Voy a la iglesia todos los domingos. (I ____ to church every Sunday.)', answer: 'go' },
    { id: 'w2', promptEn: 'Yesterday I ____ to the store.', promptEs: 'Ayer fui a la tienda. (Yesterday I ____ to the store.)', answer: 'went' },
    { id: 'w3', promptEn: 'Tomorrow I ____ work.', promptEs: 'Mañana trabajaré. (Tomorrow I ____ work.)', answer: 'will' },
    { id: 'w4', promptEn: 'Right now I ____ working.', promptEs: 'Ahora mismo estoy trabajando. (Right now I ____ working.)', answer: 'am' },
    { id: 'w5', promptEn: 'If it rains, I ____ stay home.', promptEs: 'Si llueve, me quedaré en casa. (If it rains, I ____ stay home.)', answer: 'will' },
  ],
}

export default module
