import type { Module } from '@/types'

const module: Module = {
  slug: 'introducing-yourself',
  track: 'esl',
  titleEn: 'Introducing Yourself',
  titleEs: 'Presentarte',
  descriptionEn: 'Learn how to meet new people and share basic information about yourself.',
  descriptionEs: 'Aprende a conocer personas nuevas y compartir información básica sobre ti.',
  icon: 'Hand',
  vocab: [
    {
      id: 'my-name-is',
      en: 'My name is...',
      es: 'Me llamo... / Mi nombre es...',
      exampleEn: 'My name is Maria. Nice to meet you!',
      exampleEs: 'Me llamo María. ¡Mucho gusto!',
    },
    {
      id: 'nice-to-meet-you',
      en: 'Nice to meet you',
      es: 'Mucho gusto',
      exampleEn: 'Nice to meet you! My name is Carlos.',
      exampleEs: '¡Mucho gusto! Me llamo Carlos.',
    },
    {
      id: 'i-am-from',
      en: 'I am from...',
      es: 'Soy de...',
      exampleEn: 'I am from Mexico. Where are you from?',
      exampleEs: 'Soy de México. ¿De dónde eres tú?',
    },
    {
      id: 'i-live-in',
      en: 'I live in...',
      es: 'Vivo en...',
      exampleEn: 'I live in Queens, New York.',
      exampleEs: 'Vivo en Queens, Nueva York.',
    },
    {
      id: 'i-speak',
      en: 'I speak...',
      es: 'Hablo...',
      exampleEn: 'I speak Spanish and a little English.',
      exampleEs: 'Hablo español y un poco de inglés.',
    },
    {
      id: 'how-are-you',
      en: 'How are you?',
      es: '¿Cómo estás?',
      exampleEn: 'Hello! How are you today?',
      exampleEs: '¡Hola! ¿Cómo estás hoy?',
    },
    {
      id: 'i-am-fine',
      en: 'I am fine, thank you',
      es: 'Estoy bien, gracias',
      exampleEn: 'I am fine, thank you. And you?',
      exampleEs: 'Estoy bien, gracias. ¿Y tú?',
    },
    {
      id: 'what-is-your-name',
      en: 'What is your name?',
      es: '¿Cómo te llamas?',
      exampleEn: 'Excuse me, what is your name?',
      exampleEs: 'Disculpa, ¿cómo te llamas?',
    },
    {
      id: 'good-morning',
      en: 'Good morning / Good afternoon',
      es: 'Buenos días / Buenas tardes',
      exampleEn: 'Good morning! Nice to meet you.',
      exampleEs: '¡Buenos días! Mucho gusto.',
    },
    {
      id: 'how-old-are-you',
      en: 'How old are you?',
      es: '¿Cuántos años tienes?',
      exampleEn: 'How old are you? I am thirty years old.',
      exampleEs: '¿Cuántos años tienes? Tengo treinta años.',
    },
    {
      id: 'i-am-years-old',
      en: 'I am ... years old',
      es: 'Tengo ... años',
      exampleEn: 'I am thirty-five years old.',
      exampleEs: 'Tengo treinta y cinco años.',
    },
    {
      id: 'what-do-you-do',
      en: 'What do you do?',
      es: '¿A qué te dedicas?',
      exampleEn: 'What do you do? I work in construction.',
      exampleEs: '¿A qué te dedicas? Trabajo en construcción.',
    },
    {
      id: 'i-work-as',
      en: 'I work as a...',
      es: 'Trabajo como...',
      exampleEn: 'I work as a cook.',
      exampleEs: 'Trabajo como cocinero.',
    },
    {
      id: 'goodbye',
      en: 'Goodbye / See you later',
      es: 'Adiós / Hasta luego',
      exampleEn: 'Goodbye! It was nice to meet you.',
      exampleEs: '¡Adiós! Fue un placer conocerte.',
    },
  ],
  grammar: [
    {
      titleEn: 'Talking about yourself: I + verb',
      titleEs: 'Hablar de ti mismo: I + verbo',
      explanationEn: 'To share facts about yourself, use "I" followed by a verb. With "to be," use "am": I am Maria. I am thirty-five years old. With action verbs like live, speak, and work, the verb stays in its base form after "I": I live in Queens. I speak Spanish. I work as a cook.',
      explanationEs: 'Para compartir datos sobre ti, usa "I" seguido de un verbo. Con "to be," usa "am": I am Maria. I am thirty-five years old. Con verbos de acción como live, speak y work, el verbo se mantiene en su forma base después de "I": I live in Queens. I speak Spanish. I work as a cook.',
      examples: [
        { en: 'I am Maria.', es: 'Yo soy María.' },
        { en: 'I live in Queens.', es: 'Vivo en Queens.' },
        { en: 'I speak Spanish and a little English.', es: 'Hablo español y un poco de inglés.' },
        { en: 'I work as a cook.', es: 'Trabajo como cocinero.' },
      ],
    },
    {
      titleEn: 'Asking questions: question word + is/are + subject',
      titleEs: 'Hacer preguntas: palabra interrogativa + is/are + sujeto',
      explanationEn: 'For "to be" questions, put the question word first, then "is" or "are," then the subject: What is your name? Where are you from? How old are you? For questions about actions or routines, use "do": What do you do?',
      explanationEs: 'Para preguntas con "to be," pon la palabra interrogativa primero, luego "is" o "are," y después el sujeto: What is your name? Where are you from? How old are you? Para preguntas sobre acciones o rutinas, usa "do": What do you do?',
      examples: [
        { en: 'What is your name?', es: '¿Cómo te llamas?' },
        { en: 'Where are you from?', es: '¿De dónde eres?' },
        { en: 'How old are you?', es: '¿Cuántos años tienes?' },
        { en: 'What do you do?', es: '¿A qué te dedicas?' },
      ],
    },
  ],
  quiz: [
    {
      id: 'q1',
      type: 'multiple-choice',
      promptEn: 'How do you say "Me llamo..." in English?',
      promptEs: '¿Cómo se dice "Me llamo..." en inglés?',
      answer: 'My name is...',
      options: ['My name is...', 'I live in...', 'I am from...', 'How are you?'],
    },
    {
      id: 'q2',
      type: 'multiple-choice',
      promptEn: 'What does "Nice to meet you" mean?',
      promptEs: '¿Qué significa "Nice to meet you"?',
      answer: 'Mucho gusto',
      options: ['Mucho gusto', 'Hasta luego', 'Soy de México', 'Estoy bien'],
    },
    {
      id: 'q3',
      type: 'multiple-choice',
      promptEn: 'How do you ask someone\'s name in English?',
      promptEs: '¿Cómo preguntas el nombre de alguien en inglés?',
      answer: 'What is your name?',
      options: ['What is your name?', 'Where are you from?', 'How are you?', 'I live in...'],
    },
    {
      id: 'q4',
      type: 'multiple-choice',
      promptEn: '"Soy de México" in English is:',
      promptEs: '"Soy de México" en inglés es:',
      answer: 'I am from Mexico',
      options: ['I am from Mexico', 'I live in Mexico', 'I speak Mexico', 'I am Mexico'],
    },
    {
      id: 'q5',
      type: 'multiple-choice',
      promptEn: 'How do you respond when someone asks "How are you?"',
      promptEs: '¿Cómo respondes cuando alguien pregunta "How are you?"',
      answer: 'I am fine, thank you',
      options: ['I am fine, thank you', 'Nice to meet you', 'My name is Carlos', 'I am from Queens'],
    },
    {
      id: 'q6',
      type: 'multiple-choice',
      promptEn: 'Complete: "I ___ Spanish and a little English."',
      promptEs: 'Completa: "I ___ Spanish and a little English."',
      answer: 'speak',
      options: ['speak', 'live', 'work', 'am'],
    },
    {
      id: 'q7',
      type: 'multiple-choice',
      promptEn: 'How do you ask someone\'s age?',
      promptEs: '¿Cómo preguntas la edad de alguien?',
      answer: 'How old are you?',
      options: ['How old are you?', 'What do you do?', 'Where do you live?', 'What is your name?'],
    },
    {
      id: 'q8',
      type: 'multiple-choice',
      promptEn: '"Trabajo como cocinero" in English is:',
      promptEs: '"Trabajo como cocinero" en inglés es:',
      answer: 'I work as a cook',
      options: ['I work as a cook', 'I am a cook', 'I live as a cook', 'I speak cook'],
    },
  ],
  teachingScenarios: [
    {
      label: 'Part 1: Meeting someone new',
      text: 'You are at a community event. Someone says hello.',
      wordBank: [
        { en: 'Rosa', es: '(su nombre)' },
        { en: 'fine', es: 'bien' },
        { en: 'good', es: 'bien' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: 'Good morning!', es: '¡Buenos días!' },
          { speaker: 'student', en: 'Good morning!', es: '¡Buenos días!' },
        ],
        [
          { speaker: 'tutor', en: 'What is your name?', es: '¿Cómo te llamas?' },
          { speaker: 'student', en: 'My name is Rosa.', es: 'Me llamo Rosa.' },
        ],
        [
          { speaker: 'tutor', en: 'Nice to meet you, Rosa!', es: '¡Mucho gusto, Rosa!' },
          { speaker: 'student', en: 'Nice to meet you too.', es: 'Mucho gusto también.' },
        ],
        [
          { speaker: 'tutor', en: 'How are you?', es: '¿Cómo estás?' },
          { speaker: 'student', en: 'Fine, thank you.', es: 'Bien, gracias.' },
        ],
      ],
    },
    {
      label: 'Part 2: Sharing more about yourself',
      text: 'Rosa keeps talking. Practice sharing where you are from and what you speak.',
      wordBank: [
        { en: 'Mexico', es: 'México' },
        { en: 'Queens', es: 'Queens' },
        { en: 'Spanish', es: 'español' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: 'Where are you from?', es: '¿De dónde eres?' },
          { speaker: 'student', en: 'I am from Mexico.', es: 'Soy de México.' },
        ],
        [
          { speaker: 'tutor', en: 'Where do you live now?', es: '¿Dónde vives ahora?' },
          { speaker: 'student', en: 'I live in Queens.', es: 'Vivo en Queens.' },
        ],
        [
          { speaker: 'tutor', en: 'What languages do you speak?', es: '¿Qué idiomas hablas?' },
          { speaker: 'student', en: 'Spanish, and a little English.', es: 'Español, y un poco de inglés.' },
        ],
      ],
    },
    {
      label: 'Part 3: Talking about work and saying goodbye',
      text: 'Practice describing your job, then say goodbye.',
      wordBank: [
        { en: 'cook', es: 'cocinero/a' },
        { en: 'thirty-five', es: 'treinta y cinco' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: 'What do you do?', es: '¿A qué te dedicas?' },
          { speaker: 'student', en: 'I work as a cook.', es: 'Trabajo como cocinera.' },
        ],
        [
          { speaker: 'tutor', en: 'How old are you?', es: '¿Cuántos años tienes?' },
          { speaker: 'student', en: 'I am thirty-five.', es: 'Tengo treinta y cinco años.' },
        ],
        [
          { speaker: 'tutor', en: 'Goodbye! Nice to meet you.', es: '¡Adiós! Fue un placer conocerte.' },
          { speaker: 'student', en: 'Goodbye! See you later.', es: '¡Adiós! Hasta luego.' },
        ],
      ],
    },
  ],
  practiceActivities: [
    {
      titleEn: 'Meet a New Neighbor',
      titleEs: 'Conoce a un Vecino Nuevo',
      instructionsEn: 'Practice saying your name and where you are from to a new neighbor.',
      instructionsEs: 'Practica decir tu nombre y de dónde eres a un vecino nuevo.',
      wordBank: [
        { en: '(your name)', es: '(tu nombre)' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: 'Hi! I am your new neighbor.', es: '¡Hola! Soy tu nuevo vecino.' },
          { speaker: 'student', en: 'Hi! My name is...', es: '¡Hola! Me llamo...' },
        ],
        [
          { speaker: 'tutor', en: 'Where are you from?', es: '¿De dónde eres?' },
          { speaker: 'student', en: 'I am from...', es: 'Soy de...' },
        ],
      ],
    },
    {
      titleEn: 'Ask the Questions',
      titleEs: 'Haz las Preguntas',
      instructionsEn: 'Now you ask the questions. Your tutor answers.',
      instructionsEs: 'Ahora tú haces las preguntas. Tu tutor responde.',
      wordBank: [
        { en: 'What', es: 'Qué' },
        { en: 'Where', es: 'Dónde' },
        { en: 'How old', es: 'Cuántos años' },
      ],
      chunks: [
        [
          { speaker: 'student', en: 'What is your name?', es: '¿Cómo te llamas?' },
          { speaker: 'tutor', en: 'My name is...', es: 'Me llamo...' },
        ],
        [
          { speaker: 'student', en: 'How old are you?', es: '¿Cuántos años tienes?' },
          { speaker: 'tutor', en: 'I am... years old.', es: 'Tengo... años.' },
        ],
      ],
    },
    {
      titleEn: 'Say It Right',
      titleEs: 'Dilo Bien',
      instructionsEn: 'Your tutor says a sentence with a small mistake. Say it correctly.',
      instructionsEs: 'Tu tutor dice una oración con un pequeño error. Dila correctamente.',
      wordBank: [
        { en: 'My name is...', es: 'Me llamo...' },
        { en: 'I am from...', es: 'Soy de...' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: '"My name Maria." — What is the right way?', es: '"My name Maria." — ¿Cuál es la forma correcta?' },
          { speaker: 'student', en: 'My name is Maria.', es: 'Me llamo Maria.' },
        ],
        [
          { speaker: 'tutor', en: '"I from Mexico." — What is the right way?', es: '"I from Mexico." — ¿Cuál es la forma correcta?' },
          { speaker: 'student', en: 'I am from Mexico.', es: 'Soy de México.' },
        ],
      ],
    },
  ],
  worksheet: [
    { id: 'w1', promptEn: 'My name ____ Maria.', promptEs: 'Me llamo Maria. (My name ____ Maria.)', answer: 'is' },
    { id: 'w2', promptEn: 'I ____ from Mexico.', promptEs: 'Soy de México. (I ____ from Mexico.)', answer: 'am' },
    { id: 'w3', promptEn: 'Where ____ you from?', promptEs: '¿De dónde eres? (Where ____ you from?)', answer: 'are' },
    { id: 'w4', promptEn: 'I ____ Spanish and a little English.', promptEs: 'Hablo español y un poco de inglés. (I ____ Spanish...)', answer: 'speak' },
    { id: 'w5', promptEn: 'Nice to ____ you.', promptEs: 'Mucho gusto. (Nice to ____ you.)', answer: 'meet' },
  ],
}

export default module
