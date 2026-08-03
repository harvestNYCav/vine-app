import type { Module } from '@/types'

const module: Module = {
  slug: 'everyday-essentials',
  track: 'esl',
  titleEn: 'Everyday Essentials',
  titleEs: 'Lo Esencial del Día a Día',
  descriptionEn: 'Learn the everyday words and phrases you need to fill out forms and ask for help.',
  descriptionEs: 'Aprende las palabras y frases diarias que necesitas para llenar formularios y pedir ayuda.',
  icon: 'Home',
  vocab: [
    { id: 'phone-number', en: 'phone number', es: 'el número de teléfono',
      exampleEn: 'What is your phone number?', exampleEs: '¿Cuál es tu número de teléfono?' },
    { id: 'address', en: 'address', es: 'la dirección',
      exampleEn: 'What is your address?', exampleEs: '¿Cuál es tu dirección?' },
    { id: 'id', en: 'ID / identification', es: 'la identificación',
      exampleEn: 'Do you have an ID?', exampleEs: '¿Tiene una identificación?' },
    { id: 'bathroom', en: 'bathroom / restroom', es: 'el baño',
      exampleEn: 'Excuse me, where is the bathroom?', exampleEs: 'Disculpe, ¿dónde está el baño?' },
    { id: 'where-is-the-bathroom', en: 'Where is the bathroom?', es: '¿Dónde está el baño?',
      exampleEn: 'Excuse me, where is the bathroom?', exampleEs: 'Disculpe, ¿dónde está el baño?' },
    { id: 'key', en: 'key', es: 'la llave',
      exampleEn: "I lost my key.", exampleEs: 'Perdí mi llave.' },
    { id: 'wallet', en: 'wallet', es: 'la cartera',
      exampleEn: 'My wallet is in my bag.', exampleEs: 'Mi cartera está en mi bolsa.' },
    { id: 'wifi', en: 'wifi / internet', es: 'el wifi / internet',
      exampleEn: 'Is there free wifi here?', exampleEs: '¿Hay wifi gratis aquí?' },
    { id: 'password', en: 'password', es: 'la contraseña',
      exampleEn: 'What is the wifi password?', exampleEs: '¿Cuál es la contraseña del wifi?' },
    { id: 'mailbox', en: 'mailbox / mail', es: 'el buzón / el correo',
      exampleEn: 'Check the mailbox for a letter.', exampleEs: 'Revisa el buzón por una carta.' },
    { id: 'i-need-help', en: 'I need help', es: 'Necesito ayuda',
      exampleEn: 'Excuse me, I need help.', exampleEs: 'Disculpe, necesito ayuda.' },
    { id: 'emergency', en: 'emergency', es: 'la emergencia',
      exampleEn: 'Call 911 in an emergency.', exampleEs: 'Llama al 911 en una emergencia.' },
    { id: 'can-i-use-your-phone', en: 'Can I use your phone?', es: '¿Puedo usar tu teléfono?',
      exampleEn: 'Excuse me, can I use your phone?', exampleEs: 'Disculpe, ¿puedo usar tu teléfono?' },
    { id: 'im-lost', en: "I'm lost", es: 'Estoy perdido / perdida',
      exampleEn: "Excuse me, I'm lost. Can you help me?", exampleEs: 'Disculpe, estoy perdido. ¿Me puede ayudar?' },
  ],
  grammar: [
    {
      titleEn: 'Asking for personal information: "What is your...?"',
      titleEs: 'Pedir información personal: "What is your...?"',
      explanationEn: '"What is your...?" is the pattern used on almost every form and at almost every office desk. Just swap in the word you need: phone number, address, name.',
      explanationEs: '"What is your...?" es el patrón que se usa en casi todos los formularios y en casi todos los mostradores de oficina. Solo cambia la palabra que necesitas: phone number, address, name.',
      examples: [
        { en: 'What is your phone number?', es: '¿Cuál es tu número de teléfono?' },
        { en: 'What is your address?', es: '¿Cuál es tu dirección?' },
      ],
    },
    {
      titleEn: 'Softening a request: "Excuse me..." and "Can I...?"',
      titleEs: 'Suavizar una petición: "Excuse me..." y "Can I...?"',
      explanationEn: 'Starting a request with "Excuse me" is a polite way to get a stranger\'s attention before asking for help or directions. "Can I...?" politely asks for permission to do something.',
      explanationEs: 'Empezar una petición con "Excuse me" es una manera cortés de llamar la atención de un desconocido antes de pedir ayuda o direcciones. "Can I...?" pide permiso cortésmente para hacer algo.',
      examples: [
        { en: 'Excuse me, where is the bathroom?', es: 'Disculpe, ¿dónde está el baño?' },
        { en: 'Excuse me, can I use your phone?', es: 'Disculpe, ¿puedo usar tu teléfono?' },
      ],
    },
  ],
  quiz: [
    { id: 'q1', type: 'multiple-choice', promptEn: '"La dirección" in English is:', promptEs: '"La dirección" en inglés es:',
      answer: 'address', options: ['address', 'phone number', 'ID', 'wallet'] },
    { id: 'q2', type: 'multiple-choice', promptEn: '"El baño" in English is:', promptEs: '"El baño" en inglés es:',
      answer: 'bathroom', options: ['bathroom', 'mailbox', 'wallet', 'key'] },
    { id: 'q3', type: 'multiple-choice', promptEn: 'How do you say "Necesito ayuda"?', promptEs: '¿Cómo se dice "Necesito ayuda"?',
      answer: 'I need help', options: ['I need help', "I'm lost", 'Can I use your phone?', 'Where is the bathroom?'] },
    { id: 'q4', type: 'multiple-choice', promptEn: '"Estoy perdido" in English is:', promptEs: '"Estoy perdido" en inglés es:',
      answer: "I'm lost", options: ["I'm lost", 'I need help', 'I lost my key', 'Where is it?'] },
    { id: 'q5', type: 'multiple-choice', promptEn: '"La contraseña" in English is:', promptEs: '"La contraseña" en inglés es:',
      answer: 'password', options: ['password', 'wifi', 'address', 'ID'] },
    { id: 'q6', type: 'multiple-choice', promptEn: 'Complete: "Excuse me, ___ is the bathroom?"', promptEs: 'Completa: "Excuse me, ___ is the bathroom?"',
      answer: 'where', options: ['where', 'what', 'who', 'when'] },
    { id: 'q7', type: 'multiple-choice', promptEn: 'Which phrase politely starts a request to a stranger?', promptEs: '¿Qué frase empieza cortésmente una petición a un desconocido?',
      answer: 'Excuse me', options: ['Excuse me', 'I need help', 'Where is it?', 'Yes please'] },
    { id: 'q8', type: 'multiple-choice', promptEn: '"¿Puedo usar tu teléfono?" in English is:', promptEs: '"¿Puedo usar tu teléfono?" en inglés es:',
      answer: 'Can I use your phone?', options: ['Can I use your phone?', 'I need help', 'Where is the bathroom?', "I'm lost"] },
  ],
  teachingScenarios: [
    {
      label: 'Part 1: Filling out a form',
      text: 'You are filling out a form at a community office.',
      wordBank: [
        { en: '555-0123', es: '(tu número)' },
        { en: '45 Elm Street', es: '(tu dirección)' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: 'What is your phone number?', es: '¿Cuál es tu número de teléfono?' },
          { speaker: 'student', en: '555-0123.', es: '555-0123.' },
        ],
        [
          { speaker: 'tutor', en: 'What is your address?', es: '¿Cuál es tu dirección?' },
          { speaker: 'student', en: '45 Elm Street.', es: '45 Elm Street.' },
        ],
        [
          { speaker: 'tutor', en: 'Do you have an ID?', es: '¿Tiene una identificación?' },
          { speaker: 'student', en: 'Yes, here it is.', es: 'Sí, aquí está.' },
        ],
      ],
    },
    {
      label: 'Part 2: Asking for help at a public place',
      text: 'You are at a library and need to ask where the bathroom is and the wifi password.',
      chunks: [
        [
          { speaker: 'tutor', en: 'Welcome to the library. How can I help?', es: 'Bienvenido a la biblioteca. ¿Cómo puedo ayudarte?' },
          { speaker: 'student', en: 'Excuse me, where is the bathroom?', es: 'Disculpe, ¿dónde está el baño?' },
        ],
        [
          { speaker: 'tutor', en: "It's down the hall.", es: 'Está al final del pasillo.' },
          { speaker: 'student', en: 'What is the wifi password?', es: '¿Cuál es la contraseña del wifi?' },
        ],
        [
          { speaker: 'tutor', en: "It's on the card by the door.", es: 'Está en la tarjeta junto a la puerta.' },
          { speaker: 'student', en: 'Thank you.', es: 'Gracias.' },
        ],
      ],
    },
    {
      label: 'Part 3: Asking a stranger for help',
      text: 'You are lost on the street. Practice asking a stranger for help.',
      chunks: [
        [
          { speaker: 'tutor', en: 'Excuse me, are you okay?', es: 'Disculpe, ¿está bien?' },
          { speaker: 'student', en: 'Excuse me, I need help.', es: 'Disculpe, necesito ayuda.' },
        ],
        [
          { speaker: 'tutor', en: 'Of course, what happened?', es: 'Claro, ¿qué pasó?' },
          { speaker: 'student', en: "I'm lost. Can you help me?", es: 'Estoy perdido. ¿Me puede ayudar?' },
        ],
        [
          { speaker: 'tutor', en: "I'll try. What do you need?", es: 'Voy a intentar. ¿Qué necesitas?' },
          { speaker: 'student', en: 'Can I use your phone?', es: '¿Puedo usar tu teléfono?' },
        ],
      ],
    },
  ],
  practiceActivities: [
    {
      titleEn: 'Fill Out My Form',
      titleEs: 'Llena Mi Formulario',
      instructionsEn: 'The tutor plays an office worker asking for your information.',
      instructionsEs: 'El tutor hace de trabajador de oficina y pide tu información.',
      chunks: [
        [
          { speaker: 'tutor', en: 'What is your name?', es: '¿Cómo te llamas?' },
          { speaker: 'student', en: 'My name is...', es: 'Me llamo...' },
        ],
        [
          { speaker: 'tutor', en: 'Do you have your ID?', es: '¿Tienes tu identificación?' },
          { speaker: 'student', en: 'Yes, here it is.', es: 'Sí, aquí está.' },
        ],
      ],
    },
    {
      titleEn: 'Ask a Stranger for Help',
      titleEs: 'Pide Ayuda a un Desconocido',
      instructionsEn: 'The tutor describes a situation. Ask the right question.',
      instructionsEs: 'El tutor describe una situación. Haz la pregunta correcta.',
      wordBank: [
        { en: 'my keys', es: 'mis llaves' },
        { en: 'my wallet', es: 'mi cartera' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: 'You lost your keys.', es: 'Perdiste tus llaves.' },
          { speaker: 'student', en: 'I lost my keys. Can you help me?', es: 'Perdí mis llaves. ¿Me puede ayudar?' },
        ],
        [
          { speaker: 'tutor', en: 'You need the wifi password.', es: 'Necesitas la contraseña del wifi.' },
          { speaker: 'student', en: 'What is the wifi password?', es: '¿Cuál es la contraseña del wifi?' },
        ],
      ],
    },
    {
      titleEn: 'Emergency Practice',
      titleEs: 'Práctica de Emergencia',
      instructionsEn: 'The tutor describes a minor emergency. Explain what you need.',
      instructionsEs: 'El tutor describe una emergencia menor. Explica lo que necesitas.',
      chunks: [
        [
          { speaker: 'tutor', en: 'You are locked out of your apartment.', es: 'Te quedaste afuera de tu apartamento.' },
          { speaker: 'student', en: 'This is an emergency. I need help.', es: 'Esto es una emergencia. Necesito ayuda.' },
        ],
        [
          { speaker: 'tutor', en: 'You lost your phone.', es: 'Perdiste tu teléfono.' },
          { speaker: 'student', en: 'Can I use your phone?', es: '¿Puedo usar tu teléfono?' },
        ],
      ],
    },
  ],
  worksheet: [
    { id: 'w1', promptEn: 'What is your phone ____?', promptEs: '¿Cuál es tu número de teléfono? (What is your phone ____?)', answer: 'number' },
    { id: 'w2', promptEn: 'Where is the ____?', promptEs: '¿Dónde está el baño? (Where is the ____?)', answer: 'bathroom' },
    { id: 'w3', promptEn: 'I need ____.', promptEs: 'Necesito ayuda. (I need ____.)', answer: 'help' },
    { id: 'w4', promptEn: 'I am ____.', promptEs: 'Estoy perdido. (I am ____.)', answer: 'lost' },
    { id: 'w5', promptEn: 'Can I use your ____?', promptEs: '¿Puedo usar tu teléfono? (Can I use your ____?)', answer: 'phone' },
  ],
}

export default module
