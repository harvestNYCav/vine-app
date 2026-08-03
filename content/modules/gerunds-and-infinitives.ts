import type { Module } from '@/types'

const module: Module = {
  slug: 'gerunds-and-infinitives',
  track: 'esl',
  titleEn: 'Gerunds and Infinitives',
  titleEs: 'Gerundios e Infinitivos',
  descriptionEn: 'Learn how to talk about things you like doing, need to do, and want to do.',
  descriptionEs: 'Aprende a hablar de cosas que te gusta hacer, necesitas hacer y quieres hacer.',
  icon: 'Repeat',
  vocab: [
    { id: 'i-like-ing', en: 'I like ...-ing', es: 'Me gusta + gerundio',
      exampleEn: 'I like cooking.', exampleEs: 'Me gusta cocinar.' },
    { id: 'i-want-to', en: 'I want to...', es: 'Quiero...',
      exampleEn: 'I want to learn English.', exampleEs: 'Quiero aprender inglés.' },
    { id: 'i-need-to', en: 'I need to...', es: 'Necesito...',
      exampleEn: 'I need to go to work.', exampleEs: 'Necesito ir al trabajo.' },
    { id: 'i-have-to', en: 'I have to...', es: 'Tengo que...',
      exampleEn: 'I have to pick up my kids.', exampleEs: 'Tengo que recoger a mis hijos.' },
    { id: 'i-enjoy-ing', en: 'I enjoy ...-ing', es: 'Disfruto + gerundio',
      exampleEn: 'I enjoy walking in the park.', exampleEs: 'Disfruto caminar en el parque.' },
    { id: 'i-stopped-ing', en: 'I stopped ...-ing', es: 'Dejé de...',
      exampleEn: 'I stopped smoking.', exampleEs: 'Dejé de fumar.' },
    { id: 'i-started-ing', en: 'I started ...-ing', es: 'Empecé a...',
      exampleEn: 'I started studying English.', exampleEs: 'Empecé a estudiar inglés.' },
    { id: 'working', en: 'working', es: 'trabajando / el trabajar',
      exampleEn: 'Working helps me support my family.', exampleEs: 'Trabajar me ayuda a mantener a mi familia.' },
    { id: 'reading', en: 'reading', es: 'leyendo / el leer',
      exampleEn: 'Reading helps me learn new words.', exampleEs: 'Leer me ayuda a aprender palabras nuevas.' },
    { id: 'cooking', en: 'cooking', es: 'cocinando / el cocinar',
      exampleEn: 'Cooking for my family makes me happy.', exampleEs: 'Cocinar para mi familia me hace feliz.' },
    { id: 'i-love-to', en: 'I love to...', es: 'Me encanta...',
      exampleEn: 'I love to dance.', exampleEs: 'Me encanta bailar.' },
    { id: 'i-like-to', en: 'I like to...', es: 'Me gusta...',
      exampleEn: 'I like to sing.', exampleEs: 'Me gusta cantar.' },
    { id: 'i-plan-to', en: 'I plan to...', es: 'Planeo...',
      exampleEn: 'I plan to study tonight.', exampleEs: 'Planeo estudiar esta noche.' },
    { id: 'i-hope-to', en: 'I hope to...', es: 'Espero...',
      exampleEn: 'I hope to find a good job.', exampleEs: 'Espero encontrar un buen trabajo.' },
  ],
  grammar: [
    {
      titleEn: 'Verb + -ing after enjoy, stop, start',
      titleEs: 'Verbo + -ing después de enjoy, stop, start',
      explanationEn: 'Some verbs are always followed by another verb ending in "-ing" (a gerund): enjoy, stop, start, keep. "Like" and "love" are flexible — both forms are correct: I like cooking = I like to cook.',
      explanationEs: 'Algunos verbos siempre van seguidos de otro verbo terminado en "-ing" (un gerundio): enjoy, stop, start, keep. "Like" y "love" son flexibles — ambas formas son correctas: I like cooking = I like to cook.',
      examples: [
        { en: 'I enjoy walking in the park.', es: 'Disfruto caminar en el parque.' },
        { en: 'I stopped smoking.', es: 'Dejé de fumar.' },
        { en: 'I started studying English.', es: 'Empecé a estudiar inglés.' },
      ],
    },
    {
      titleEn: 'Verb + to + verb after want, need, have, plan, hope',
      titleEs: 'Verbo + to + verbo después de want, need, have, plan, hope',
      explanationEn: 'Other verbs are always followed by "to" + the base form of the next verb (an infinitive): want, need, have, plan, hope. Never add "-ing" after these.',
      explanationEs: 'Otros verbos siempre van seguidos de "to" + la forma base del siguiente verbo (un infinitivo): want, need, have, plan, hope. Nunca agregues "-ing" después de estos.',
      examples: [
        { en: 'I want to learn English.', es: 'Quiero aprender inglés.' },
        { en: 'I need to go to work.', es: 'Necesito ir al trabajo.' },
        { en: 'I have to pick up my kids.', es: 'Tengo que recoger a mis hijos.' },
        { en: 'I hope to find a good job.', es: 'Espero encontrar un buen trabajo.' },
      ],
    },
  ],
  quiz: [
    { id: 'q1', type: 'multiple-choice', promptEn: 'How do you say "Necesito ir al trabajo"?', promptEs: '¿Cómo se dice "Necesito ir al trabajo"?',
      answer: 'I need to go to work', options: ['I need to go to work', 'I want to go to work', 'I like to go to work', 'I stopped going to work'] },
    { id: 'q2', type: 'multiple-choice', promptEn: 'Complete: "I like ___." (cocinar)', promptEs: 'Completa: "I like ___." (cocinar)',
      answer: 'cooking', options: ['cooking', 'cook', 'to cooking', 'cooked'] },
    { id: 'q3', type: 'multiple-choice', promptEn: '"Tengo que" in English is:', promptEs: '"Tengo que" en inglés es:',
      answer: 'I have to', options: ['I have to', 'I like to', 'I hope to', 'I stopped'] },
    { id: 'q4', type: 'multiple-choice', promptEn: 'Complete: "I want ___ learn English."', promptEs: 'Completa: "I want ___ learn English."',
      answer: 'to', options: ['to', 'ing', 'for', 'at'] },
    { id: 'q5', type: 'multiple-choice', promptEn: '"Empecé a estudiar inglés" in English is:', promptEs: '"Empecé a estudiar inglés" en inglés es:',
      answer: 'I started studying English', options: ['I started studying English', 'I stopped studying English', 'I need to study English', 'I enjoy English'] },
    { id: 'q6', type: 'multiple-choice', promptEn: 'Complete: "I ___ smoking." (Dejé de fumar)', promptEs: 'Completa: "I ___ smoking." (Dejé de fumar)',
      answer: 'stopped', options: ['stopped', 'stop', 'stopping', 'to stop'] },
    { id: 'q7', type: 'multiple-choice', promptEn: 'Complete: "I hope ___ find a good job."', promptEs: 'Completa: "I hope ___ find a good job."',
      answer: 'to', options: ['to', 'ing', 'for', 'at'] },
    { id: 'q8', type: 'multiple-choice', promptEn: 'Which verb is always followed by "-ing," not "to"?', promptEs: '¿Qué verbo siempre va seguido de "-ing," no "to"?',
      answer: 'enjoy', options: ['enjoy', 'want', 'need', 'hope'] },
  ],
  teachingScenarios: [
    { label: 'Part 1: Talking about things you enjoy',
      text: 'Talk about what you like doing in your free time.',
      wordBank: [
        { en: 'cooking', es: 'cocinar' },
        { en: 'dancing', es: 'bailar' },
        { en: 'reading', es: 'leer' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: 'What do you like doing?', es: '¿Qué te gusta hacer?' },
          { speaker: 'student', en: 'I like cooking.', es: 'Me gusta cocinar.' },
        ],
        [
          { speaker: 'tutor', en: 'Do you enjoy it?', es: '¿Lo disfrutas?' },
          { speaker: 'student', en: 'Yes, I enjoy cooking a lot.', es: 'Sí, disfruto mucho cocinar.' },
        ],
        [
          { speaker: 'tutor', en: 'What else do you love to do?', es: '¿Qué más te encanta hacer?' },
          { speaker: 'student', en: 'I love to dance.', es: 'Me encanta bailar.' },
        ],
      ] },
    { label: 'Part 2: Talking about daily obligations',
      text: 'Talk about things you need to do today.',
      wordBank: [
        { en: 'go to work', es: 'ir al trabajo' },
        { en: 'pick up my kids', es: 'recoger a mis hijos' },
        { en: 'cook dinner', es: 'cocinar la cena' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: 'What do you need to do today?', es: '¿Qué necesitas hacer hoy?' },
          { speaker: 'student', en: 'I need to go to work.', es: 'Necesito ir al trabajo.' },
        ],
        [
          { speaker: 'tutor', en: 'What do you have to do after?', es: '¿Qué tienes que hacer después?' },
          { speaker: 'student', en: 'I have to pick up my kids.', es: 'Tengo que recoger a mis hijos.' },
        ],
        [
          { speaker: 'tutor', en: 'Anything else?', es: '¿Algo más?' },
          { speaker: 'student', en: 'I have to cook dinner.', es: 'Tengo que cocinar la cena.' },
        ],
      ] },
    { label: 'Part 3: Talking about goals and hopes',
      text: 'Talk about your goals for this year.',
      wordBank: [
        { en: 'learn English', es: 'aprender inglés' },
        { en: 'find a good job', es: 'encontrar un buen trabajo' },
        { en: 'save money', es: 'ahorrar dinero' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: 'What do you want to do this year?', es: '¿Qué quieres hacer este año?' },
          { speaker: 'student', en: 'I want to learn English.', es: 'Quiero aprender inglés.' },
        ],
        [
          { speaker: 'tutor', en: 'What do you plan to do tonight?', es: '¿Qué planeas hacer esta noche?' },
          { speaker: 'student', en: 'I plan to study.', es: 'Planeo estudiar.' },
        ],
        [
          { speaker: 'tutor', en: 'What do you hope to do in the future?', es: '¿Qué esperas hacer en el futuro?' },
          { speaker: 'student', en: 'I hope to find a good job.', es: 'Espero encontrar un buen trabajo.' },
        ],
      ] },
  ],
  practiceActivities: [
    {
      titleEn: 'My Free Time',
      titleEs: 'Mi Tiempo Libre',
      instructionsEn: 'Say one thing you enjoy doing in your free time.',
      instructionsEs: 'Di algo que disfrutas hacer en tu tiempo libre.',
      wordBank: [
        { en: 'walking', es: 'caminar' },
        { en: 'singing', es: 'cantar' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: 'What do you enjoy doing?', es: '¿Qué disfrutas hacer?' },
          { speaker: 'student', en: 'I enjoy walking in the park.', es: 'Disfruto caminar en el parque.' },
        ],
        [
          { speaker: 'tutor', en: 'Nice! What else?', es: '¡Qué bien! ¿Qué más?' },
          { speaker: 'student', en: 'I like to sing.', es: 'Me gusta cantar.' },
        ],
      ],
    },
    {
      titleEn: 'My To-Do List',
      titleEs: 'Mi Lista de Pendientes',
      instructionsEn: 'Say something you need to do this week.',
      instructionsEs: 'Di algo que necesitas hacer esta semana.',
      wordBank: [
        { en: 'clean the house', es: 'limpiar la casa' },
        { en: 'buy groceries', es: 'comprar comida' },
        { en: 'pay bills', es: 'pagar las cuentas' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: 'What do you need to do this week?', es: '¿Qué necesitas hacer esta semana?' },
          { speaker: 'student', en: 'I need to buy groceries.', es: 'Necesito comprar comida.' },
        ],
        [
          { speaker: 'tutor', en: 'Anything else?', es: '¿Algo más?' },
          { speaker: 'student', en: 'I have to pay bills.', es: 'Tengo que pagar las cuentas.' },
        ],
      ],
    },
    {
      titleEn: 'Before and After',
      titleEs: 'Antes y Después',
      instructionsEn: 'Talk about something you started or stopped doing.',
      instructionsEs: 'Habla de algo que empezaste o dejaste de hacer.',
      wordBank: [
        { en: 'smoking', es: 'fumar' },
        { en: 'exercising', es: 'hacer ejercicio' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: 'Did you start doing something new?', es: '¿Empezaste a hacer algo nuevo?' },
          { speaker: 'student', en: 'I started exercising.', es: 'Empecé a hacer ejercicio.' },
        ],
        [
          { speaker: 'tutor', en: 'Did you stop doing something?', es: '¿Dejaste de hacer algo?' },
          { speaker: 'student', en: 'I stopped smoking.', es: 'Dejé de fumar.' },
        ],
      ],
    },
  ],
  worksheet: [
    { id: 'w1', promptEn: 'I like ____.', promptEs: 'Me gusta cocinar. (I like ____.)', answer: 'cooking' },
    { id: 'w2', promptEn: 'I need ____ go to work.', promptEs: 'Necesito ir al trabajo. (I need ____ go to work.)', answer: 'to' },
    { id: 'w3', promptEn: 'I have ____ pick up my kids.', promptEs: 'Tengo que recoger a mis hijos. (I have ____ pick up my kids.)', answer: 'to' },
    { id: 'w4', promptEn: 'I want ____ learn English.', promptEs: 'Quiero aprender inglés. (I want ____ learn English.)', answer: 'to' },
    { id: 'w5', promptEn: 'I enjoy ____ in the park.', promptEs: 'Disfruto caminar en el parque. (I enjoy ____ in the park.)', answer: 'walking' },
  ],
}

export default module
