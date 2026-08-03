import type { Module } from '@/types'

const module: Module = {
  slug: 'health-emergencies',
  track: 'esl',
  titleEn: 'Health Needs & Emergencies',
  titleEs: 'Necesidades de Salud y Emergencias',
  descriptionEn: 'Learn how to describe symptoms, ask for medical help, and handle an emergency.',
  descriptionEs: 'Aprende a describir síntomas, pedir ayuda médica y manejar una emergencia.',
  icon: 'HeartPulse',
  vocab: [
    { id: 'doctor', en: 'doctor', es: 'el doctor / la doctora',
      exampleEn: 'I need to see a doctor.', exampleEs: 'Necesito ver a un doctor.' },
    { id: 'hospital', en: 'hospital', es: 'el hospital',
      exampleEn: 'The hospital is near my house.', exampleEs: 'El hospital está cerca de mi casa.' },
    { id: 'i-feel-sick', en: 'I feel sick', es: 'Me siento mal',
      exampleEn: 'I feel sick today.', exampleEs: 'Me siento mal hoy.' },
    { id: 'pain-it-hurts', en: 'pain / it hurts', es: 'el dolor / me duele',
      exampleEn: 'My stomach hurts.', exampleEs: 'Me duele el estómago.' },
    { id: 'i-have-a-fever', en: 'I have a fever', es: 'Tengo fiebre',
      exampleEn: 'I have a fever and a cough.', exampleEs: 'Tengo fiebre y tos.' },
    { id: 'call-911', en: 'Call 911', es: 'Llame al 911',
      exampleEn: 'Call 911, it is an emergency!', exampleEs: '¡Llame al 911, es una emergencia!' },
    { id: 'emergency-room', en: 'emergency room', es: 'la sala de emergencias',
      exampleEn: 'We need to go to the emergency room.', exampleEs: 'Necesitamos ir a la sala de emergencias.' },
    { id: 'ambulance', en: 'ambulance', es: 'la ambulancia',
      exampleEn: 'The ambulance is coming.', exampleEs: 'La ambulancia está llegando.' },
    { id: 'medicine-pills', en: 'medicine / pills', es: 'la medicina / las pastillas',
      exampleEn: 'Take this medicine twice a day.', exampleEs: 'Tome esta medicina dos veces al día.' },
    { id: 'pharmacy', en: 'pharmacy', es: 'la farmacia',
      exampleEn: 'I need to pick up medicine at the pharmacy.', exampleEs: 'Necesito recoger medicina en la farmacia.' },
    { id: 'insurance', en: 'insurance', es: 'el seguro médico',
      exampleEn: 'Do you have insurance?', exampleEs: '¿Tiene seguro médico?' },
    { id: 'i-need-to-see-a-doctor', en: 'I need to see a doctor', es: 'Necesito ver a un doctor',
      exampleEn: 'I need to see a doctor today.', exampleEs: 'Necesito ver a un doctor hoy.' },
    { id: 'are-you-okay', en: 'Are you okay?', es: '¿Estás bien?',
      exampleEn: 'Are you okay? You look sick.', exampleEs: '¿Estás bien? Te ves enfermo.' },
    { id: 'help', en: 'Help!', es: '¡Ayuda!',
      exampleEn: 'Help! Someone call 911!', exampleEs: '¡Ayuda! ¡Alguien llame al 911!' },
  ],
  grammar: [
    {
      titleEn: 'Describing symptoms: have / feel / hurts',
      titleEs: 'Describir síntomas: have / feel / hurts',
      explanationEn: 'Use "have" with a noun (a fever, a cough): I have a fever. Use "feel" with an adjective (sick, tired, dizzy): I feel sick. Use "possessive + body part + hurts" to say where it hurts: My stomach hurts. My head hurts.',
      explanationEs: 'Usa "have" con un sustantivo (a fever, a cough): I have a fever. Usa "feel" con un adjetivo (sick, tired, dizzy): I feel sick. Usa "posesivo + parte del cuerpo + hurts" para decir dónde te duele: My stomach hurts. My head hurts.',
      examples: [
        { en: 'I have a fever.', es: 'Tengo fiebre.' },
        { en: 'I feel sick.', es: 'Me siento mal.' },
        { en: 'My stomach hurts.', es: 'Me duele el estómago.' },
        { en: 'Do you have insurance?', es: '¿Tiene seguro médico?' },
      ],
    },
    {
      titleEn: 'Giving urgent commands: the imperative',
      titleEs: 'Dar órdenes urgentes: el imperativo',
      explanationEn: 'In an emergency, you often drop the subject and start with the base form of the verb — this is called the imperative. It sounds urgent and direct, which is exactly what you need when every second counts: Call 911! Help! Take this medicine twice a day.',
      explanationEs: 'En una emergencia, muchas veces se omite el sujeto y se empieza con la forma base del verbo — esto se llama imperativo. Suena urgente y directo, que es exactamente lo que necesitas cuando cada segundo cuenta: Call 911! Help! Take this medicine twice a day.',
      examples: [
        { en: 'Call 911!', es: '¡Llame al 911!' },
        { en: 'Help!', es: '¡Ayuda!' },
        { en: 'Take this medicine twice a day.', es: 'Tome esta medicina dos veces al día.' },
      ],
    },
  ],
  quiz: [
    { id: 'q1', type: 'multiple-choice', promptEn: '"El hospital" in English is:', promptEs: '"El hospital" en inglés es:',
      answer: 'hospital', options: ['hospital', 'pharmacy', 'doctor', 'insurance'] },
    { id: 'q2', type: 'multiple-choice', promptEn: 'How do you say "Me duele"?', promptEs: '¿Cómo se dice "Me duele"?',
      answer: 'It hurts', options: ['It hurts', 'I feel sick', 'I have a fever', 'Help!'] },
    { id: 'q3', type: 'multiple-choice', promptEn: 'What number do you call for an emergency in the US?', promptEs: '¿A qué número llamas para una emergencia en Estados Unidos?',
      answer: '911', options: ['911', '311', '411', '511'] },
    { id: 'q4', type: 'multiple-choice', promptEn: '"La farmacia" in English is:', promptEs: '"La farmacia" en inglés es:',
      answer: 'pharmacy', options: ['pharmacy', 'hospital', 'emergency room', 'insurance'] },
    { id: 'q5', type: 'multiple-choice', promptEn: 'How do you say "Necesito ver a un doctor"?', promptEs: '¿Cómo se dice "Necesito ver a un doctor"?',
      answer: 'I need to see a doctor', options: ['I need to see a doctor', 'I feel sick', 'Call 911', 'Are you okay?'] },
    { id: 'q6', type: 'multiple-choice', promptEn: 'Complete: "I ___ a fever."', promptEs: 'Completa: "I ___ a fever."',
      answer: 'have', options: ['have', 'am', 'is', 'feel'] },
    { id: 'q7', type: 'multiple-choice', promptEn: 'Which sentence is an urgent command?', promptEs: '¿Cuál oración es una orden urgente?',
      answer: 'Call 911!', options: ['Call 911!', 'I feel sick.', 'Are you okay?', 'I have insurance.'] },
    { id: 'q8', type: 'multiple-choice', promptEn: '"Me duele la cabeza" in English is:', promptEs: '"Me duele la cabeza" en inglés es:',
      answer: 'My head hurts', options: ['My head hurts', 'I have a headache pill', 'I feel head', 'Call the head'] },
  ],
  teachingScenarios: [
    { label: 'Part 1: Describing symptoms to a doctor',
      text: 'You are at a clinic and need to describe how you feel.',
      wordBank: [
        { en: 'stomach', es: 'estómago' },
        { en: 'head', es: 'cabeza' },
        { en: 'back', es: 'espalda' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: 'How do you feel?', es: '¿Cómo se siente?' },
          { speaker: 'student', en: 'I feel sick.', es: 'Me siento mal.' },
        ],
        [
          { speaker: 'tutor', en: 'Do you have a fever?', es: '¿Tiene fiebre?' },
          { speaker: 'student', en: 'Yes, I have a fever.', es: 'Sí, tengo fiebre.' },
        ],
        [
          { speaker: 'tutor', en: 'Does anything hurt?', es: '¿Le duele algo?' },
          { speaker: 'student', en: 'My stomach hurts.', es: 'Me duele el estómago.' },
        ],
      ] },
    { label: 'Part 2: A medical emergency',
      text: 'Someone near you is badly hurt. Practice calling for help.',
      chunks: [
        [
          { speaker: 'student', en: 'Are you okay?', es: '¿Estás bien?' },
          { speaker: 'tutor', en: "No, I'm hurt badly!", es: '¡No, estoy muy lastimado!' },
        ],
        [
          { speaker: 'student', en: 'Help! Call 911!', es: '¡Ayuda! ¡Llame al 911!' },
          { speaker: 'tutor', en: 'Good, keep calling for help.', es: 'Bien, siga pidiendo ayuda.' },
        ],
        [
          { speaker: 'student', en: 'We need an ambulance.', es: 'Necesitamos una ambulancia.' },
          { speaker: 'tutor', en: "It's coming.", es: 'Está llegando.' },
        ],
      ] },
    { label: 'Part 3: At the pharmacy',
      text: 'Practice picking up medicine at the pharmacy and answering questions about insurance.',
      chunks: [
        [
          { speaker: 'student', en: 'I need to pick up medicine.', es: 'Necesito recoger medicina.' },
          { speaker: 'tutor', en: 'What is your name?', es: '¿Cuál es su nombre?' },
        ],
        [
          { speaker: 'tutor', en: 'Do you have insurance?', es: '¿Tiene seguro médico?' },
          { speaker: 'student', en: 'Yes, I have insurance.', es: 'Sí, tengo seguro médico.' },
        ],
        [
          { speaker: 'tutor', en: 'Take this medicine twice a day.', es: 'Tome esta medicina dos veces al día.' },
          { speaker: 'student', en: 'Thank you.', es: 'Gracias.' },
        ],
      ] },
  ],
  practiceActivities: [
    {
      titleEn: 'How Do You Feel?',
      titleEs: '¿Cómo Te Sientes?',
      instructionsEn: 'Practice describing how you feel using "I feel..."',
      instructionsEs: 'Practica describir cómo te sientes usando "I feel..."',
      wordBank: [
        { en: 'dizzy', es: 'mareado' },
        { en: 'tired', es: 'cansado' },
        { en: 'sick', es: 'mal' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: 'How do you feel today?', es: '¿Cómo te sientes hoy?' },
          { speaker: 'student', en: 'I feel dizzy.', es: 'Me siento mareado.' },
        ],
        [
          { speaker: 'tutor', en: 'I am sorry to hear that.', es: 'Lo siento.' },
          { speaker: 'student', en: 'Thank you.', es: 'Gracias.' },
        ],
      ],
    },
    {
      titleEn: 'Where Do We Go?',
      titleEs: '¿Adónde Vamos?',
      instructionsEn: 'Practice saying where to go for help in an emergency.',
      instructionsEs: 'Practica decir adónde ir para pedir ayuda en una emergencia.',
      wordBank: [
        { en: 'hospital', es: 'hospital' },
        { en: 'emergency room', es: 'sala de emergencias' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: 'Where should we go?', es: '¿Adónde deberíamos ir?' },
          { speaker: 'student', en: 'We need to go to the hospital.', es: 'Necesitamos ir al hospital.' },
        ],
        [
          { speaker: 'tutor', en: "I'll call an ambulance.", es: 'Llamaré a una ambulancia.' },
          { speaker: 'student', en: 'Thank you.', es: 'Gracias.' },
        ],
      ],
    },
    {
      titleEn: "What's Wrong?",
      titleEs: '¿Qué Tiene?',
      instructionsEn: 'Practice telling the doctor a different symptom.',
      instructionsEs: 'Practica decirle al doctor un síntoma diferente.',
      wordBank: [
        { en: 'a cough', es: 'tos' },
        { en: 'a headache', es: 'dolor de cabeza' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: "What's wrong?", es: '¿Qué tiene?' },
          { speaker: 'student', en: 'I have a cough.', es: 'Tengo tos.' },
        ],
        [
          { speaker: 'tutor', en: 'Take care of yourself.', es: 'Cuídese.' },
          { speaker: 'student', en: 'Thank you.', es: 'Gracias.' },
        ],
      ],
    },
  ],
  worksheet: [
    { id: 'w1', promptEn: 'I feel ____.', promptEs: 'Me siento mal. (I feel ____.)', answer: 'sick' },
    { id: 'w2', promptEn: 'I have a ____.', promptEs: 'Tengo fiebre. (I have a ____.)', answer: 'fever' },
    { id: 'w3', promptEn: 'My stomach ____.', promptEs: 'Me duele el estómago. (My stomach ____.)', answer: 'hurts' },
    { id: 'w4', promptEn: 'Call ____!', promptEs: '¡Llame al 911! (Call ____!)', answer: '911' },
    { id: 'w5', promptEn: 'I need to see a ____.', promptEs: 'Necesito ver a un doctor. (I need to see a ____.)', answer: 'doctor' },
  ],
}

export default module
