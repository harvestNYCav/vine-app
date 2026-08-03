import type { Module } from '@/types'

const module: Module = {
  slug: 'pronouns-and-greetings',
  track: 'esl',
  titleEn: 'Pronouns and Greetings',
  titleEs: 'Pronombres y Saludos',
  descriptionEn: 'Learn how to talk about yourself and others, and greet people politely.',
  descriptionEs: 'Aprende a hablar de ti mismo y de otras personas, y a saludar cortésmente.',
  icon: 'Smile',
  vocab: [
    { id: 'i', en: 'I', es: 'yo',
      exampleEn: 'I am a student.', exampleEs: 'Yo soy estudiante.' },
    { id: 'you', en: 'you', es: 'tú / usted',
      exampleEn: 'You are my teacher.', exampleEs: 'Tú eres mi maestro.' },
    { id: 'he-she', en: 'he / she', es: 'él / ella',
      exampleEn: 'He is my son. She is my daughter.', exampleEs: 'Él es mi hijo. Ella es mi hija.' },
    { id: 'we-they', en: 'we / they', es: 'nosotros / ellos',
      exampleEn: 'We are neighbors. They are my friends.', exampleEs: 'Nosotros somos vecinos. Ellos son mis amigos.' },
    { id: 'hello', en: 'Hello / Hi', es: 'Hola',
      exampleEn: 'Hello! How are you?', exampleEs: '¡Hola! ¿Cómo estás?' },
    { id: 'good-morning', en: 'Good morning / Good afternoon', es: 'Buenos días / Buenas tardes',
      exampleEn: 'Good morning! Nice to see you.', exampleEs: '¡Buenos días! Qué gusto verte.' },
    { id: 'how-are-you', en: 'How are you?', es: '¿Cómo estás?',
      exampleEn: 'Hi, how are you today?', exampleEs: 'Hola, ¿cómo estás hoy?' },
    { id: 'i-am-fine', en: 'I am fine, thank you', es: 'Estoy bien, gracias',
      exampleEn: 'I am fine, thank you. And you?', exampleEs: 'Estoy bien, gracias. ¿Y tú?' },
    { id: 'nice-to-meet-you', en: 'Nice to meet you', es: 'Mucho gusto',
      exampleEn: 'Nice to meet you, my name is Maria.', exampleEs: 'Mucho gusto, me llamo María.' },
    { id: 'whats-your-name', en: "What's your name?", es: '¿Cómo te llamas?',
      exampleEn: "Hi, what's your name?", exampleEs: 'Hola, ¿cómo te llamas?' },
    { id: 'my-name-is', en: 'My name is...', es: 'Me llamo...',
      exampleEn: 'My name is Carlos.', exampleEs: 'Me llamo Carlos.' },
    { id: 'this-is-my-friend', en: 'This is my friend...', es: 'Este es mi amigo... / Esta es mi amiga...',
      exampleEn: 'This is my friend Ana.', exampleEs: 'Esta es mi amiga Ana.' },
    { id: 'goodbye', en: 'Goodbye / See you later', es: 'Adiós / Hasta luego',
      exampleEn: 'Goodbye! See you later.', exampleEs: '¡Adiós! Hasta luego.' },
    { id: 'see-you-next-week', en: 'See you next week', es: 'Nos vemos la próxima semana',
      exampleEn: 'Thank you for today. See you next week!', exampleEs: 'Gracias por hoy. ¡Nos vemos la próxima semana!' },
  ],
  grammar: [
    {
      titleEn: 'Subject pronouns: I, you, he/she, we, they',
      titleEs: 'Pronombres de sujeto: I, you, he/she, we, they',
      explanationEn: 'A subject pronoun replaces a person\'s name so you don\'t have to repeat it. Use "he" for a man or boy, "she" for a woman or girl, "we" when you include yourself with others, and "they" for two or more other people.',
      explanationEs: 'Un pronombre de sujeto reemplaza el nombre de una persona para no repetirlo. Usa "he" para un hombre o niño, "she" para una mujer o niña, "we" cuando te incluyes a ti mismo con otros, y "they" para dos o más personas.',
      examples: [
        { en: 'He is my son. She is my daughter.', es: 'Él es mi hijo. Ella es mi hija.' },
        { en: 'We are neighbors.', es: 'Nosotros somos vecinos.' },
        { en: 'They are my friends.', es: 'Ellos son mis amigos.' },
      ],
    },
    {
      titleEn: 'Greetings for different times of day',
      titleEs: 'Saludos para diferentes horas del día',
      explanationEn: '"Hello" and "Hi" work at any time of day and in almost any situation. "Good morning" is used before noon, and "Good afternoon" from noon until evening — these sound a little more polite, which is useful with someone you don\'t know well.',
      explanationEs: '"Hello" y "Hi" funcionan a cualquier hora del día y en casi cualquier situación. "Good morning" se usa antes del mediodía, y "Good afternoon" desde el mediodía hasta la noche — suenan un poco más corteses, lo cual es útil con alguien que no conoces bien.',
      examples: [
        { en: 'Hello! How are you?', es: '¡Hola! ¿Cómo estás?' },
        { en: 'Good morning! Nice to see you.', es: '¡Buenos días! Qué gusto verte.' },
      ],
    },
  ],
  quiz: [
    { id: 'q1', type: 'multiple-choice', promptEn: '"Yo" in English is:', promptEs: '"Yo" en inglés es:',
      answer: 'I', options: ['I', 'you', 'he', 'we'] },
    { id: 'q2', type: 'multiple-choice', promptEn: 'How do you greet someone you are meeting for the first time?', promptEs: '¿Cómo saludas a alguien que conoces por primera vez?',
      answer: 'Nice to meet you', options: ['Nice to meet you', 'Goodbye', 'How are you?', 'Hello'] },
    { id: 'q3', type: 'multiple-choice', promptEn: '"Ella" in English is:', promptEs: '"Ella" en inglés es:',
      answer: 'she', options: ['she', 'he', 'they', 'we'] },
    { id: 'q4', type: 'multiple-choice', promptEn: 'Complete: "___ are my neighbors." ("Ellos son mis vecinos")', promptEs: 'Completa: "___ are my neighbors." ("Ellos son mis vecinos")',
      answer: 'They', options: ['They', 'He', 'You', 'I'] },
    { id: 'q5', type: 'multiple-choice', promptEn: 'How do you say goodbye in English?', promptEs: '¿Cómo te despides en inglés?',
      answer: 'Goodbye', options: ['Goodbye', 'Hello', 'How are you?', 'Nice to meet you'] },
    { id: 'q6', type: 'multiple-choice', promptEn: 'Complete: "___ is my daughter." ("Ella")', promptEs: 'Completa: "___ is my daughter." ("Ella")',
      answer: 'She', options: ['She', 'He', 'They', 'We'] },
    { id: 'q7', type: 'multiple-choice', promptEn: 'Which greeting do you use before noon?', promptEs: '¿Qué saludo usas antes del mediodía?',
      answer: 'Good morning', options: ['Good morning', 'Good afternoon', 'Goodbye', 'See you next week'] },
    { id: 'q8', type: 'multiple-choice', promptEn: '"Nosotros somos vecinos" in English is:', promptEs: '"Nosotros somos vecinos" en inglés es:',
      answer: 'We are neighbors', options: ['We are neighbors', 'They are neighbors', 'You are neighbors', 'I am a neighbor'] },
  ],
  teachingScenarios: [
    { label: 'Part 1: Meeting a new neighbor',
      text: 'You meet a new neighbor outside your building.',
      wordBank: [
        { en: 'Ana', es: '(tu nombre)' },
        { en: 'fine', es: 'bien' },
        { en: 'good', es: 'bien' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: "Hello! I don't think we've met.", es: '¡Hola! Creo que no nos conocemos.' },
          { speaker: 'student', en: 'Hello! Nice to meet you.', es: '¡Hola! Mucho gusto.' },
        ],
        [
          { speaker: 'tutor', en: 'How are you?', es: '¿Cómo estás?' },
          { speaker: 'student', en: 'Fine, thank you.', es: 'Bien, gracias.' },
        ],
        [
          { speaker: 'tutor', en: "What's your name?", es: '¿Cómo te llamas?' },
          { speaker: 'student', en: 'My name is Ana.', es: 'Me llamo Ana.' },
        ],
        [
          { speaker: 'tutor', en: 'Nice to meet you, Ana!', es: '¡Mucho gusto, Ana!' },
          { speaker: 'student', en: 'Nice to meet you too.', es: 'Mucho gusto también.' },
        ],
      ] },
    { label: 'Part 2: Introducing a friend',
      text: 'Your neighbor is with you. Introduce a friend using pronouns.',
      wordBank: [
        { en: 'friend', es: 'amigo/a' },
        { en: 'neighbor', es: 'vecino/a' },
        { en: 'coworker', es: 'compañero/a de trabajo' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: 'This is my friend Pedro.', es: 'Este es mi amigo Pedro.' },
          { speaker: 'student', en: 'Nice to meet you, Pedro.', es: 'Mucho gusto, Pedro.' },
        ],
        [
          { speaker: 'tutor', en: 'He lives in the next building.', es: 'Él vive en el edificio de al lado.' },
          { speaker: 'student', en: 'Oh, he is my neighbor too!', es: '¡Ah, él también es mi vecino!' },
        ],
        [
          { speaker: 'tutor', en: 'This is my friend Sara. She works with me.', es: 'Esta es mi amiga Sara. Ella trabaja conmigo.' },
          { speaker: 'student', en: 'Nice to meet you, Sara.', es: 'Mucho gusto, Sara.' },
        ],
      ] },
    { label: 'Part 3: Saying goodbye',
      text: 'The event is ending. Say goodbye and that you will see them again.',
      wordBank: [
        { en: 'next week', es: 'la próxima semana' },
        { en: 'tomorrow', es: 'mañana' },
        { en: 'soon', es: 'pronto' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: "It's getting late. I should go now.", es: 'Se está haciendo tarde. Debo irme.' },
          { speaker: 'student', en: 'Yes, me too.', es: 'Sí, yo también.' },
        ],
        [
          { speaker: 'tutor', en: 'Goodbye! It was nice to meet you.', es: '¡Adiós! Fue un placer conocerte.' },
          { speaker: 'student', en: 'Goodbye! Nice to meet you too.', es: '¡Adiós! Igualmente, un placer.' },
        ],
        [
          { speaker: 'tutor', en: 'See you next week?', es: '¿Nos vemos la próxima semana?' },
          { speaker: 'student', en: 'Yes, see you next week!', es: '¡Sí, nos vemos la próxima semana!' },
        ],
      ] },
  ],
  practiceActivities: [
    {
      titleEn: 'Pronoun Swap',
      titleEs: 'Cambia el Pronombre',
      instructionsEn: 'Replace the name in each sentence with the correct pronoun.',
      instructionsEs: 'Reemplaza el nombre en cada oración con el pronombre correcto.',
      chunks: [
        [
          { speaker: 'tutor', en: 'Maria is my neighbor.', es: 'María es mi vecina.' },
          { speaker: 'student', en: 'She is my neighbor.', es: 'Ella es mi vecina.' },
        ],
        [
          { speaker: 'tutor', en: 'Carlos and Ana are my friends.', es: 'Carlos y Ana son mis amigos.' },
          { speaker: 'student', en: 'They are my friends.', es: 'Ellos son mis amigos.' },
        ],
      ],
    },
    {
      titleEn: 'Greet Three Ways',
      titleEs: 'Saluda de Tres Maneras',
      instructionsEn: 'Greet your tutor in the morning and ask how they are.',
      instructionsEs: 'Saluda a tu tutor en la mañana y pregúntale cómo está.',
      wordBank: [
        { en: 'Good morning', es: 'Buenos días' },
        { en: 'Good afternoon', es: 'Buenas tardes' },
        { en: 'Hi', es: 'Hola' },
      ],
      chunks: [
        [
          { speaker: 'student', en: 'Good morning!', es: '¡Buenos días!' },
          { speaker: 'tutor', en: 'Good morning! How are you?', es: '¡Buenos días! ¿Cómo estás?' },
        ],
        [
          { speaker: 'student', en: 'I am fine, thank you. And you?', es: 'Estoy bien, gracias. ¿Y tú?' },
          { speaker: 'tutor', en: 'I am fine too.', es: 'Yo también estoy bien.' },
        ],
      ],
    },
    {
      titleEn: 'Introduce the Room',
      titleEs: 'Presenta el Salón',
      instructionsEn: 'A new person walks in. Introduce your tutor to them.',
      instructionsEs: 'Una nueva persona entra. Presenta a tu tutor.',
      chunks: [
        [
          { speaker: 'tutor', en: 'Who is this?', es: '¿Quién es este/esta?' },
          { speaker: 'student', en: 'This is my teacher.', es: 'Este es mi maestro.' },
        ],
        [
          { speaker: 'tutor', en: 'What does he do?', es: '¿A qué se dedica él?' },
          { speaker: 'student', en: 'He teaches English.', es: 'Él enseña inglés.' },
        ],
      ],
    },
  ],
  worksheet: [
    { id: 'w1', promptEn: '____ am a student.', promptEs: 'Yo soy estudiante. (____ am a student.)', answer: 'I' },
    { id: 'w2', promptEn: 'Hello! ____ are you today?', promptEs: '¡Hola! ¿Cómo estás hoy? (Hello! ____ are you today?)', answer: 'How' },
    { id: 'w3', promptEn: 'This is my friend. ____ is from Mexico.', promptEs: 'Este es mi amigo. Es de México. (This is my friend. ____ is from Mexico.)', answer: 'He' },
    { id: 'w4', promptEn: 'Nice to meet ____.', promptEs: 'Mucho gusto. (Nice to meet ____.)', answer: 'you' },
    { id: 'w5', promptEn: 'Goodbye! See ____ later.', promptEs: '¡Adiós! Nos vemos. (Goodbye! See ____ later.)', answer: 'you' },
  ],
}

export default module
