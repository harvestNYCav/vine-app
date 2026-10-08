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
  classWorksheet: [
    { id: 'cw1', promptEn: 'What is your ____? (dirección)', promptEs: '¿Cuál es tu dirección? (What is your ____?)', answer: 'address' },
    { id: 'cw2', promptEn: 'Can I see your ____, please? (identificación)', promptEs: '¿Puedo ver su identificación? (Can I see your ____?)', answer: 'ID' },
    { id: 'cw3', promptEn: 'What is the wifi ____?', promptEs: '¿Cuál es la contraseña del wifi? (What is the wifi ____?)', answer: 'password' },
    { id: 'cw4', promptEn: 'I lost my ____. My money is in it.', promptEs: 'Perdí mi cartera. (I lost my ____.)', answer: 'wallet' },
    { id: 'cw5', promptEn: 'I can\'t open the door. I don\'t have my ____.', promptEs: 'No tengo mi llave. (I don\'t have my ____.)', answer: 'key' },
    { id: 'cw6', promptEn: 'Check the ____ for letters.', promptEs: 'Revisa el buzón. (Check the ____ for letters.)', answer: 'mailbox' },
    { id: 'cw7', promptEn: '____ me, where is the restroom?', promptEs: 'Disculpe, ¿dónde está el baño? (____ me...)', answer: 'Excuse' },
    { id: 'cw8', promptEn: 'This is an ____! Call 911!', promptEs: '¡Es una emergencia! (This is an ____!)', answer: 'emergency' },
  ],
  listening: [
    {
      titleEn: 'Filling Out a Form',
      titleEs: 'Llenando un formulario',
      script: [
        { speaker: 'Clerk', en: 'What is your name, please?' },
        { speaker: 'Mr. Díaz', en: 'Rafael Díaz.' },
        { speaker: 'Clerk', en: 'What is your address?' },
        { speaker: 'Mr. Díaz', en: '125 Grand Street, Brooklyn.' },
        { speaker: 'Clerk', en: 'And your phone number?' },
        { speaker: 'Mr. Díaz', en: '718-555-0142.' },
        { speaker: 'Clerk', en: 'Can I see your ID?' },
        { speaker: 'Mr. Díaz', en: 'Yes, here it is.' },
      ],
      questions: [
        { id: 'l1q1', promptEn: 'What is the man\'s first name?', promptEs: '¿Cuál es el nombre del hombre?', answer: 'Rafael' },
        { id: 'l1q2', promptEn: 'What is his street?', promptEs: '¿Cuál es su calle?', answer: 'Grand Street' },
        { id: 'l1q3', promptEn: 'Write his phone number.', promptEs: 'Escribe su número de teléfono.', answer: '718-555-0142' },
        { id: 'l1q4', promptEn: 'What does the clerk want to see?', promptEs: '¿Qué quiere ver el empleado?', answer: 'His ID' },
      ],
    },
    {
      titleEn: 'I\'m Lost',
      titleEs: 'Estoy perdida',
      script: [
        { speaker: 'Sara', en: 'Excuse me. I need help. I\'m lost.' },
        { speaker: 'Man', en: 'Where do you want to go?' },
        { speaker: 'Sara', en: 'To the library. My phone has no battery.' },
        { speaker: 'Man', en: 'The library is two blocks from here.' },
        { speaker: 'Sara', en: 'Thank you. Can I use your phone? I need to call my son.' },
        { speaker: 'Man', en: 'Sure, here you go.' },
      ],
      questions: [
        { id: 'l2q1', promptEn: 'What is Sara\'s problem?', promptEs: '¿Cuál es el problema de Sara?', answer: 'She is lost.' },
        { id: 'l2q2', promptEn: 'Where does Sara want to go?', promptEs: '¿A dónde quiere ir Sara?', answer: 'To the library' },
        { id: 'l2q3', promptEn: 'Why can\'t Sara use her phone?', promptEs: '¿Por qué Sara no puede usar su teléfono?', answer: 'It has no battery.' },
        { id: 'l2q4', promptEn: 'Who does Sara want to call?', promptEs: '¿A quién quiere llamar Sara?', answer: 'Her son' },
      ],
    },
  ],
  inPersonQuiz: [
    { id: 'iq1', kind: 'translate', promptEn: 'Write in English: "Necesito ayuda."', answer: 'I need help.' },
    { id: 'iq2', kind: 'translate', promptEn: 'Write in English: "Estoy perdido."', answer: "I'm lost." },
    { id: 'iq3', kind: 'translate', promptEn: 'Write in Spanish: "Where is the bathroom?"', answer: '¿Dónde está el baño?' },
    { id: 'iq4', kind: 'translate', promptEn: 'Write in English: "¿Puedo usar su teléfono?"', answer: 'Can I use your phone?' },
    { id: 'iq5', kind: 'dictation', promptEn: 'What is your phone number?', answer: 'What is your phone number?' },
    { id: 'iq6', kind: 'dictation', promptEn: 'I lost my keys.', answer: 'I lost my keys.' },
    { id: 'iq7', kind: 'dictation', promptEn: 'What is the wifi password?', answer: 'What is the wifi password?' },
    { id: 'iq8', kind: 'short-answer', promptEn: 'What number do you call in an emergency?', promptEs: '¿Qué número llamas en una emergencia?', answer: '911' },
    { id: 'iq9', kind: 'short-answer', promptEn: 'What is your address?', promptEs: '¿Cuál es tu dirección?', answer: 'My address is ___. (Answers will vary.)' },
    { id: 'iq10', kind: 'short-answer', promptEn: 'What is your phone number?', promptEs: '¿Cuál es tu número de teléfono?', answer: 'My phone number is ___. (Answers will vary.)' },
  ],
}

export default module
