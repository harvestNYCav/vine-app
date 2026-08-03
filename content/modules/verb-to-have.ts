import type { Module } from '@/types'

const module: Module = {
  slug: 'verb-to-have',
  track: 'esl',
  titleEn: 'The Verb "To Have"',
  titleEs: 'El Verbo "To Have"',
  descriptionEn: 'Learn how to talk about what you have — family, appointments, and everyday needs.',
  descriptionEs: 'Aprende a hablar de lo que tienes — familia, citas y necesidades diarias.',
  icon: 'Package',
  vocab: [
    { id: 'i-have', en: 'I have', es: 'tengo',
      exampleEn: 'I have a car.', exampleEs: 'Tengo un carro.' },
    { id: 'you-have', en: 'you have', es: 'tú tienes',
      exampleEn: 'You have a good job.', exampleEs: 'Tú tienes un buen trabajo.' },
    { id: 'he-she-has', en: 'he / she has', es: 'él / ella tiene',
      exampleEn: 'She has three children.', exampleEs: 'Ella tiene tres hijos.' },
    { id: 'we-have', en: 'we have', es: 'nosotros tenemos',
      exampleEn: 'We have a small apartment.', exampleEs: 'Tenemos un apartamento pequeño.' },
    { id: 'they-have', en: 'they have', es: 'ellos tienen',
      exampleEn: 'They have two cars.', exampleEs: 'Ellos tienen dos carros.' },
    { id: 'i-dont-have', en: "I don't have", es: 'no tengo',
      exampleEn: "I don't have a car.", exampleEs: 'No tengo carro.' },
    { id: 'do-you-have', en: 'Do you have...?', es: '¿Tienes...?',
      exampleEn: 'Do you have a pen?', exampleEs: '¿Tienes un lapicero?' },
    { id: 'does-he-she-have', en: 'Does he/she have...?', es: '¿Tiene él/ella...?',
      exampleEn: 'Does she have insurance?', exampleEs: '¿Tiene ella seguro médico?' },
    { id: 'i-have-two-children', en: 'I have two children', es: 'Tengo dos hijos',
      exampleEn: 'I have two children in school.', exampleEs: 'Tengo dos hijos en la escuela.' },
    { id: 'i-have-an-appointment', en: 'I have an appointment', es: 'Tengo una cita',
      exampleEn: 'I have an appointment at 3 o\'clock.', exampleEs: 'Tengo una cita a las 3.' },
    { id: 'i-have-a-headache', en: 'I have a headache', es: 'Tengo dolor de cabeza',
      exampleEn: 'I have a headache today.', exampleEs: 'Tengo dolor de cabeza hoy.' },
    { id: 'i-have-a-job', en: 'I have a job', es: 'Tengo un trabajo',
      exampleEn: 'I have a job in a restaurant.', exampleEs: 'Tengo un trabajo en un restaurante.' },
    { id: 'i-have-a-question', en: 'I have a question', es: 'Tengo una pregunta',
      exampleEn: 'Excuse me, I have a question.', exampleEs: 'Disculpe, tengo una pregunta.' },
    { id: 'i-dont-have-any-money', en: "I don't have any money", es: 'No tengo dinero',
      exampleEn: "I don't have any money with me today.", exampleEs: 'No tengo dinero conmigo hoy.' },
  ],
  grammar: [
    {
      titleEn: '"have" vs "has"',
      titleEs: '"have" vs "has"',
      explanationEn: 'Use "have" with I, you, we, and they. Use "has" with he, she, or it, and with one other person\'s name (Maria has, my neighbor has).',
      explanationEs: 'Usa "have" con I, you, we y they. Usa "has" con he, she, o it, y con el nombre de otra persona (Maria has, my neighbor has).',
      examples: [
        { en: 'I have a car.', es: 'Tengo un carro.' },
        { en: 'She has three children.', es: 'Ella tiene tres hijos.' },
        { en: 'We have a small apartment.', es: 'Tenemos un apartamento pequeño.' },
        { en: 'They have two cars.', es: 'Ellos tienen dos carros.' },
      ],
    },
    {
      titleEn: 'Questions and negatives: do/does + have',
      titleEs: 'Preguntas y negaciones: do/does + have',
      explanationEn: 'To ask a question, use "Do" (with I/you/we/they) or "Does" (with he/she/it) before the subject, and "have" stays in its base form. For a negative, add "don\'t" or "doesn\'t" before "have."',
      explanationEs: 'Para hacer una pregunta, usa "Do" (con I/you/we/they) o "Does" (con he/she/it) antes del sujeto, y "have" se mantiene en su forma base. Para una negación, agrega "don\'t" o "doesn\'t" antes de "have."',
      examples: [
        { en: 'Do you have a pen?', es: '¿Tienes un lapicero?' },
        { en: 'Does she have insurance?', es: '¿Tiene ella seguro médico?' },
        { en: "I don't have a car.", es: 'No tengo carro.' },
      ],
    },
  ],
  quiz: [
    { id: 'q1', type: 'multiple-choice', promptEn: '"Tengo" in English is:', promptEs: '"Tengo" en inglés es:',
      answer: 'I have', options: ['I have', 'I am', 'I need', 'I want'] },
    { id: 'q2', type: 'multiple-choice', promptEn: 'Complete: "She ___ two children."', promptEs: 'Completa: "She ___ two children."',
      answer: 'has', options: ['has', 'have', 'is', 'are'] },
    { id: 'q3', type: 'multiple-choice', promptEn: 'How do you ask "¿Tienes un lapicero?"', promptEs: '¿Cómo preguntas "¿Tienes un lapicero?"',
      answer: 'Do you have a pen?', options: ['Do you have a pen?', 'Are you a pen?', 'Have you pen?', 'Is you have a pen?'] },
    { id: 'q4', type: 'multiple-choice', promptEn: '"Tengo una cita" in English is:', promptEs: '"Tengo una cita" en inglés es:',
      answer: 'I have an appointment', options: ['I have an appointment', 'I have a headache', 'I have a job', 'I have a question'] },
    { id: 'q5', type: 'multiple-choice', promptEn: '"No tengo dinero" in English is:', promptEs: '"No tengo dinero" en inglés es:',
      answer: "I don't have any money", options: ["I don't have any money", "I don't have a job", "I have a lot of money", "I need money"] },
    { id: 'q6', type: 'multiple-choice', promptEn: 'Complete: "They ___ two cars."', promptEs: 'Completa: "They ___ two cars."',
      answer: 'have', options: ['have', 'has', 'is', 'are'] },
    { id: 'q7', type: 'multiple-choice', promptEn: 'Complete: "___ he have a car?"', promptEs: 'Completa: "___ he have a car?"',
      answer: 'Does', options: ['Does', 'Do', 'Is', 'Has'] },
    { id: 'q8', type: 'multiple-choice', promptEn: '"Tengo una pregunta" in English is:', promptEs: '"Tengo una pregunta" en inglés es:',
      answer: 'I have a question', options: ['I have a question', 'I have an appointment', 'I have a headache', 'I have a job'] },
  ],
  teachingScenarios: [
    { label: 'Part 1: Talking about your family and belongings',
      text: 'Talk about your family and what you have.',
      wordBank: [
        { en: 'two children', es: 'dos hijos' },
        { en: 'a car', es: 'un carro' },
        { en: 'a small apartment', es: 'un apartamento pequeño' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: 'Do you have children?', es: '¿Tienes hijos?' },
          { speaker: 'student', en: 'Yes, I have two children.', es: 'Sí, tengo dos hijos.' },
        ],
        [
          { speaker: 'tutor', en: 'Do you have a car?', es: '¿Tienes un carro?' },
          { speaker: 'student', en: "No, I don't have a car.", es: 'No, no tengo carro.' },
        ],
        [
          { speaker: 'tutor', en: 'Does your husband have a car?', es: '¿Tu esposo tiene un carro?' },
          { speaker: 'student', en: 'Yes, he has a car for work.', es: 'Sí, él tiene un carro para el trabajo.' },
        ],
      ] },
    { label: "Part 2: At the doctor's office",
      text: 'Tell the receptionist you have an appointment.',
      wordBank: [
        { en: "3 o'clock", es: 'las 3' },
        { en: "10 o'clock", es: 'las 10' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: 'How can I help you?', es: '¿Cómo puedo ayudarle?' },
          { speaker: 'student', en: "I have an appointment at 3 o'clock.", es: 'Tengo una cita a las 3.' },
        ],
        [
          { speaker: 'tutor', en: 'What is the problem today?', es: '¿Cuál es el problema hoy?' },
          { speaker: 'student', en: 'I have a headache.', es: 'Tengo dolor de cabeza.' },
        ],
        [
          { speaker: 'tutor', en: 'Do you have your insurance card?', es: '¿Tiene su tarjeta de seguro?' },
          { speaker: 'student', en: 'Yes, I have it here.', es: 'Sí, la tengo aquí.' },
        ],
      ] },
    { label: 'Part 3: At work or in a store',
      text: 'Ask a question at the store and talk about your job.',
      wordBank: [
        { en: 'milk', es: 'leche' },
        { en: 'bread', es: 'pan' },
        { en: 'eggs', es: 'huevos' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: 'Can I help you?', es: '¿Le puedo ayudar?' },
          { speaker: 'student', en: 'Yes, do you have milk on sale?', es: 'Sí, ¿tienen leche en oferta?' },
        ],
        [
          { speaker: 'tutor', en: "Yes, it's near the front.", es: 'Sí, está cerca de la entrada.' },
          { speaker: 'student', en: 'Thank you. I have a job nearby.', es: 'Gracias. Tengo un trabajo cerca.' },
        ],
        [
          { speaker: 'tutor', en: 'Do you have money with you today?', es: '¿Tiene dinero con usted hoy?' },
          { speaker: 'student', en: "No, I don't have any money today.", es: 'No, no tengo dinero hoy.' },
        ],
      ] },
  ],
  practiceActivities: [
    {
      titleEn: 'Family Inventory',
      titleEs: 'Inventario Familiar',
      instructionsEn: 'Describe what a family member has.',
      instructionsEs: 'Describe lo que tiene un familiar.',
      wordBank: [
        { en: 'a job', es: 'un trabajo' },
        { en: 'a phone', es: 'un teléfono' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: 'Does your sister have a job?', es: '¿Tu hermana tiene un trabajo?' },
          { speaker: 'student', en: 'Yes, she has a job.', es: 'Sí, ella tiene un trabajo.' },
        ],
        [
          { speaker: 'tutor', en: 'Does she have children?', es: '¿Ella tiene hijos?' },
          { speaker: 'student', en: 'Yes, she has three children.', es: 'Sí, ella tiene tres hijos.' },
        ],
      ],
    },
    {
      titleEn: '20 Questions: Do You Have...?',
      titleEs: '20 Preguntas: Do You Have...?',
      instructionsEn: 'Ask your tutor if they have something.',
      instructionsEs: 'Pregúntale a tu tutor si tiene algo.',
      wordBank: [
        { en: 'a phone', es: 'un teléfono' },
        { en: 'a pen', es: 'un lapicero' },
      ],
      chunks: [
        [
          { speaker: 'student', en: 'Do you have a phone?', es: '¿Tienes un teléfono?' },
          { speaker: 'tutor', en: 'Yes, I have a phone.', es: 'Sí, tengo un teléfono.' },
        ],
        [
          { speaker: 'student', en: 'Do you have a pen?', es: '¿Tienes un lapicero?' },
          { speaker: 'tutor', en: "No, I don't have a pen.", es: 'No, no tengo un lapicero.' },
        ],
      ],
    },
    {
      titleEn: 'At the Front Desk',
      titleEs: 'En la Recepción',
      instructionsEn: 'Explain you have an appointment but not a document.',
      instructionsEs: 'Explica que tienes una cita pero no tienes un documento.',
      wordBank: [
        { en: 'my ID', es: 'mi identificación' },
        { en: 'the form', es: 'el formulario' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: 'Do you have an appointment?', es: '¿Tiene una cita?' },
          { speaker: 'student', en: 'Yes, I have an appointment.', es: 'Sí, tengo una cita.' },
        ],
        [
          { speaker: 'tutor', en: 'Do you have your ID?', es: '¿Tiene su identificación?' },
          { speaker: 'student', en: "No, I don't have my ID today.", es: 'No, no tengo mi identificación hoy.' },
        ],
      ],
    },
  ],
  worksheet: [
    { id: 'w1', promptEn: 'I ____ two children.', promptEs: 'Tengo dos hijos. (I ____ two children.)', answer: 'have' },
    { id: 'w2', promptEn: 'She ____ a headache.', promptEs: 'Ella tiene dolor de cabeza. (She ____ a headache.)', answer: 'has' },
    { id: 'w3', promptEn: '____ you have a pen?', promptEs: '¿Tienes un lapicero? (____ you have a pen?)', answer: 'Do' },
    { id: 'w4', promptEn: 'I ____ an appointment today.', promptEs: 'Tengo una cita hoy. (I ____ an appointment today.)', answer: 'have' },
    { id: 'w5', promptEn: "I don't ____ any money.", promptEs: 'No tengo dinero. (I don\'t ____ any money.)', answer: 'have' },
  ],
}

export default module
