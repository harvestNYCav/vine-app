import type { Module } from '@/types'

const module: Module = {
  slug: 'negation',
  track: 'esl',
  titleEn: 'Negation',
  titleEs: 'La Negación',
  descriptionEn: 'Learn how to say no, say what you don\'t have, and say you don\'t understand.',
  descriptionEs: 'Aprende a decir que no, decir lo que no tienes, y decir que no entiendes.',
  icon: 'XCircle',
  vocab: [
    { id: 'not', en: 'not', es: 'no',
      exampleEn: 'This is not my bag.', exampleEs: 'Esta no es mi bolsa.' },
    { id: 'i-am-not', en: 'I am not...', es: 'No soy... / No estoy...',
      exampleEn: 'I am not from here.', exampleEs: 'No soy de aquí.' },
    { id: 'i-dont', en: "I don't...", es: 'No... (presente)',
      exampleEn: "I don't speak much English.", exampleEs: 'No hablo mucho inglés.' },
    { id: 'i-didnt', en: "I didn't...", es: 'No... (pasado)',
      exampleEn: "I didn't go to work yesterday.", exampleEs: 'No fui al trabajo ayer.' },
    { id: 'i-dont-have', en: "I don't have...", es: 'No tengo...',
      exampleEn: "I don't have any money.", exampleEs: 'No tengo dinero.' },
    { id: 'i-cant', en: "I can't...", es: 'No puedo...',
      exampleEn: "I can't come tomorrow.", exampleEs: 'No puedo venir mañana.' },
    { id: 'no', en: 'no', es: 'no',
      exampleEn: 'No, thank you.', exampleEs: 'No, gracias.' },
    { id: 'never', en: 'never', es: 'nunca',
      exampleEn: 'I never eat breakfast.', exampleEs: 'Nunca desayuno.' },
    { id: 'nothing', en: 'nothing', es: 'nada',
      exampleEn: 'There is nothing in the fridge.', exampleEs: 'No hay nada en el refrigerador.' },
    { id: 'nobody', en: 'nobody / no one', es: 'nadie',
      exampleEn: 'Nobody is home right now.', exampleEs: 'No hay nadie en casa ahora.' },
    { id: 'not-yet', en: 'not yet', es: 'todavía no',
      exampleEn: 'I have not finished the form yet.', exampleEs: 'Todavía no he terminado el formulario.' },
    { id: 'i-dont-know', en: "I don't know", es: 'No sé',
      exampleEn: "I don't know the answer.", exampleEs: 'No sé la respuesta.' },
    { id: 'i-dont-understand', en: "I don't understand", es: 'No entiendo',
      exampleEn: "I'm sorry, I don't understand.", exampleEs: 'Lo siento, no entiendo.' },
    { id: 'doesnt', en: "doesn't (he/she doesn't...)", es: 'no... (él/ella)',
      exampleEn: "She doesn't speak Spanish.", exampleEs: 'Ella no habla español.' },
  ],
  grammar: [
    {
      titleEn: 'Present negatives: don\'t vs doesn\'t',
      titleEs: 'Negaciones en presente: don\'t vs doesn\'t',
      explanationEn: 'Use "don\'t" with I, you, we, and they. Use "doesn\'t" with he, she, or it. Both are followed by the base form of the verb — never add "-s" after "doesn\'t."',
      explanationEs: 'Usa "don\'t" con I, you, we y they. Usa "doesn\'t" con he, she, o it. Ambos van seguidos de la forma base del verbo — nunca agregues "-s" después de "doesn\'t."',
      examples: [
        { en: "I don't speak much English.", es: 'No hablo mucho inglés.' },
        { en: "She doesn't speak Spanish.", es: 'Ella no habla español.' },
      ],
    },
    {
      titleEn: 'Other negatives: didn\'t, can\'t, am not/isn\'t/aren\'t',
      titleEs: 'Otras negaciones: didn\'t, can\'t, am not/isn\'t/aren\'t',
      explanationEn: 'For the past, use "didn\'t" + base verb. For ability or permission, use "can\'t" + base verb. For "to be," use "am not," "isn\'t," or "aren\'t" depending on the subject — no extra "do/does" needed with "to be."',
      explanationEs: 'Para el pasado, usa "didn\'t" + verbo base. Para habilidad o permiso, usa "can\'t" + verbo base. Para "to be," usa "am not," "isn\'t," o "aren\'t" según el sujeto — no se necesita "do/does" extra con "to be."',
      examples: [
        { en: "I didn't go to work yesterday.", es: 'No fui al trabajo ayer.' },
        { en: "I can't come tomorrow.", es: 'No puedo venir mañana.' },
        { en: 'I am not from here.', es: 'No soy de aquí.' },
      ],
    },
  ],
  quiz: [
    { id: 'q1', type: 'multiple-choice', promptEn: '"No sé" in English is:', promptEs: '"No sé" en inglés es:',
      answer: "I don't know", options: ["I don't know", "I don't understand", "I can't", "I am not"] },
    { id: 'q2', type: 'multiple-choice', promptEn: 'Complete: "I ___ have a car."', promptEs: 'Completa: "I ___ have a car."',
      answer: "don't", options: ["don't", "doesn't", "am not", "didn't"] },
    { id: 'q3', type: 'multiple-choice', promptEn: 'Complete: "She ___ speak Spanish."', promptEs: 'Completa: "She ___ speak Spanish."',
      answer: "doesn't", options: ["doesn't", "don't", "isn't", "can't"] },
    { id: 'q4', type: 'multiple-choice', promptEn: '"Nunca" in English is:', promptEs: '"Nunca" en inglés es:',
      answer: 'never', options: ['never', 'nothing', 'nobody', 'not yet'] },
    { id: 'q5', type: 'multiple-choice', promptEn: '"Todavía no" in English is:', promptEs: '"Todavía no" en inglés es:',
      answer: 'not yet', options: ['not yet', 'never', 'nothing', 'no one'] },
    { id: 'q6', type: 'multiple-choice', promptEn: '"No fui al trabajo ayer" in English is:', promptEs: '"No fui al trabajo ayer" en inglés es:',
      answer: "I didn't go to work yesterday", options: ["I didn't go to work yesterday", "I don't go to work", "I can't go to work", "I am not going to work"] },
    { id: 'q7', type: 'multiple-choice', promptEn: 'Complete: "I ___ from here." (to be)', promptEs: 'Completa: "I ___ from here." (to be)',
      answer: 'am not', options: ['am not', "don't", "doesn't", "can't"] },
    { id: 'q8', type: 'multiple-choice', promptEn: 'Which word means "no one"?', promptEs: '¿Qué palabra significa "no one"?',
      answer: 'nobody', options: ['nobody', 'nothing', 'never', 'not yet'] },
  ],
  teachingScenarios: [
    {
      label: 'Part 1: Saying you don\'t understand',
      text: 'Practice a moment at the doctor\'s office where you need to say you don\'t understand.',
      chunks: [
        [
          { speaker: 'tutor', en: 'How are you feeling today?', es: '¿Cómo te sientes hoy?' },
          { speaker: 'student', en: "I don't understand.", es: 'No entiendo.' },
        ],
        [
          { speaker: 'tutor', en: "Let's go slowly. Do you have pain here?", es: 'Vamos despacio. ¿Tienes dolor aquí?' },
          { speaker: 'student', en: "I don't know.", es: 'No sé.' },
        ],
        [
          { speaker: 'tutor', en: "No problem, we'll figure it out together.", es: 'No hay problema, lo resolveremos juntos.' },
          { speaker: 'student', en: 'Thank you.', es: 'Gracias.' },
        ],
      ],
    },
    {
      label: 'Part 2: Saying what you don\'t have or can\'t do',
      text: 'Practice explaining that you don\'t have something or can\'t do something.',
      wordBank: [
        { en: 'a car', es: 'un carro' },
        { en: 'any money', es: 'dinero' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: 'Can you come to work tomorrow?', es: '¿Puedes venir al trabajo mañana?' },
          { speaker: 'student', en: "I can't come tomorrow.", es: 'No puedo venir mañana.' },
        ],
        [
          { speaker: 'tutor', en: 'Do you have a car?', es: '¿Tienes carro?' },
          { speaker: 'student', en: "I don't have a car.", es: 'No tengo carro.' },
        ],
        [
          { speaker: 'tutor', en: 'Did you go to work yesterday?', es: '¿Fuiste al trabajo ayer?' },
          { speaker: 'student', en: "I didn't go yesterday.", es: 'No fui ayer.' },
        ],
      ],
    },
    {
      label: 'Part 3: Politely declining',
      text: 'Someone offers you something. Practice politely saying no.',
      wordBank: [
        { en: 'coffee', es: 'café' },
        { en: 'something to eat', es: 'algo de comer' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: 'Would you like some coffee?', es: '¿Te gustaría un poco de café?' },
          { speaker: 'student', en: 'No, thank you.', es: 'No, gracias.' },
        ],
        [
          { speaker: 'tutor', en: 'Have you finished the form yet?', es: '¿Ya terminaste el formulario?' },
          { speaker: 'student', en: 'Not yet.', es: 'Todavía no.' },
        ],
        [
          { speaker: 'tutor', en: 'Is anybody helping you?', es: '¿Alguien te está ayudando?' },
          { speaker: 'student', en: 'Nobody, right now.', es: 'Nadie, ahora mismo.' },
        ],
      ],
    },
  ],
  practiceActivities: [
    {
      titleEn: 'True or False About Me',
      titleEs: 'Verdadero o Falso Sobre Mí',
      instructionsEn: 'The tutor makes a statement about you. Correct it if it is false.',
      instructionsEs: 'El tutor hace una afirmación sobre ti. Corrígela si es falsa.',
      chunks: [
        [
          { speaker: 'tutor', en: 'You speak French.', es: 'Hablas francés.' },
          { speaker: 'student', en: "I don't speak French.", es: 'No hablo francés.' },
        ],
        [
          { speaker: 'tutor', en: 'You have five children.', es: 'Tienes cinco hijos.' },
          { speaker: 'student', en: "I don't have five children.", es: 'No tengo cinco hijos.' },
        ],
      ],
    },
    {
      titleEn: 'What I Can\'t Do This Week',
      titleEs: 'Lo Que No Puedo Hacer Esta Semana',
      instructionsEn: 'Say one real thing you can\'t do this week and why.',
      instructionsEs: 'Di algo real que no puedes hacer esta semana y por qué.',
      chunks: [
        [
          { speaker: 'tutor', en: 'What can\'t you do this week?', es: '¿Qué no puedes hacer esta semana?' },
          { speaker: 'student', en: "I can't come on Friday.", es: 'No puedo venir el viernes.' },
        ],
        [
          { speaker: 'tutor', en: 'Why not?', es: '¿Por qué no?' },
          { speaker: 'student', en: 'I have to work.', es: 'Tengo que trabajar.' },
        ],
      ],
    },
    {
      titleEn: 'Polite No',
      titleEs: 'Un No Cortés',
      instructionsEn: 'The tutor offers you something. Politely decline.',
      instructionsEs: 'El tutor te ofrece algo. Rechaza cortésmente.',
      wordBank: [
        { en: 'a ride', es: 'un aventón' },
        { en: 'more time', es: 'más tiempo' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: 'Do you need a ride?', es: '¿Necesitas un aventón?' },
          { speaker: 'student', en: 'No, thank you.', es: 'No, gracias.' },
        ],
        [
          { speaker: 'tutor', en: 'Do you want more time?', es: '¿Quieres más tiempo?' },
          { speaker: 'student', en: 'Not yet, thank you.', es: 'Todavía no, gracias.' },
        ],
      ],
    },
  ],
  worksheet: [
    { id: 'w1', promptEn: 'I ____ have a car.', promptEs: 'No tengo carro. (I ____ have a car.)', answer: "don't" },
    { id: 'w2', promptEn: 'She ____ speak English yet.', promptEs: 'Ella todavía no habla inglés. (She ____ speak English yet.)', answer: "doesn't" },
    { id: 'w3', promptEn: 'I ____ go to the doctor yesterday.', promptEs: 'No fui al doctor ayer. (I ____ go to the doctor yesterday.)', answer: "didn't" },
    { id: 'w4', promptEn: 'I have ____ money today.', promptEs: 'No tengo dinero hoy. (I have ____ money today.)', answer: 'no' },
    { id: 'w5', promptEn: 'I ____ come to work tomorrow.', promptEs: 'No puedo venir al trabajo mañana. (I ____ come to work tomorrow.)', answer: "can't" },
  ],
  classWorksheet: [
    { id: 'cw1', promptEn: 'I ____ not hungry.', promptEs: 'No tengo hambre. (I ____ not hungry.)', answer: 'am' },
    { id: 'cw2', promptEn: 'He ____ like coffee.', promptEs: 'A él no le gusta el café. (He ____ like coffee.)', answer: "doesn't" },
    { id: 'cw3', promptEn: 'We ____ work on Sunday.', promptEs: 'No trabajamos el domingo. (We ____ work on Sunday.)', answer: "don't" },
    { id: 'cw4', promptEn: 'I ____ understand. Can you repeat?', promptEs: 'No entiendo. ¿Puede repetir? (I ____ understand.)', answer: "don't" },
    { id: 'cw5', promptEn: 'There is ____ in the fridge. (nada)', promptEs: 'No hay nada en el refrigerador. (There is ____ in the fridge.)', answer: 'nothing' },
    { id: 'cw6', promptEn: '____ is home. (nadie)', promptEs: 'Nadie está en casa. (____ is home.)', answer: 'Nobody' },
    { id: 'cw7', promptEn: 'I am not finished ____.', promptEs: 'Todavía no he terminado. (I am not finished ____.)', answer: 'yet' },
    { id: 'cw8', promptEn: 'She is ____ late. She is always on time.', promptEs: 'Ella nunca llega tarde. (She is ____ late.)', answer: 'never' },
  ],
  listening: [
    {
      titleEn: 'At the Bank',
      titleEs: 'En el banco',
      script: [
        { speaker: 'Teller', en: 'Do you have an account here?' },
        { speaker: 'Hugo', en: 'No, I don\'t. I want to open one.' },
        { speaker: 'Teller', en: 'Do you have an ID?' },
        { speaker: 'Hugo', en: 'Yes, but I don\'t have my passport today.' },
        { speaker: 'Teller', en: 'That is okay. Your ID card is fine.' },
        { speaker: 'Hugo', en: 'Sorry, I don\'t understand. Can you speak slowly?' },
        { speaker: 'Teller', en: 'Of course. No problem. Your ID card is fine.' },
      ],
      questions: [
        { id: 'l1q1', promptEn: 'Does Hugo have an account at the bank?', promptEs: '¿Hugo tiene una cuenta en el banco?', answer: 'No, he doesn\'t.' },
        { id: 'l1q2', promptEn: 'What does Hugo want to do?', promptEs: '¿Qué quiere hacer Hugo?', answer: 'Open an account' },
        { id: 'l1q3', promptEn: 'What doesn\'t Hugo have today?', promptEs: '¿Qué no tiene Hugo hoy?', answer: 'His passport' },
        { id: 'l1q4', promptEn: 'What does Hugo ask the teller to do?', promptEs: '¿Qué le pide Hugo al cajero?', answer: 'Speak slowly' },
      ],
    },
    {
      titleEn: 'Saying No Politely',
      titleEs: 'Decir que no con cortesía',
      script: [
        { speaker: 'Boss', en: 'Can you work on Saturday, Ana?' },
        { speaker: 'Ana', en: 'I\'m sorry, I can\'t. I have English class on Saturday.' },
        { speaker: 'Boss', en: 'What about Sunday?' },
        { speaker: 'Ana', en: 'I never work on Sunday. It is my family day.' },
        { speaker: 'Boss', en: 'Okay. Did you finish the report?' },
        { speaker: 'Ana', en: 'Not yet. I didn\'t have time yesterday. I will finish it today.' },
      ],
      questions: [
        { id: 'l2q1', promptEn: 'Why can\'t Ana work on Saturday?', promptEs: '¿Por qué Ana no puede trabajar el sábado?', answer: 'She has English class.' },
        { id: 'l2q2', promptEn: 'Does Ana work on Sunday?', promptEs: '¿Ana trabaja los domingos?', answer: 'No, never. It is her family day.' },
        { id: 'l2q3', promptEn: 'Did Ana finish the report?', promptEs: '¿Ana terminó el reporte?', answer: 'Not yet' },
        { id: 'l2q4', promptEn: 'When will Ana finish the report?', promptEs: '¿Cuándo terminará Ana el reporte?', answer: 'Today' },
      ],
    },
  ],
  inPersonQuiz: [
    { id: 'iq1', kind: 'translate', promptEn: 'Write in English: "No entiendo."', answer: "I don't understand." },
    { id: 'iq2', kind: 'translate', promptEn: 'Write in English: "Él no tiene carro."', answer: "He doesn't have a car." },
    { id: 'iq3', kind: 'translate', promptEn: 'Write in Spanish: "I didn\'t go to work."', answer: 'No fui al trabajo.' },
    { id: 'iq4', kind: 'translate', promptEn: 'Write in English: "No puedo venir mañana."', answer: "I can't come tomorrow." },
    { id: 'iq5', kind: 'dictation', promptEn: 'I don\'t know.', answer: 'I don\'t know.' },
    { id: 'iq6', kind: 'dictation', promptEn: 'She doesn\'t speak English yet.', answer: 'She doesn\'t speak English yet.' },
    { id: 'iq7', kind: 'dictation', promptEn: 'Nobody is at home.', answer: 'Nobody is at home.' },
    { id: 'iq8', kind: 'short-answer', promptEn: 'Make it negative: "I like fish."', promptEs: 'Hazlo negativo: "I like fish."', answer: "I don't like fish." },
    { id: 'iq9', kind: 'short-answer', promptEn: 'Make it negative: "He works on Monday."', promptEs: 'Hazlo negativo: "He works on Monday."', answer: "He doesn't work on Monday." },
    { id: 'iq10', kind: 'short-answer', promptEn: 'What can\'t you do?', promptEs: '¿Qué no puedes hacer?', answer: 'I can\'t ___. (Answers will vary.)' },
  ],
}

export default module
