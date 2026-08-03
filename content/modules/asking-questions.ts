import type { Module } from '@/types'

const module: Module = {
  slug: 'asking-questions',
  track: 'esl',
  titleEn: 'Asking Questions',
  titleEs: 'Cómo Hacer Preguntas',
  descriptionEn: 'Learn how to ask who, what, where, when, why, and how — and ask politely for help.',
  descriptionEs: 'Aprende a preguntar quién, qué, dónde, cuándo, por qué y cómo — y a pedir ayuda cortésmente.',
  icon: 'HelpCircle',
  vocab: [
    { id: 'who', en: 'who', es: 'quién',
      exampleEn: 'Who is that?', exampleEs: '¿Quién es ese?' },
    { id: 'what', en: 'what', es: 'qué',
      exampleEn: 'What is this?', exampleEs: '¿Qué es esto?' },
    { id: 'where', en: 'where', es: 'dónde',
      exampleEn: 'Where do you live?', exampleEs: '¿Dónde vives?' },
    { id: 'when', en: 'when', es: 'cuándo',
      exampleEn: 'When is your appointment?', exampleEs: '¿Cuándo es tu cita?' },
    { id: 'why', en: 'why', es: 'por qué',
      exampleEn: 'Why are you late?', exampleEs: '¿Por qué llegas tarde?' },
    { id: 'how', en: 'how', es: 'cómo',
      exampleEn: 'How do you say this in English?', exampleEs: '¿Cómo se dice esto en inglés?' },
    { id: 'how-much', en: 'how much', es: 'cuánto',
      exampleEn: 'How much is this?', exampleEs: '¿Cuánto cuesta esto?' },
    { id: 'how-many', en: 'how many', es: 'cuántos',
      exampleEn: 'How many children do you have?', exampleEs: '¿Cuántos hijos tienes?' },
    { id: 'can-you', en: 'Can you help me?', es: '¿Puedes ayudarme?',
      exampleEn: 'Excuse me, can you help me?', exampleEs: 'Disculpe, ¿puedes ayudarme?' },
    { id: 'could-you-please-help-me', en: 'Could you please help me?', es: '¿Podría ayudarme, por favor?',
      exampleEn: 'Could you please help me fill out this form?', exampleEs: '¿Podría ayudarme a llenar este formulario, por favor?' },
    { id: 'do-you', en: 'Do you speak Spanish?', es: '¿Hablas español?',
      exampleEn: 'Excuse me, do you speak Spanish?', exampleEs: 'Disculpe, ¿habla español?' },
    { id: 'is-it', en: 'Is it far from here?', es: '¿Está lejos de aquí?',
      exampleEn: 'Is it far from here?', exampleEs: '¿Está lejos de aquí?' },
    { id: 'what-time-is-it', en: 'What time is it?', es: '¿Qué hora es?',
      exampleEn: 'Excuse me, what time is it?', exampleEs: 'Disculpe, ¿qué hora es?' },
    { id: 'where-is-the', en: 'Where is the...?', es: '¿Dónde está el/la...?',
      exampleEn: 'Excuse me, where is the bathroom?', exampleEs: 'Disculpe, ¿dónde está el baño?' },
  ],
  grammar: [
    {
      titleEn: 'Question word order: WH-word + verb + subject',
      titleEs: 'Orden de las preguntas: palabra interrogativa + verbo + sujeto',
      explanationEn: 'With "to be," put the WH-word first, then is/are, then the subject: Where is the bathroom? Who is that? With action verbs, use "do/does" between the WH-word and the subject: Where do you live? What do you do? Notice the verb after "do" stays in its base form.',
      explanationEs: 'Con "to be," pon la palabra interrogativa primero, luego is/are, y después el sujeto: Where is the bathroom? Who is that? Con verbos de acción, usa "do/does" entre la palabra interrogativa y el sujeto: Where do you live? What do you do? Nota que el verbo después de "do" se mantiene en su forma base.',
      examples: [
        { en: 'Where is the bathroom?', es: '¿Dónde está el baño?' },
        { en: 'Who is that?', es: '¿Quién es ese?' },
        { en: 'Where do you live?', es: '¿Dónde vives?' },
        { en: 'How many children do you have?', es: '¿Cuántos hijos tienes?' },
      ],
    },
    {
      titleEn: 'Polite requests: Can/Could + you + verb',
      titleEs: 'Peticiones corteses: Can/Could + you + verbo',
      explanationEn: '"Can you...?" and "Could you please...?" are both used to politely ask someone to do something. "Could you please...?" sounds a little more formal and extra polite — useful with a stranger, a clerk, or someone official. After can/could, the verb stays in its base form: Can you help me? Could you please help me fill out this form?',
      explanationEs: '"Can you...?" y "Could you please...?" se usan para pedir algo cortésmente. "Could you please...?" suena un poco más formal y extra cortés — útil con un desconocido, un empleado o alguien oficial. Después de can/could, el verbo se mantiene en su forma base: Can you help me? Could you please help me fill out this form?',
      examples: [
        { en: 'Can you help me?', es: '¿Puedes ayudarme?' },
        { en: 'Could you please help me fill out this form?', es: '¿Podría ayudarme a llenar este formulario, por favor?' },
        { en: 'Do you speak Spanish?', es: '¿Hablas español?' },
      ],
    },
  ],
  quiz: [
    { id: 'q1', type: 'multiple-choice', promptEn: '"¿Dónde?" in English is:', promptEs: '"¿Dónde?" en inglés es:',
      answer: 'Where', options: ['Where', 'When', 'Who', 'Why'] },
    { id: 'q2', type: 'multiple-choice', promptEn: '"¿Cuándo?" in English is:', promptEs: '"¿Cuándo?" en inglés es:',
      answer: 'When', options: ['When', 'Where', 'What', 'How'] },
    { id: 'q3', type: 'multiple-choice', promptEn: 'Which words do you use to ask a price?', promptEs: '¿Qué palabras usas para preguntar un precio?',
      answer: 'How much', options: ['How much', 'How many', 'What time', 'Where'] },
    { id: 'q4', type: 'multiple-choice', promptEn: 'Complete: "___ is your name?"', promptEs: 'Completa: "___ is your name?"',
      answer: 'What', options: ['What', 'Who', 'Where', 'When'] },
    { id: 'q5', type: 'multiple-choice', promptEn: 'How do you politely ask for help?', promptEs: '¿Cómo pides ayuda cortésmente?',
      answer: 'Could you please help me?', options: ['Could you please help me?', 'Where is the bathroom?', 'What time is it?', 'Why are you late?'] },
    { id: 'q6', type: 'multiple-choice', promptEn: 'Complete: "___ do you live?"', promptEs: 'Completa: "___ do you live?"',
      answer: 'Where', options: ['Where', 'What', 'When', 'Who'] },
    { id: 'q7', type: 'multiple-choice', promptEn: 'Which question word asks about a reason?', promptEs: '¿Qué palabra interrogativa pregunta sobre una razón?',
      answer: 'Why', options: ['Why', 'How', 'Who', 'When'] },
    { id: 'q8', type: 'multiple-choice', promptEn: '"¿Cuántos hijos tienes?" in English is:', promptEs: '"¿Cuántos hijos tienes?" en inglés es:',
      answer: 'How many children do you have?', options: ['How many children do you have?', 'How much is this?', 'How old are you?', 'What time is it?'] },
  ],
  teachingScenarios: [
    {
      label: 'Part 1: Basic questions when meeting someone or feeling lost',
      text: 'Practice basic questions like "Who is that?" and "Where do you live?"',
      chunks: [
        [
          { speaker: 'tutor', en: 'We just met at a party. Who is that over there?', es: 'Nos acabamos de conocer en una fiesta. ¿Quién es ese de allá?' },
          { speaker: 'student', en: 'Who is that?', es: '¿Quién es ese?' },
        ],
        [
          { speaker: 'tutor', en: "That's my neighbor. Where do you live?", es: 'Ese es mi vecino. ¿Dónde vives?' },
          { speaker: 'student', en: 'Where do you live?', es: '¿Dónde vives?' },
        ],
        [
          { speaker: 'tutor', en: 'I live nearby. And why are you late today?', es: 'Vivo cerca. ¿Y por qué llegas tarde hoy?' },
          { speaker: 'student', en: 'Why are you late?', es: '¿Por qué llegas tarde?' },
        ],
      ],
    },
    {
      label: 'Part 2: Asking about prices and quantities',
      text: 'You are shopping. Practice asking how much something costs and how many you can buy.',
      wordBank: [
        { en: 'five dollars', es: 'cinco dólares' },
        { en: 'ten dollars', es: 'diez dólares' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: 'Welcome to the store! How can I help you?', es: '¡Bienvenido a la tienda! ¿Cómo puedo ayudarte?' },
          { speaker: 'student', en: 'How much is this?', es: '¿Cuánto cuesta esto?' },
        ],
        [
          { speaker: 'tutor', en: "It's five dollars. Buying more than one?", es: 'Cuesta cinco dólares. ¿Vas a comprar más de uno?' },
          { speaker: 'student', en: 'How many can I buy?', es: '¿Cuántos puedo comprar?' },
        ],
        [
          { speaker: 'tutor', en: 'As many as you like! Do you know what time it is?', es: '¡Tantos como quieras! ¿Sabes qué hora es?' },
          { speaker: 'student', en: 'What time is it?', es: '¿Qué hora es?' },
        ],
      ],
    },
    {
      label: 'Part 3: Politely asking for help',
      text: 'You need help with a form at an office. Practice asking politely.',
      chunks: [
        [
          { speaker: 'tutor', en: "I'm the clerk. How can I help?", es: 'Soy el empleado. ¿Cómo puedo ayudar?' },
          { speaker: 'student', en: 'Excuse me, can you help me?', es: 'Disculpe, ¿puedes ayudarme?' },
        ],
        [
          { speaker: 'tutor', en: 'Of course. What do you need?', es: 'Claro. ¿Qué necesitas?' },
          { speaker: 'student', en: 'Could you please help me fill out this form?', es: '¿Podría ayudarme a llenar este formulario, por favor?' },
        ],
        [
          { speaker: 'tutor', en: 'Yes, I can help with that.', es: 'Sí, puedo ayudarte con eso.' },
          { speaker: 'student', en: 'Thank you.', es: 'Gracias.' },
        ],
      ],
    },
  ],
  practiceActivities: [
    {
      titleEn: 'Interview Your Tutor',
      titleEs: 'Entrevista a tu Tutor',
      instructionsEn: 'Ask your tutor a few WH- questions.',
      instructionsEs: 'Hazle a tu tutor algunas preguntas con WH-.',
      wordBank: [
        { en: 'What', es: 'Qué' },
        { en: 'Where', es: 'Dónde' },
        { en: 'How many', es: 'Cuántos' },
      ],
      chunks: [
        [
          { speaker: 'student', en: 'What is your favorite food?', es: '¿Cuál es tu comida favorita?' },
          { speaker: 'tutor', en: 'Pizza.', es: 'La pizza.' },
        ],
        [
          { speaker: 'student', en: 'How many children do you have?', es: '¿Cuántos hijos tienes?' },
          { speaker: 'tutor', en: 'Two.', es: 'Dos.' },
        ],
      ],
    },
    {
      titleEn: 'Ask a Stranger',
      titleEs: 'Pregúntale a un Desconocido',
      instructionsEn: 'The tutor describes a situation. Ask the right question.',
      instructionsEs: 'El tutor describe una situación. Haz la pregunta correcta.',
      chunks: [
        [
          { speaker: 'tutor', en: 'You are lost on the street.', es: 'Estás perdido en la calle.' },
          { speaker: 'student', en: 'Excuse me, where is the bus stop?', es: 'Disculpe, ¿dónde está la parada de autobús?' },
        ],
        [
          { speaker: 'tutor', en: 'You want to know the price of something.', es: 'Quieres saber el precio de algo.' },
          { speaker: 'student', en: 'How much is this?', es: '¿Cuánto cuesta esto?' },
        ],
      ],
    },
    {
      titleEn: 'Polite Request Practice',
      titleEs: 'Práctica de Peticiones Corteses',
      instructionsEn: 'Make a polite request to your tutor.',
      instructionsEs: 'Haz una petición cortés a tu tutor.',
      chunks: [
        [
          { speaker: 'student', en: 'Can you repeat that, please?', es: '¿Puedes repetir eso, por favor?' },
          { speaker: 'tutor', en: 'Sure, no problem.', es: 'Claro, no hay problema.' },
        ],
        [
          { speaker: 'student', en: 'Could you please speak more slowly?', es: '¿Podría hablar más despacio, por favor?' },
          { speaker: 'tutor', en: 'Of course.', es: 'Claro que sí.' },
        ],
      ],
    },
  ],
  worksheet: [
    { id: 'w1', promptEn: '____ is your name?', promptEs: '¿Cómo te llamas? (____ is your name?)', answer: 'What' },
    { id: 'w2', promptEn: '____ do you live?', promptEs: '¿Dónde vives? (____ do you live?)', answer: 'Where' },
    { id: 'w3', promptEn: '____ much does this cost?', promptEs: '¿Cuánto cuesta esto? (____ much does this cost?)', answer: 'How' },
    { id: 'w4', promptEn: '____ you help me?', promptEs: '¿Puedes ayudarme? (____ you help me?)', answer: 'Can' },
    { id: 'w5', promptEn: '____ time is it?', promptEs: '¿Qué hora es? (____ time is it?)', answer: 'What' },
  ],
}

export default module
