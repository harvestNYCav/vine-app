import type { Module } from '@/types'

const module: Module = {
  slug: 'verb-to-be',
  track: 'esl',
  titleEn: 'The Verb "To Be"',
  titleEs: 'El Verbo "To Be"',
  descriptionEn: 'Learn how to use am, is, and are to talk about who you are and how you feel.',
  descriptionEs: 'Aprende a usar am, is y are para hablar de quién eres y cómo te sientes.',
  icon: 'PersonStanding',
  vocab: [
    { id: 'i-am', en: 'I am', es: 'yo soy / estoy',
      exampleEn: 'I am a student.', exampleEs: 'Yo soy estudiante.' },
    { id: 'you-are', en: 'you are', es: 'tú eres / estás',
      exampleEn: 'You are very kind.', exampleEs: 'Tú eres muy amable.' },
    { id: 'he-she-is', en: 'he / she is', es: 'él / ella es / está',
      exampleEn: 'She is my neighbor.', exampleEs: 'Ella es mi vecina.' },
    { id: 'we-are', en: 'we are', es: 'nosotros somos / estamos',
      exampleEn: 'We are ready.', exampleEs: 'Estamos listos.' },
    { id: 'they-are', en: 'they are', es: 'ellos son / están',
      exampleEn: 'They are from Guatemala.', exampleEs: 'Ellos son de Guatemala.' },
    { id: 'i-am-not', en: 'I am not', es: 'yo no soy / no estoy',
      exampleEn: 'I am not sure.', exampleEs: 'No estoy seguro.' },
    { id: 'is-he-she', en: 'Is he/she...?', es: '¿Es/Está él/ella...?',
      exampleEn: 'Is she your sister?', exampleEs: '¿Es ella tu hermana?' },
    { id: 'are-you', en: 'Are you...?', es: '¿Eres/Estás tú...?',
      exampleEn: 'Are you okay?', exampleEs: '¿Estás bien?' },
    { id: 'i-am-happy', en: 'I am happy', es: 'Estoy feliz',
      exampleEn: 'I am happy today.', exampleEs: 'Estoy feliz hoy.' },
    { id: 'i-am-tired', en: 'I am tired', es: 'Estoy cansado / cansada',
      exampleEn: 'I am tired after work.', exampleEs: 'Estoy cansado después del trabajo.' },
    { id: 'i-am-from', en: 'I am from...', es: 'Soy de...',
      exampleEn: 'I am from Honduras.', exampleEs: 'Soy de Honduras.' },
    { id: 'it-is', en: 'It is...', es: 'Es... / Está...',
      exampleEn: 'It is cold today.', exampleEs: 'Está frío hoy.' },
    { id: 'there-is-are', en: 'There is / there are', es: 'Hay',
      exampleEn: 'There is a bank on this street. There are two children in my family.', exampleEs: 'Hay un banco en esta calle. Hay dos niños en mi familia.' },
    { id: 'contractions', en: "I'm / he isn't / they aren't", es: 'formas cortas de to be',
      exampleEn: "I'm tired. He isn't home. They aren't ready.", exampleEs: 'Estoy cansado. Él no está en casa. Ellos no están listos.' },
  ],
  grammar: [
    {
      titleEn: 'The verb "to be": am, is, are',
      titleEs: 'El verbo "to be": am, is, are',
      explanationEn: 'The verb "to be" changes depending on the subject. Use "am" only with "I." Use "is" with he, she, it, or a single person/thing (your sister, the doctor). Use "are" with you, we, they, or more than one person/thing.',
      explanationEs: 'El verbo "to be" cambia según el sujeto. Usa "am" solo con "I." Usa "is" con he, she, it, o una sola persona/cosa (your sister, the doctor). Usa "are" con you, we, they, o más de una persona/cosa.',
      examples: [
        { en: 'I am a student.', es: 'Yo soy estudiante.' },
        { en: 'She is my neighbor.', es: 'Ella es mi vecina.' },
        { en: 'We are ready.', es: 'Estamos listos.' },
        { en: 'They are from Guatemala.', es: 'Ellos son de Guatemala.' },
      ],
    },
    {
      titleEn: 'Negatives, questions, and short forms',
      titleEs: 'Negaciones, preguntas y formas cortas',
      explanationEn: 'To make a negative, add "not" after am/is/are: I am not sure. He is not home. To ask a question, put am/is/are before the subject: Are you okay? Is she your sister? In everyday speech, people often use short forms: I\'m, he isn\'t, they aren\'t.',
      explanationEs: 'Para hacer una negación, agrega "not" después de am/is/are: I am not sure. He is not home. Para hacer una pregunta, pon am/is/are antes del sujeto: Are you okay? Is she your sister? En el habla cotidiana, la gente suele usar formas cortas: I\'m, he isn\'t, they aren\'t.',
      examples: [
        { en: 'I am not sure.', es: 'No estoy seguro.' },
        { en: 'Is she your sister?', es: '¿Es ella tu hermana?' },
        { en: "He isn't home.", es: 'Él no está en casa.' },
        { en: "They aren't ready.", es: 'Ellos no están listos.' },
      ],
    },
  ],
  quiz: [
    { id: 'q1', type: 'multiple-choice', promptEn: 'Complete: "I ___ a student."', promptEs: 'Completa: "I ___ a student."',
      answer: 'am', options: ['am', 'is', 'are', 'be'] },
    { id: 'q2', type: 'multiple-choice', promptEn: 'Complete: "She ___ my sister."', promptEs: 'Completa: "She ___ my sister."',
      answer: 'is', options: ['is', 'am', 'are', 'be'] },
    { id: 'q3', type: 'multiple-choice', promptEn: 'Complete: "They ___ from Guatemala."', promptEs: 'Completa: "They ___ from Guatemala."',
      answer: 'are', options: ['are', 'am', 'is', 'be'] },
    { id: 'q4', type: 'multiple-choice', promptEn: '"¿Estás bien?" in English is:', promptEs: '"¿Estás bien?" en inglés es:',
      answer: 'Are you okay?', options: ['Are you okay?', 'Is you okay?', 'I am okay?', 'You are okay'] },
    { id: 'q5', type: 'multiple-choice', promptEn: '"Hay" in English is:', promptEs: '"Hay" en inglés es:',
      answer: 'There is / there are', options: ['There is / there are', 'It is', 'I am', 'They are'] },
    { id: 'q6', type: 'multiple-choice', promptEn: 'Complete: "We ___ ready."', promptEs: 'Completa: "We ___ ready."',
      answer: 'are', options: ['are', 'is', 'am', 'be'] },
    { id: 'q7', type: 'multiple-choice', promptEn: 'Complete: "It ___ cold today."', promptEs: 'Completa: "It ___ cold today."',
      answer: 'is', options: ['is', 'am', 'are', 'be'] },
    { id: 'q8', type: 'multiple-choice', promptEn: '"Hay dos escuelas cerca de mi casa" in English is:', promptEs: '"Hay dos escuelas cerca de mi casa" en inglés es:',
      answer: 'There are two schools near my house', options: ['There are two schools near my house', 'There is two schools near my house', 'They are two schools near my house', 'It is two schools near my house'] },
    { id: 'q9', type: 'multiple-choice', promptEn: 'What is the short form of "they are not"?', promptEs: '¿Cuál es la forma corta de "they are not"?',
      answer: "aren't", options: ["aren't", "isn't", "amn't", 'not are'] },
  ],
  teachingScenarios: [
    { label: 'Part 1: Introducing who you are',
      text: 'Meet someone new and introduce yourself.',
      wordBank: [
        { en: 'Maria', es: '(tu nombre)' },
        { en: 'Honduras', es: 'Honduras' },
        { en: 'a student', es: 'estudiante' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: "Hi! I'm Mrs. Johnson.", es: '¡Hola! Soy la Sra. Johnson.' },
          { speaker: 'student', en: 'Hi, I am Maria.', es: 'Hola, yo soy María.' },
        ],
        [
          { speaker: 'tutor', en: 'Are you from around here?', es: '¿Eres de por aquí?' },
          { speaker: 'student', en: 'I am from Honduras.', es: 'Soy de Honduras.' },
        ],
        [
          { speaker: 'tutor', en: 'What do you do?', es: '¿A qué te dedicas?' },
          { speaker: 'student', en: 'I am a student.', es: 'Soy estudiante.' },
        ],
      ] },
    { label: 'Part 2: Talking about how you feel',
      text: 'Talk about how you feel today.',
      wordBank: [
        { en: 'tired', es: 'cansado/a' },
        { en: 'happy', es: 'feliz' },
        { en: 'sick', es: 'enfermo/a' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: 'How are you today?', es: '¿Cómo estás hoy?' },
          { speaker: 'student', en: 'I am tired.', es: 'Estoy cansado/a.' },
        ],
        [
          { speaker: 'tutor', en: "I'm sorry. Is your family okay?", es: 'Lo siento. ¿Está bien tu familia?' },
          { speaker: 'student', en: 'Yes, they are okay.', es: 'Sí, están bien.' },
        ],
        [
          { speaker: 'tutor', en: "That's good. I am happy today!", es: 'Qué bueno. ¡Yo estoy feliz hoy!' },
          { speaker: 'student', en: 'I am happy too.', es: 'Yo también estoy feliz.' },
        ],
      ] },
    { label: 'Part 3: Talking about the weather and everyday facts',
      text: 'Talk about the weather and what is on your street.',
      wordBank: [
        { en: 'cold', es: 'frío' },
        { en: 'sunny', es: 'soleado' },
        { en: 'rainy', es: 'lluvioso' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: 'It is cold today, right?', es: 'Hoy está frío, ¿verdad?' },
          { speaker: 'student', en: 'Yes, it is very cold.', es: 'Sí, está muy frío.' },
        ],
        [
          { speaker: 'tutor', en: 'Is there a store near you?', es: '¿Hay una tienda cerca de ti?' },
          { speaker: 'student', en: 'There is a bank on my street.', es: 'Hay un banco en mi calle.' },
        ],
        [
          { speaker: 'tutor', en: 'How many schools are nearby?', es: '¿Cuántas escuelas hay cerca?' },
          { speaker: 'student', en: 'There are two schools.', es: 'Hay dos escuelas.' },
        ],
      ] },
  ],
  practiceActivities: [
    {
      titleEn: 'All About Me and My Family',
      titleEs: 'Todo Sobre Mí y Mi Familia',
      instructionsEn: 'Describe yourself and one family member.',
      instructionsEs: 'Descríbete a ti mismo y a un familiar.',
      wordBank: [
        { en: 'sister', es: 'hermana' },
        { en: 'brother', es: 'hermano' },
        { en: 'parents', es: 'padres' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: 'Tell me about yourself.', es: 'Cuéntame sobre ti.' },
          { speaker: 'student', en: 'I am a mother.', es: 'Soy madre.' },
        ],
        [
          { speaker: 'tutor', en: 'Tell me about your sister.', es: 'Cuéntame sobre tu hermana.' },
          { speaker: 'student', en: 'My sister is a teacher.', es: 'Mi hermana es maestra.' },
        ],
      ],
    },
    {
      titleEn: 'Yes/No Question Drill',
      titleEs: 'Práctica de Preguntas Sí/No',
      instructionsEn: "Answer your tutor's yes/no questions in a full sentence.",
      instructionsEs: 'Responde las preguntas de sí/no de tu tutor con una oración completa.',
      chunks: [
        [
          { speaker: 'tutor', en: 'Are you tired?', es: '¿Estás cansado/a?' },
          { speaker: 'student', en: 'No, I am not tired.', es: 'No, no estoy cansado/a.' },
        ],
        [
          { speaker: 'tutor', en: 'Is it cold today?', es: '¿Está frío hoy?' },
          { speaker: 'student', en: 'Yes, it is cold.', es: 'Sí, está frío.' },
        ],
      ],
    },
    {
      titleEn: 'Describe the Room',
      titleEs: 'Describe el Salón',
      instructionsEn: 'Look around and describe what you see.',
      instructionsEs: 'Mira alrededor y describe lo que ves.',
      wordBank: [
        { en: 'table', es: 'mesa' },
        { en: 'chairs', es: 'sillas' },
        { en: 'window', es: 'ventana' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: 'What is in this room?', es: '¿Qué hay en este salón?' },
          { speaker: 'student', en: 'There is a table.', es: 'Hay una mesa.' },
        ],
        [
          { speaker: 'tutor', en: 'What else?', es: '¿Qué más?' },
          { speaker: 'student', en: 'There are two chairs.', es: 'Hay dos sillas.' },
        ],
      ],
    },
  ],
  worksheet: [
    { id: 'w1', promptEn: 'I ____ a student.', promptEs: 'Yo soy estudiante. (I ____ a student.)', answer: 'am' },
    { id: 'w2', promptEn: 'She ____ my sister.', promptEs: 'Ella es mi hermana. (She ____ my sister.)', answer: 'is' },
    { id: 'w3', promptEn: 'They ____ from Guatemala.', promptEs: 'Ellos son de Guatemala. (They ____ from Guatemala.)', answer: 'are' },
    { id: 'w4', promptEn: '____ you okay?', promptEs: '¿Estás bien? (____ you okay?)', answer: 'Are' },
    { id: 'w5', promptEn: 'It ____ cold today.', promptEs: 'Está frío hoy. (It ____ cold today.)', answer: 'is' },
  ],
}

export default module
