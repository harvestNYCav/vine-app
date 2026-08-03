import type { Module } from '@/types'

const module: Module = {
  slug: 'time-dates-seasons',
  track: 'esl',
  titleEn: 'Time, Dates and Seasons',
  titleEs: 'La Hora, las Fechas y las Estaciones',
  descriptionEn: 'Learn how to tell time, talk about the days and months, and describe the seasons.',
  descriptionEs: 'Aprende a decir la hora, hablar de los días y meses, y describir las estaciones.',
  icon: 'Calendar',
  vocab: [
    { id: 'what-time-is-it', en: 'What time is it?', es: '¿Qué hora es?',
      exampleEn: 'Excuse me, what time is it?', exampleEs: 'Disculpe, ¿qué hora es?' },
    { id: 'oclock', en: "o'clock", es: 'en punto',
      exampleEn: "It's three o'clock.", exampleEs: 'Son las tres en punto.' },
    { id: 'half-past', en: 'half past', es: 'y media',
      exampleEn: "It's half past three.", exampleEs: 'Son las tres y media.' },
    { id: 'morning-afternoon-evening', en: 'in the morning / afternoon / evening', es: 'por la mañana / por la tarde / por la noche',
      exampleEn: 'I work in the morning.', exampleEs: 'Trabajo por la mañana.' },
    { id: 'what-day-is-it', en: 'What day is it?', es: '¿Qué día es?',
      exampleEn: "What day is it today? It's Monday.", exampleEs: '¿Qué día es hoy? Es lunes.' },
    { id: 'monday-through-friday', en: 'Monday through Friday', es: 'de lunes a viernes',
      exampleEn: 'I work Monday through Friday.', exampleEs: 'Trabajo de lunes a viernes.' },
    { id: 'weekend', en: 'weekend', es: 'el fin de semana',
      exampleEn: 'I rest on the weekend.', exampleEs: 'Descanso en el fin de semana.' },
    { id: 'month', en: 'month', es: 'el mes',
      exampleEn: 'I pay rent every month.', exampleEs: 'Pago la renta cada mes.' },
    { id: 'what-is-the-date-today', en: 'What is the date today?', es: '¿Cuál es la fecha de hoy?',
      exampleEn: 'What is the date today? It is May 3rd.', exampleEs: '¿Cuál es la fecha de hoy? Es el 3 de mayo.' },
    { id: 'january', en: 'January', es: 'enero',
      exampleEn: 'My son was born in January.', exampleEs: 'Mi hijo nació en enero.' },
    { id: 'birthday', en: 'birthday', es: 'el cumpleaños',
      exampleEn: 'My birthday is in June.', exampleEs: 'Mi cumpleaños es en junio.' },
    { id: 'spring-summer', en: 'spring / summer', es: 'la primavera / el verano',
      exampleEn: 'It gets warm in the spring and hot in the summer.', exampleEs: 'Hace calor templado en primavera y mucho calor en verano.' },
    { id: 'fall-winter', en: 'fall / winter', es: 'el otoño / el invierno',
      exampleEn: 'It gets cold in the fall and very cold in the winter.', exampleEs: 'Hace frío en otoño y mucho frío en invierno.' },
    { id: 'its-cold-hot', en: "It's cold / hot outside", es: 'Hace frío / calor afuera',
      exampleEn: "It's very cold outside today.", exampleEs: 'Hace mucho frío afuera hoy.' },
  ],
  grammar: [
    {
      titleEn: 'Telling time: "It\'s ... o\'clock" and "half past ..."',
      titleEs: 'Decir la hora: "It\'s ... o\'clock" y "half past ..."',
      explanationEn: 'For an exact hour, say "It\'s" + the number + "o\'clock": It\'s three o\'clock. For thirty minutes past the hour, say "half past" + the number: It\'s half past three (3:30).',
      explanationEs: 'Para una hora exacta, di "It\'s" + el número + "o\'clock": It\'s three o\'clock. Para treinta minutos después de la hora, di "half past" + el número: It\'s half past three (3:30).',
      examples: [
        { en: "It's three o'clock.", es: 'Son las tres en punto.' },
        { en: "It's half past three.", es: 'Son las tres y media.' },
      ],
    },
    {
      titleEn: 'Use "in" before parts of the day, months, and seasons',
      titleEs: 'Usa "in" antes de partes del día, meses y estaciones',
      explanationEn: 'Use "in" before "the morning/afternoon/evening," before a month, and before a season: I work in the morning. My birthday is in January. It gets cold in the winter.',
      explanationEs: 'Usa "in" antes de "the morning/afternoon/evening," antes de un mes, y antes de una estación: I work in the morning. My birthday is in January. It gets cold in the winter.',
      examples: [
        { en: 'I work in the morning.', es: 'Trabajo por la mañana.' },
        { en: 'My birthday is in June.', es: 'Mi cumpleaños es en junio.' },
        { en: 'It gets cold in the fall and very cold in the winter.', es: 'Hace frío en otoño y mucho frío en invierno.' },
      ],
    },
  ],
  quiz: [
    { id: 'q1', type: 'multiple-choice', promptEn: '"¿Qué hora es?" in English is:', promptEs: '"¿Qué hora es?" en inglés es:',
      answer: 'What time is it?', options: ['What time is it?', 'What day is it?', 'What is the date today?', 'It\'s cold outside'] },
    { id: 'q2', type: 'multiple-choice', promptEn: '"El fin de semana" in English is:', promptEs: '"El fin de semana" en inglés es:',
      answer: 'weekend', options: ['weekend', 'month', 'morning', 'birthday'] },
    { id: 'q3', type: 'multiple-choice', promptEn: '"El cumpleaños" in English is:', promptEs: '"El cumpleaños" en inglés es:',
      answer: 'birthday', options: ['birthday', 'weekend', 'month', 'date'] },
    { id: 'q4', type: 'multiple-choice', promptEn: 'Which season is the coldest?', promptEs: '¿Cuál estación es la más fría?',
      answer: 'winter', options: ['winter', 'summer', 'spring', 'fall'] },
    { id: 'q5', type: 'multiple-choice', promptEn: '"¿Cuál es la fecha de hoy?" in English is:', promptEs: '"¿Cuál es la fecha de hoy?" en inglés es:',
      answer: 'What is the date today?', options: ['What is the date today?', 'What time is it?', 'What day is it?', 'What month is it?'] },
    { id: 'q6', type: 'multiple-choice', promptEn: 'Complete: "I wake up at half ___ six."', promptEs: 'Completa: "I wake up at half ___ six."',
      answer: 'past', options: ['past', "o'clock", 'in', 'on'] },
    { id: 'q7', type: 'multiple-choice', promptEn: 'Which season comes right after summer?', promptEs: '¿Qué estación viene justo después del verano?',
      answer: 'fall', options: ['fall', 'winter', 'spring', 'summer'] },
    { id: 'q8', type: 'multiple-choice', promptEn: '"Trabajo de lunes a viernes" in English is:', promptEs: '"Trabajo de lunes a viernes" en inglés es:',
      answer: 'I work Monday through Friday', options: ['I work Monday through Friday', 'I work on the weekend', 'I work every month', 'I work in the morning'] },
  ],
  teachingScenarios: [
    { label: 'Part 1: Telling time',
      text: 'Practice telling the time using o\'clock and half past.',
      wordBank: [
        { en: "three o'clock", es: 'las tres en punto' },
        { en: 'half past six', es: 'las seis y media' },
        { en: 'half past seven', es: 'las siete y media' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: 'What time is it?', es: '¿Qué hora es?' },
          { speaker: 'student', en: "It's three o'clock.", es: 'Son las tres en punto.' },
        ],
        [
          { speaker: 'tutor', en: 'What time do you wake up?', es: '¿A qué hora te despiertas?' },
          { speaker: 'student', en: 'Half past six.', es: 'Las seis y media.' },
        ],
        [
          { speaker: 'tutor', en: 'What time do you eat dinner?', es: '¿A qué hora cenas?' },
          { speaker: 'student', en: 'Half past seven.', es: 'Las siete y media.' },
        ],
      ] },
    { label: 'Part 2: Talking about the week',
      text: 'Practice talking about which days you work and what you do on the weekend.',
      wordBank: [
        { en: 'Monday', es: 'lunes' },
        { en: 'Wednesday', es: 'miércoles' },
        { en: 'Sunday', es: 'domingo' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: 'What day is it today?', es: '¿Qué día es hoy?' },
          { speaker: 'student', en: 'Today is Monday.', es: 'Hoy es lunes.' },
        ],
        [
          { speaker: 'tutor', en: 'Which days do you work?', es: '¿Qué días trabajas?' },
          { speaker: 'student', en: 'Monday through Friday.', es: 'De lunes a viernes.' },
        ],
        [
          { speaker: 'tutor', en: 'What do you do on the weekend?', es: '¿Qué haces en el fin de semana?' },
          { speaker: 'student', en: 'I rest with my family.', es: 'Descanso con mi familia.' },
        ],
      ] },
    { label: 'Part 3: Seasons and important dates',
      text: 'Practice sharing your birthday month and talking about the seasons.',
      wordBank: [
        { en: 'January', es: 'enero' },
        { en: 'June', es: 'junio' },
        { en: 'October', es: 'octubre' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: 'When is your birthday?', es: '¿Cuándo es tu cumpleaños?' },
          { speaker: 'student', en: 'My birthday is in January.', es: 'Mi cumpleaños es en enero.' },
        ],
        [
          { speaker: 'tutor', en: "What's the weather like in winter?", es: '¿Cómo es el clima en invierno?' },
          { speaker: 'student', en: "It's very cold.", es: 'Hace mucho frío.' },
        ],
        [
          { speaker: 'tutor', en: 'And in summer?', es: '¿Y en verano?' },
          { speaker: 'student', en: "It's hot.", es: 'Hace calor.' },
        ],
      ] },
  ],
  practiceActivities: [
    {
      titleEn: 'Parts of the Day',
      titleEs: 'Partes del Día',
      instructionsEn: 'Practice saying when you do things — in the morning, afternoon, or evening.',
      instructionsEs: 'Practica decir cuándo haces cosas — por la mañana, por la tarde o por la noche.',
      wordBank: [
        { en: 'in the morning', es: 'por la mañana' },
        { en: 'in the afternoon', es: 'por la tarde' },
        { en: 'in the evening', es: 'por la noche' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: 'When do you work?', es: '¿Cuándo trabajas?' },
          { speaker: 'student', en: 'In the morning.', es: 'Por la mañana.' },
        ],
        [
          { speaker: 'tutor', en: 'When do you eat dinner?', es: '¿Cuándo cenas?' },
          { speaker: 'student', en: 'In the evening.', es: 'Por la noche.' },
        ],
      ],
    },
    {
      titleEn: "Today's Date",
      titleEs: 'La Fecha de Hoy',
      instructionsEn: "Practice asking for and saying today's date.",
      instructionsEs: 'Practica preguntar y decir la fecha de hoy.',
      chunks: [
        [
          { speaker: 'student', en: 'What is the date today?', es: '¿Cuál es la fecha de hoy?' },
          { speaker: 'tutor', en: "It's May 3rd.", es: 'Es el 3 de mayo.' },
        ],
        [
          { speaker: 'student', en: 'Thank you.', es: 'Gracias.' },
          { speaker: 'tutor', en: "You're welcome.", es: 'De nada.' },
        ],
      ],
    },
    {
      titleEn: 'Describe the Weather',
      titleEs: 'Describe el Clima',
      instructionsEn: 'Practice describing the weather in different seasons.',
      instructionsEs: 'Practica describir el clima en diferentes estaciones.',
      wordBank: [
        { en: 'warm', es: 'templado' },
        { en: 'cold', es: 'frío' },
        { en: 'hot', es: 'caluroso' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: "What's the weather like in spring?", es: '¿Cómo es el clima en primavera?' },
          { speaker: 'student', en: "It's warm.", es: 'Hace calor templado.' },
        ],
        [
          { speaker: 'tutor', en: 'And in fall?', es: '¿Y en otoño?' },
          { speaker: 'student', en: "It's cold.", es: 'Hace frío.' },
        ],
      ],
    },
  ],
  worksheet: [
    { id: 'w1', promptEn: 'What ____ is it?', promptEs: '¿Qué hora es? (What ____ is it?)', answer: 'time' },
    { id: 'w2', promptEn: 'It is three ____.', promptEs: 'Son las tres en punto. (It is three ____.)', answer: "o'clock" },
    { id: 'w3', promptEn: 'The ____ is Saturday and Sunday.', promptEs: 'El fin de semana es sábado y domingo. (The ____ is Saturday and Sunday.)', answer: 'weekend' },
    { id: 'w4', promptEn: 'It is very cold in ____.', promptEs: 'Hace mucho frío en invierno. (It is very cold in ____.)', answer: 'winter' },
    { id: 'w5', promptEn: 'What is the ____ today?', promptEs: '¿Cuál es la fecha de hoy? (What is the ____ today?)', answer: 'date' },
  ],
}

export default module
