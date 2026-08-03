import type { Module } from '@/types'

const module: Module = {
  slug: 'navigating-subway',
  track: 'esl',
  titleEn: 'Getting Around: Subway & Directions',
  titleEs: 'Moverse por la Ciudad: El Metro y las Direcciones',
  descriptionEn: 'Learn the words and phrases you need to ride the NYC subway and ask for directions on the street.',
  descriptionEs: 'Aprende las palabras y frases para viajar en el metro de Nueva York y pedir direcciones en la calle.',
  icon: 'Train',
  vocab: [
    {
      id: 'subway',
      en: 'subway',
      es: 'el metro / el subterráneo',
      exampleEn: 'I take the subway to work every day.',
      exampleEs: 'Tomo el metro al trabajo todos los días.',
    },
    {
      id: 'metrocard',
      en: 'MetroCard',
      es: 'la tarjeta MetroCard',
      exampleEn: 'I need to buy a MetroCard at the machine.',
      exampleEs: 'Necesito comprar una MetroCard en la máquina.',
    },
    {
      id: 'platform',
      en: 'platform',
      es: 'el andén',
      exampleEn: 'Wait for the train on the platform.',
      exampleEs: 'Espera el tren en el andén.',
    },
    {
      id: 'uptown',
      en: 'uptown',
      es: 'hacia el norte / uptown',
      exampleEn: 'Take the uptown train to get to Manhattan.',
      exampleEs: 'Toma el tren uptown para ir a Manhattan.',
    },
    {
      id: 'downtown',
      en: 'downtown',
      es: 'hacia el sur / downtown',
      exampleEn: 'The downtown train goes toward Brooklyn.',
      exampleEs: 'El tren downtown va hacia Brooklyn.',
    },
    {
      id: 'transfer',
      en: 'transfer',
      es: 'hacer transbordo / cambiar de tren',
      exampleEn: 'Transfer to the A train at Jay Street.',
      exampleEs: 'Haz transbordo al tren A en Jay Street.',
    },
    {
      id: 'exit',
      en: 'exit',
      es: 'la salida',
      exampleEn: 'Use the exit on the left side of the train.',
      exampleEs: 'Usa la salida del lado izquierdo del tren.',
    },
    {
      id: 'which-train',
      en: 'Which train goes to...?',
      es: '¿Qué tren va a...?',
      exampleEn: 'Excuse me, which train goes to Times Square?',
      exampleEs: 'Disculpe, ¿qué tren va a Times Square?',
    },
    {
      id: 'turn-left',
      en: 'turn left',
      es: 'dobla a la izquierda',
      exampleEn: 'Turn left at the light.',
      exampleEs: 'Dobla a la izquierda en el semáforo.',
    },
    {
      id: 'turn-right',
      en: 'turn right',
      es: 'dobla a la derecha',
      exampleEn: 'Turn right on Main Street.',
      exampleEs: 'Dobla a la derecha en la calle Main.',
    },
    {
      id: 'straight-ahead',
      en: 'straight ahead',
      es: 'derecho / todo recto',
      exampleEn: 'Go straight ahead for two blocks.',
      exampleEs: 'Sigue derecho por dos cuadras.',
    },
    {
      id: 'corner',
      en: 'corner',
      es: 'la esquina',
      exampleEn: 'The store is on the corner.',
      exampleEs: 'La tienda está en la esquina.',
    },
    {
      id: 'block',
      en: 'block',
      es: 'la cuadra',
      exampleEn: 'The pharmacy is one block away.',
      exampleEs: 'La farmacia está a una cuadra.',
    },
    {
      id: 'excuse-me-where-is',
      en: 'Excuse me, where is...?',
      es: 'Disculpe, ¿dónde está...?',
      exampleEn: 'Excuse me, where is the nearest subway station?',
      exampleEs: 'Disculpe, ¿dónde está la estación de metro más cercana?',
    },
  ],
  grammar: [
    {
      titleEn: 'Giving directions: commands with no subject',
      titleEs: 'Dar direcciones: órdenes sin sujeto',
      explanationEn: 'Directions are usually given as commands — start directly with the verb, with no "you" in front: Turn left. Go straight ahead. Take the uptown train.',
      explanationEs: 'Las direcciones normalmente se dan como órdenes — empieza directamente con el verbo, sin "you" al frente: Turn left. Go straight ahead. Take the uptown train.',
      examples: [
        { en: 'Turn left at the light.', es: 'Dobla a la izquierda en el semáforo.' },
        { en: 'Go straight ahead for two blocks.', es: 'Sigue derecho por dos cuadras.' },
        { en: 'Take the uptown train to get to Manhattan.', es: 'Toma el tren uptown para ir a Manhattan.' },
      ],
    },
    {
      titleEn: '"Which" and "Where" for finding your way',
      titleEs: '"Which" y "Where" para encontrar tu camino',
      explanationEn: 'Use "Which train/bus goes to...?" when choosing between options. Use "Where is...?" when you need to locate something specific, like a station or a street.',
      explanationEs: 'Usa "Which train/bus goes to...?" cuando eliges entre opciones. Usa "Where is...?" cuando necesitas ubicar algo específico, como una estación o una calle.',
      examples: [
        { en: 'Excuse me, which train goes to Times Square?', es: 'Disculpe, ¿qué tren va a Times Square?' },
        { en: 'Excuse me, where is the nearest subway station?', es: 'Disculpe, ¿dónde está la estación de metro más cercana?' },
      ],
    },
  ],
  quiz: [
    {
      id: 'q1',
      type: 'multiple-choice',
      promptEn: 'What do you need to ride the subway in NYC?',
      promptEs: '¿Qué necesitas para viajar en el metro de Nueva York?',
      answer: 'MetroCard',
      options: ['MetroCard', 'Passport', 'Driver\'s license', 'Ticket'],
    },
    {
      id: 'q2',
      type: 'multiple-choice',
      promptEn: 'Where do you wait for the train?',
      promptEs: '¿Dónde esperas el tren?',
      answer: 'On the platform',
      options: ['On the platform', 'At the exit', 'In the street', 'At the machine'],
    },
    {
      id: 'q3',
      type: 'multiple-choice',
      promptEn: '"Uptown" means the train is going toward:',
      promptEs: '"Uptown" significa que el tren va hacia:',
      answer: 'Manhattan / north',
      options: ['Manhattan / north', 'Brooklyn / south', 'Queens / east', 'New Jersey / west'],
    },
    {
      id: 'q4',
      type: 'multiple-choice',
      promptEn: 'How do you ask a stranger where something is?',
      promptEs: '¿Cómo le preguntas a un desconocido dónde está algo?',
      answer: 'Excuse me, where is...?',
      options: ['Excuse me, where is...?', 'Turn left', 'Which train goes to...?', 'How much is the MetroCard?'],
    },
    {
      id: 'q5',
      type: 'multiple-choice',
      promptEn: '"La cuadra" in English is:',
      promptEs: '"La cuadra" en inglés es:',
      answer: 'block',
      options: ['block', 'corner', 'platform', 'exit'],
    },
    {
      id: 'q6',
      type: 'multiple-choice',
      promptEn: 'Which word means the train is heading toward Brooklyn?',
      promptEs: '¿Qué palabra significa que el tren va hacia Brooklyn?',
      answer: 'downtown',
      options: ['downtown', 'uptown', 'transfer', 'exit'],
    },
    {
      id: 'q7',
      type: 'multiple-choice',
      promptEn: 'Complete: "___ train goes to Times Square?"',
      promptEs: 'Completa: "___ train goes to Times Square?"',
      answer: 'Which',
      options: ['Which', 'Where', 'What', 'Who'],
    },
    {
      id: 'q8',
      type: 'multiple-choice',
      promptEn: '"La esquina" in English is:',
      promptEs: '"La esquina" en inglés es:',
      answer: 'corner',
      options: ['corner', 'block', 'platform', 'exit'],
    },
  ],
  teachingScenarios: [
    {
      label: 'Part 1: Buying a MetroCard',
      text: 'You need to buy a MetroCard and find the platform for the subway.',
      chunks: [
        [
          { speaker: 'tutor', en: 'Do you need help with the machine?', es: '¿Necesita ayuda con la máquina?' },
          { speaker: 'student', en: 'Yes, I need a MetroCard.', es: 'Sí, necesito una MetroCard.' },
        ],
        [
          { speaker: 'tutor', en: 'Insert your money here.', es: 'Inserte su dinero aquí.' },
          { speaker: 'student', en: 'Thank you.', es: 'Gracias.' },
        ],
        [
          { speaker: 'student', en: 'Where is the platform?', es: '¿Dónde está el andén?' },
          { speaker: 'tutor', en: "It's downstairs, to the left.", es: 'Está abajo, a la izquierda.' },
        ],
      ],
    },
    {
      label: 'Part 2: Asking which train to take',
      text: "You're on the platform. Practice asking which train to take.",
      wordBank: [
        { en: 'uptown', es: 'hacia el norte' },
        { en: 'downtown', es: 'hacia el sur' },
      ],
      chunks: [
        [
          { speaker: 'student', en: 'Which train goes to Times Square?', es: '¿Qué tren va a Times Square?' },
          { speaker: 'tutor', en: 'The uptown train.', es: 'El tren uptown.' },
        ],
        [
          { speaker: 'student', en: 'Is this the uptown platform?', es: '¿Este es el andén uptown?' },
          { speaker: 'tutor', en: 'No, this is downtown.', es: 'No, este es downtown.' },
        ],
        [
          { speaker: 'student', en: 'Do I need to transfer?', es: '¿Necesito hacer transbordo?' },
          { speaker: 'tutor', en: 'Yes, transfer to the A train.', es: 'Sí, haga transbordo al tren A.' },
        ],
      ],
    },
    {
      label: 'Part 3: Asking for directions on the street',
      text: 'You exit the station and ask a stranger for directions.',
      wordBank: [
        { en: 'left', es: 'izquierda' },
        { en: 'right', es: 'derecha' },
      ],
      chunks: [
        [
          { speaker: 'student', en: 'Excuse me, where is Main Street?', es: 'Disculpe, ¿dónde está Main Street?' },
          { speaker: 'tutor', en: 'Turn left at the corner.', es: 'Doble a la izquierda en la esquina.' },
        ],
        [
          { speaker: 'tutor', en: 'Then go straight ahead for two blocks.', es: 'Luego siga derecho por dos cuadras.' },
          { speaker: 'student', en: 'Straight ahead, got it.', es: 'Derecho, entendido.' },
        ],
        [
          { speaker: 'tutor', en: "Turn right at the next corner and you'll see it.", es: 'Doble a la derecha en la próxima esquina y lo verá.' },
          { speaker: 'student', en: 'Thank you so much.', es: 'Muchas gracias.' },
        ],
      ],
    },
  ],
  practiceActivities: [
    {
      titleEn: 'Ask Where Something Is',
      titleEs: 'Pregunta Dónde Está Algo',
      instructionsEn: 'Practice asking a stranger where something is.',
      instructionsEs: 'Practica preguntarle a un desconocido dónde está algo.',
      wordBank: [
        { en: 'exit', es: 'la salida' },
        { en: 'pharmacy', es: 'la farmacia' },
        { en: 'bank', es: 'el banco' },
      ],
      chunks: [
        [
          { speaker: 'student', en: 'Excuse me, where is the exit?', es: 'Disculpe, ¿dónde está la salida?' },
          { speaker: 'tutor', en: "It's over there.", es: 'Está por allá.' },
        ],
        [
          { speaker: 'student', en: 'Thank you.', es: 'Gracias.' },
          { speaker: 'tutor', en: 'You are welcome.', es: 'De nada.' },
        ],
      ],
    },
    {
      titleEn: 'Which Train Goes There?',
      titleEs: '¿Qué Tren Va Allí?',
      instructionsEn: 'Practice asking which train goes to different places.',
      instructionsEs: 'Practica preguntar qué tren va a diferentes lugares.',
      wordBank: [
        { en: 'Brooklyn', es: 'Brooklyn' },
        { en: 'Queens', es: 'Queens' },
        { en: 'Manhattan', es: 'Manhattan' },
      ],
      chunks: [
        [
          { speaker: 'student', en: 'Which train goes to Brooklyn?', es: '¿Qué tren va a Brooklyn?' },
          { speaker: 'tutor', en: 'The downtown train.', es: 'El tren downtown.' },
        ],
        [
          { speaker: 'student', en: 'Thank you.', es: 'Gracias.' },
          { speaker: 'tutor', en: 'You are welcome.', es: 'De nada.' },
        ],
      ],
    },
    {
      titleEn: 'How Far Is It?',
      titleEs: '¿Qué Tan Lejos Está?',
      instructionsEn: 'Practice saying how many blocks away a place is.',
      instructionsEs: 'Practica decir a cuántas cuadras está un lugar.',
      wordBank: [
        { en: 'one block', es: 'una cuadra' },
        { en: 'two blocks', es: 'dos cuadras' },
        { en: 'three blocks', es: 'tres cuadras' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: 'How far is the store?', es: '¿Qué tan lejos está la tienda?' },
          { speaker: 'student', en: 'Two blocks away.', es: 'A dos cuadras.' },
        ],
        [
          { speaker: 'tutor', en: 'Thank you.', es: 'Gracias.' },
          { speaker: 'student', en: 'You are welcome.', es: 'De nada.' },
        ],
      ],
    },
  ],
  worksheet: [
    { id: 'w1', promptEn: 'Excuse me, ____ train goes to Manhattan?', promptEs: 'Disculpe, ¿____ tren va a Manhattan?', answer: 'which' },
    { id: 'w2', promptEn: 'Wait for the train on the ____.', promptEs: 'Espera el tren en el ____.', answer: 'platform' },
    { id: 'w3', promptEn: 'Turn ____ at the corner, then go straight.', promptEs: 'Dobla a la ____ en la esquina, luego sigue derecho.', answer: 'left' },
    { id: 'w4', promptEn: 'The pharmacy is one ____ from here.', promptEs: 'La farmacia está a una ____ de aquí.', answer: 'block' },
    { id: 'w5', promptEn: 'Go straight ____, then turn right at the bank.', promptEs: 'Sigue ____, luego dobla a la derecha en el banco.', answer: 'ahead' },
  ],
}

export default module
