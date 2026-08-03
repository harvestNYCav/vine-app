import type { Module } from '@/types'

const module: Module = {
  slug: 'shopping-dining-out',
  track: 'esl',
  titleEn: 'Shopping & Dining Out',
  titleEs: 'Compras y Comer Afuera',
  descriptionEn: 'Learn how to order food at a restaurant and shop with confidence.',
  descriptionEs: 'Aprende a ordenar comida en un restaurante y comprar con confianza.',
  icon: 'Utensils',
  vocab: [
    { id: 'menu', en: 'menu', es: 'el menú',
      exampleEn: 'Can I see the menu?', exampleEs: '¿Puedo ver el menú?' },
    { id: 'can-i-see-the-menu', en: 'Can I see the menu?', es: '¿Puedo ver el menú?',
      exampleEn: 'Excuse me, can I see the menu?', exampleEs: 'Disculpe, ¿puedo ver el menú?' },
    { id: 'i-would-like-to-order', en: 'I would like to order...', es: 'Quisiera ordenar...',
      exampleEn: 'I would like to order the chicken.', exampleEs: 'Quisiera ordenar el pollo.' },
    { id: 'waiter-waitress', en: 'waiter / waitress', es: 'el mesero / la mesera',
      exampleEn: 'The waitress brought our food.', exampleEs: 'La mesera trajo nuestra comida.' },
    { id: 'table-for-two', en: 'table for two', es: 'mesa para dos',
      exampleEn: 'We need a table for two, please.', exampleEs: 'Necesitamos una mesa para dos, por favor.' },
    { id: 'do-you-have-a-table', en: 'Do you have a table available?', es: '¿Tiene una mesa disponible?',
      exampleEn: 'Do you have a table available for four?', exampleEs: '¿Tiene una mesa disponible para cuatro?' },
    { id: 'check-bill', en: 'check / bill', es: 'la cuenta',
      exampleEn: 'Can I have the check, please?', exampleEs: '¿Me trae la cuenta, por favor?' },
    { id: 'can-i-have-the-check', en: 'Can I have the check, please?', es: '¿Me trae la cuenta, por favor?',
      exampleEn: "We're ready. Can I have the check, please?", exampleEs: 'Ya terminamos. ¿Me trae la cuenta, por favor?' },
    { id: 'tip', en: 'tip', es: 'la propina',
      exampleEn: 'We left a good tip for the waitress.', exampleEs: 'Dejamos una buena propina para la mesera.' },
    { id: 'to-go', en: 'to go / take-out', es: 'para llevar',
      exampleEn: 'I want my food to go.', exampleEs: 'Quiero mi comida para llevar.' },
    { id: 'is-this-spicy', en: 'Is this spicy?', es: '¿Esto es picante?',
      exampleEn: 'Excuse me, is this dish spicy?', exampleEs: 'Disculpe, ¿este plato es picante?' },
    { id: 'im-allergic-to', en: "I'm allergic to...", es: 'Soy alérgico/a a...',
      exampleEn: "I'm allergic to peanuts.", exampleEs: 'Soy alérgico a los cacahuates.' },
    { id: 'store-hours', en: 'store hours', es: 'el horario de la tienda',
      exampleEn: 'What are the store hours today?', exampleEs: '¿Cuál es el horario de la tienda hoy?' },
    { id: 'what-time-do-you-close', en: 'What time do you close?', es: '¿A qué hora cierran?',
      exampleEn: 'Excuse me, what time do you close?', exampleEs: 'Disculpe, ¿a qué hora cierran?' },
  ],
  grammar: [
    {
      titleEn: 'Polite requests: "Can I...?" and "I would like to..."',
      titleEs: 'Peticiones corteses: "Can I...?" e "I would like to..."',
      explanationEn: '"Can I...?" politely asks for something (a menu, the check). "I would like to..." is a polite way to state what you want, often used when ordering: I would like to order the chicken.',
      explanationEs: '"Can I...?" pide algo cortésmente (un menú, la cuenta). "I would like to..." es una forma cortés de decir lo que quieres, usada a menudo al ordenar: I would like to order the chicken.',
      examples: [
        { en: 'Can I see the menu?', es: '¿Puedo ver el menú?' },
        { en: 'I would like to order the chicken.', es: 'Quisiera ordenar el pollo.' },
        { en: 'Can I have the check, please?', es: '¿Me trae la cuenta, por favor?' },
      ],
    },
    {
      titleEn: 'Asking about a business: "Do you have...?" and "What time do you...?"',
      titleEs: 'Preguntar sobre un negocio: "Do you have...?" y "What time do you...?"',
      explanationEn: 'Use "Do you have...?" to ask if a place has something available (a table, a product). Use "What time do you...?" to ask about a store or restaurant\'s schedule.',
      explanationEs: 'Usa "Do you have...?" para preguntar si un lugar tiene algo disponible (una mesa, un producto). Usa "What time do you...?" para preguntar sobre el horario de una tienda o restaurante.',
      examples: [
        { en: 'Do you have a table available for four?', es: '¿Tiene una mesa disponible para cuatro?' },
        { en: 'What time do you close?', es: '¿A qué hora cierran?' },
      ],
    },
  ],
  quiz: [
    { id: 'q1', type: 'multiple-choice', promptEn: '"El menú" in English is:', promptEs: '"El menú" en inglés es:',
      answer: 'menu', options: ['menu', 'check', 'tip', 'table'] },
    { id: 'q2', type: 'multiple-choice', promptEn: 'How do you ask for the check at the end of a meal?', promptEs: '¿Cómo pides la cuenta al final de la comida?',
      answer: 'Can I have the check, please?', options: ['Can I have the check, please?', 'Can I see the menu?', 'I would like to order', 'Is this spicy?'] },
    { id: 'q3', type: 'multiple-choice', promptEn: '"Para llevar" in English is:', promptEs: '"Para llevar" en inglés es:',
      answer: 'to go', options: ['to go', 'table for two', 'the check', 'the tip'] },
    { id: 'q4', type: 'multiple-choice', promptEn: '"La propina" in English is:', promptEs: '"La propina" en inglés es:',
      answer: 'tip', options: ['tip', 'check', 'menu', 'waiter'] },
    { id: 'q5', type: 'multiple-choice', promptEn: 'How do you tell someone about a food allergy?', promptEs: '¿Cómo le dices a alguien sobre una alergia a la comida?',
      answer: "I'm allergic to...", options: ["I'm allergic to...", 'Is this spicy?', 'I would like to order', 'What time do you close?'] },
    { id: 'q6', type: 'multiple-choice', promptEn: 'Complete: "___ you have a table available?"', promptEs: 'Completa: "___ you have a table available?"',
      answer: 'Do', options: ['Do', 'Can', 'Is', 'Are'] },
    { id: 'q7', type: 'multiple-choice', promptEn: 'How do you politely say what you want to order?', promptEs: '¿Cómo dices cortésmente lo que quieres ordenar?',
      answer: 'I would like to order...', options: ['I would like to order...', 'Can I see the menu?', 'What time do you close?', 'Is this spicy?'] },
    { id: 'q8', type: 'multiple-choice', promptEn: '"Mesa para dos" in English is:', promptEs: '"Mesa para dos" en inglés es:',
      answer: 'table for two', options: ['table for two', 'the check', 'the tip', 'to go'] },
  ],
  teachingScenarios: [
    { label: 'Part 1: Getting a table at a restaurant',
      text: 'You arrive at a restaurant and ask for a table.',
      wordBank: [
        { en: 'two', es: 'dos' },
        { en: 'four', es: 'cuatro' },
        { en: 'six', es: 'seis' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: 'Welcome! How many people?', es: '¡Bienvenidos! ¿Cuántas personas?' },
          { speaker: 'student', en: 'A table for two, please.', es: 'Una mesa para dos, por favor.' },
        ],
        [
          { speaker: 'tutor', en: 'Right this way.', es: 'Por aquí, por favor.' },
          { speaker: 'student', en: 'Thank you.', es: 'Gracias.' },
        ],
        [
          { speaker: 'tutor', en: 'Here is your table.', es: 'Aquí está su mesa.' },
          { speaker: 'student', en: 'Great, thank you.', es: 'Perfecto, gracias.' },
        ],
      ] },
    { label: 'Part 2: Ordering food and asking about ingredients',
      text: 'The waiter brings the menu. Practice ordering food and mentioning a food allergy.',
      wordBank: [
        { en: 'chicken', es: 'pollo' },
        { en: 'fish', es: 'pescado' },
        { en: 'rice', es: 'arroz' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: 'Can I get you something to drink first?', es: '¿Le traigo algo de tomar primero?' },
          { speaker: 'student', en: 'Water, please.', es: 'Agua, por favor.' },
        ],
        [
          { speaker: 'tutor', en: 'What would you like to order?', es: '¿Qué quisiera ordenar?' },
          { speaker: 'student', en: 'The chicken, please.', es: 'El pollo, por favor.' },
        ],
        [
          { speaker: 'tutor', en: 'Do you have any allergies?', es: '¿Tiene alguna alergia?' },
          { speaker: 'student', en: "Yes, I'm allergic to peanuts.", es: 'Sí, soy alérgico a los cacahuates.' },
        ],
        [
          { speaker: 'student', en: 'Is this spicy?', es: '¿Esto es picante?' },
          { speaker: 'tutor', en: "No, it's not spicy.", es: 'No, no es picante.' },
        ],
      ] },
    { label: 'Part 3: Paying',
      text: 'You are ready to leave. Practice asking for the check and leaving a tip.',
      chunks: [
        [
          { speaker: 'student', en: 'Can I have the check, please?', es: '¿Me trae la cuenta, por favor?' },
          { speaker: 'tutor', en: 'Of course, here you go.', es: 'Claro, aquí tiene.' },
        ],
        [
          { speaker: 'student', en: 'Should I leave a tip?', es: '¿Debería dejar una propina?' },
          { speaker: 'tutor', en: 'Yes, that is appreciated.', es: 'Sí, se aprecia.' },
        ],
        [
          { speaker: 'student', en: 'Thank you very much.', es: 'Muchas gracias.' },
          { speaker: 'tutor', en: 'You are welcome!', es: '¡De nada!' },
        ],
      ] },
  ],
  practiceActivities: [
    {
      titleEn: 'At the Store',
      titleEs: 'En la Tienda',
      instructionsEn: 'Practice asking a store what time it closes.',
      instructionsEs: 'Practica preguntarle a una tienda a qué hora cierra.',
      chunks: [
        [
          { speaker: 'student', en: 'What time do you close?', es: '¿A qué hora cierran?' },
          { speaker: 'tutor', en: 'We close at nine.', es: 'Cerramos a las nueve.' },
        ],
        [
          { speaker: 'student', en: 'Thank you.', es: 'Gracias.' },
          { speaker: 'tutor', en: 'You are welcome.', es: 'De nada.' },
        ],
      ],
    },
    {
      titleEn: 'Ask About a Product',
      titleEs: 'Pregunta Sobre un Producto',
      instructionsEn: 'Practice asking a store clerk if they have something you need.',
      instructionsEs: 'Practica preguntarle a un empleado de tienda si tiene algo que necesitas.',
      wordBank: [
        { en: 'bread', es: 'pan' },
        { en: 'milk', es: 'leche' },
        { en: 'coffee', es: 'café' },
      ],
      chunks: [
        [
          { speaker: 'student', en: 'Do you have bread?', es: '¿Tiene pan?' },
          { speaker: 'tutor', en: 'Yes, right here.', es: 'Sí, aquí está.' },
        ],
        [
          { speaker: 'student', en: 'Thank you.', es: 'Gracias.' },
          { speaker: 'tutor', en: 'You are welcome.', es: 'De nada.' },
        ],
      ],
    },
    {
      titleEn: 'Order Takeout',
      titleEs: 'Pedido para Llevar',
      instructionsEn: 'Practice ordering food to go over the phone.',
      instructionsEs: 'Practica ordenar comida para llevar por teléfono.',
      wordBank: [
        { en: 'soup', es: 'sopa' },
        { en: 'salad', es: 'ensalada' },
        { en: 'rice', es: 'arroz' },
      ],
      chunks: [
        [
          { speaker: 'student', en: 'I would like the soup, to go.', es: 'Quisiera la sopa, para llevar.' },
          { speaker: 'tutor', en: 'Anything else?', es: '¿Algo más?' },
        ],
        [
          { speaker: 'student', en: "That's all, thank you.", es: 'Eso es todo, gracias.' },
          { speaker: 'tutor', en: 'Your total is ten dollars.', es: 'Su total es diez dólares.' },
        ],
      ],
    },
  ],
  worksheet: [
    { id: 'w1', promptEn: 'Can I see the ____?', promptEs: '¿Puedo ver el menú? (Can I see the ____?)', answer: 'menu' },
    { id: 'w2', promptEn: 'I would ____ to order the chicken.', promptEs: 'Quisiera ordenar el pollo. (I would ____ to order the chicken.)', answer: 'like' },
    { id: 'w3', promptEn: 'Can I have the ____, please?', promptEs: '¿Me trae la cuenta, por favor? (Can I have the ____, please?)', answer: 'check' },
    { id: 'w4', promptEn: 'I want my food ____.', promptEs: 'Quiero mi comida para llevar. (I want my food ____.)', answer: 'to go' },
    { id: 'w5', promptEn: 'What time do you ____?', promptEs: '¿A qué hora cierran? (What time do you ____?)', answer: 'close' },
  ],
}

export default module
