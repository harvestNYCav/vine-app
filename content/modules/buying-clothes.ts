import type { Module } from '@/types'

const module: Module = {
  slug: 'buying-clothes',
  track: 'esl',
  titleEn: 'Buying Clothes',
  titleEs: 'Comprar Ropa',
  descriptionEn: 'Learn how to shop for clothes and ask for help at a store.',
  descriptionEs: 'Aprende a comprar ropa y pedir ayuda en una tienda.',
  icon: 'Shirt',
  vocab: [
    {
      id: 'size',
      en: 'size',
      es: 'la talla / el tamaño',
      exampleEn: 'What size do you wear?',
      exampleEs: '¿Qué talla usas?',
    },
    {
      id: 'fitting-room',
      en: 'fitting room',
      es: 'el probador',
      exampleEn: 'Can I use the fitting room to try this on?',
      exampleEs: '¿Puedo usar el probador para probarme esto?',
    },
    {
      id: 'too-big-small',
      en: 'too big / too small',
      es: 'muy grande / muy pequeño',
      exampleEn: 'This shirt is too big. Do you have a smaller size?',
      exampleEs: 'Esta camisa es muy grande. ¿Tiene una talla más pequeña?',
    },
    {
      id: 'do-you-have',
      en: 'Do you have this in...?',
      es: '¿Tiene esto en...?',
      exampleEn: 'Do you have this in blue? Do you have this in a size medium?',
      exampleEs: '¿Tiene esto en azul? ¿Tiene esto en talla mediana?',
    },
    {
      id: 'return',
      en: 'return / exchange',
      es: 'devolver / cambiar',
      exampleEn: 'I would like to return this shirt, please.',
      exampleEs: 'Me gustaría devolver esta camisa, por favor.',
    },
    {
      id: 'discount',
      en: 'discount',
      es: 'el descuento',
      exampleEn: 'Is there a discount on these shoes?',
      exampleEs: '¿Hay algún descuento en estos zapatos?',
    },
    {
      id: 'try-on',
      en: 'try on',
      es: 'probarse',
      exampleEn: 'Can I try on this jacket?',
      exampleEs: '¿Me puedo probar esta chaqueta?',
    },
    {
      id: 'i-am-looking-for',
      en: 'I am looking for...',
      es: 'Estoy buscando...',
      exampleEn: 'I am looking for a warm coat for winter.',
      exampleEs: 'Estoy buscando un abrigo caliente para el invierno.',
    },
    {
      id: 'color',
      en: 'color',
      es: 'el color',
      exampleEn: 'What color do you want?',
      exampleEs: '¿Qué color quiere?',
    },
    {
      id: 'price-tag',
      en: 'price tag',
      es: 'la etiqueta de precio',
      exampleEn: 'Check the price tag before you buy it.',
      exampleEs: 'Revisa la etiqueta de precio antes de comprarlo.',
    },
    {
      id: 'pay',
      en: 'pay',
      es: 'pagar',
      exampleEn: 'Where do I pay for this?',
      exampleEs: '¿Dónde pago esto?',
    },
    {
      id: 'on-sale',
      en: 'on sale',
      es: 'en oferta',
      exampleEn: 'This jacket is on sale today.',
      exampleEs: 'Esta chaqueta está en oferta hoy.',
    },
    {
      id: 'match',
      en: 'match / matches',
      es: 'combinar / hace juego',
      exampleEn: 'Does this shirt match these pants?',
      exampleEs: '¿Esta camisa hace juego con estos pantalones?',
    },
    {
      id: 'cash-register',
      en: 'cash register',
      es: 'la caja registradora',
      exampleEn: 'The cash register is at the front of the store.',
      exampleEs: 'La caja registradora está al frente de la tienda.',
    },
  ],
  grammar: [
    {
      titleEn: '"too" + adjective for a fit problem',
      titleEs: '"too" + adjetivo para un problema de talla',
      explanationEn: 'Use "too" before an adjective to say something is more than you want — a problem, not just a description. "This shirt is too big" means it doesn\'t fit, not just that it\'s a big shirt.',
      explanationEs: 'Usa "too" antes de un adjetivo para decir que algo es más de lo que quieres — un problema, no solo una descripción. "This shirt is too big" significa que no te queda bien, no solo que es una camisa grande.',
      examples: [
        { en: 'This shirt is too big. Do you have a smaller size?', es: 'Esta camisa es muy grande. ¿Tiene una talla más pequeña?' },
      ],
    },
    {
      titleEn: '"Do you have this in...?" for color or size',
      titleEs: '"Do you have this in...?" para color o talla',
      explanationEn: 'Use "Do you have this in...?" to ask for the same item in a different color or size — swap in the word you need after "in."',
      explanationEs: 'Usa "Do you have this in...?" para pedir el mismo artículo en otro color o talla — cambia la palabra que necesitas después de "in."',
      examples: [
        { en: 'Do you have this in blue? Do you have this in a size medium?', es: '¿Tiene esto en azul? ¿Tiene esto en talla mediana?' },
      ],
    },
  ],
  quiz: [
    {
      id: 'q1',
      type: 'multiple-choice',
      promptEn: 'Where do you try on clothes in a store?',
      promptEs: '¿Dónde te pruebas la ropa en una tienda?',
      answer: 'Fitting room',
      options: ['Fitting room', 'Cashier', 'Aisle', 'Exit'],
    },
    {
      id: 'q2',
      type: 'multiple-choice',
      promptEn: 'How do you say "Esta camisa es muy grande" in English?',
      promptEs: '¿Cómo se dice "Esta camisa es muy grande" en inglés?',
      answer: 'This shirt is too big',
      options: ['This shirt is too big', 'This shirt is too small', 'This shirt is on sale', 'This shirt is my size'],
    },
    {
      id: 'q3',
      type: 'multiple-choice',
      promptEn: '"Estoy buscando..." in English is:',
      promptEs: '"Estoy buscando..." en inglés es:',
      answer: 'I am looking for...',
      options: ['I am looking for...', 'I am trying on...', 'I want to return...', 'Do you have...?'],
    },
    {
      id: 'q4',
      type: 'multiple-choice',
      promptEn: 'How do you ask if a store has something in a different color?',
      promptEs: '¿Cómo preguntas si una tienda tiene algo en otro color?',
      answer: 'Do you have this in...?',
      options: ['Do you have this in...?', 'Where is the fitting room?', 'Can I return this?', 'What is the size?'],
    },
    {
      id: 'q5',
      type: 'multiple-choice',
      promptEn: '"El descuento" in English is:',
      promptEs: '"El descuento" en inglés es:',
      answer: 'discount',
      options: ['discount', 'receipt', 'return', 'exchange'],
    },
    {
      id: 'q6',
      type: 'multiple-choice',
      promptEn: 'Complete: "This shirt is ___ small."',
      promptEs: 'Completa: "This shirt is ___ small."',
      answer: 'too',
      options: ['too', 'very', 'so', 'much'],
    },
    {
      id: 'q7',
      type: 'multiple-choice',
      promptEn: 'Which phrase asks for a different color or size?',
      promptEs: '¿Qué frase pide un color o talla diferente?',
      answer: 'Do you have this in...?',
      options: ['Do you have this in...?', 'I am looking for...', 'Can I try this on?', 'Is this on sale?'],
    },
    {
      id: 'q8',
      type: 'multiple-choice',
      promptEn: '"La talla" in English is:',
      promptEs: '"La talla" en inglés es:',
      answer: 'size',
      options: ['size', 'color', 'discount', 'price tag'],
    },
  ],
  teachingScenarios: [
    {
      label: 'Part 1: Finding the right size',
      text: 'You are at a clothing store. You need a coat.',
      wordBank: [
        { en: 'small', es: 'pequeño' },
        { en: 'medium', es: 'mediano' },
        { en: 'large', es: 'grande' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: 'Can I help you?', es: '¿Puedo ayudarle?' },
          { speaker: 'student', en: 'I am looking for a coat.', es: 'Estoy buscando un abrigo.' },
        ],
        [
          { speaker: 'tutor', en: 'What size?', es: '¿Qué talla?' },
          { speaker: 'student', en: 'Medium, please.', es: 'Mediano, por favor.' },
        ],
        [
          { speaker: 'tutor', en: 'Here you go. The fitting room is there.', es: 'Aquí tiene. El probador está allí.' },
          { speaker: 'student', en: 'Thank you.', es: 'Gracias.' },
        ],
        [
          { speaker: 'tutor', en: 'How does it fit?', es: '¿Cómo le queda?' },
          { speaker: 'student', en: 'Too big. Small, please.', es: 'Muy grande. Pequeño, por favor.' },
        ],
      ],
    },
    {
      label: 'Part 2: Asking about colors and prices',
      text: 'You like the coat. Ask about color and price.',
      wordBank: [
        { en: 'blue', es: 'azul' },
        { en: 'black', es: 'negro' },
      ],
      chunks: [
        [
          { speaker: 'student', en: 'Do you have this in blue?', es: '¿Tiene esto en azul?' },
          { speaker: 'tutor', en: 'Yes, right here.', es: 'Sí, aquí está.' },
        ],
        [
          { speaker: 'student', en: 'Is this on sale?', es: '¿Está en oferta?' },
          { speaker: 'tutor', en: 'Yes, ten dollars off.', es: 'Sí, diez dólares de descuento.' },
        ],
        [
          { speaker: 'student', en: "Great, I'll take it.", es: 'Genial, me lo llevo.' },
          { speaker: 'tutor', en: 'Good choice!', es: '¡Buena elección!' },
        ],
      ],
    },
    {
      label: 'Part 3: Paying and returns',
      text: 'You are ready to pay.',
      chunks: [
        [
          { speaker: 'student', en: 'Where do I pay?', es: '¿Dónde pago?' },
          { speaker: 'tutor', en: 'At the cash register.', es: 'En la caja registradora.' },
        ],
        [
          { speaker: 'student', en: 'Can I return this?', es: '¿Puedo devolver esto?' },
          { speaker: 'tutor', en: 'Yes. You have 30 days. Bring your receipt.', es: 'Sí. Tiene 30 días. Traiga su recibo.' },
        ],
        [
          { speaker: 'student', en: 'Thank you very much!', es: '¡Muchas gracias!' },
          { speaker: 'tutor', en: "You're welcome!", es: '¡De nada!' },
        ],
      ],
    },
  ],
  practiceActivities: [
    {
      titleEn: 'Find the Right Fit',
      titleEs: 'Encuentra la Talla Correcta',
      instructionsEn: 'The tutor hands you clothes that do not fit. Say if it is too big or too small.',
      instructionsEs: 'El tutor te da ropa que no te queda bien. Di si es muy grande o muy pequeña.',
      wordBank: [
        { en: 'too big', es: 'muy grande' },
        { en: 'too small', es: 'muy pequeño' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: 'Try this shirt.', es: 'Pruébate esta camisa.' },
          { speaker: 'student', en: 'Too big.', es: 'Muy grande.' },
        ],
        [
          { speaker: 'tutor', en: 'Try this one.', es: 'Prueba esta.' },
          { speaker: 'student', en: 'Too small. Do you have a medium?', es: 'Muy pequeña. ¿Tiene una mediana?' },
        ],
      ],
    },
    {
      titleEn: 'Ask About Color',
      titleEs: 'Pregunta Sobre el Color',
      instructionsEn: 'Ask the clerk for a different color and check the price.',
      instructionsEs: 'Pídele al empleado un color diferente y revisa el precio.',
      wordBank: [
        { en: 'red', es: 'rojo' },
        { en: 'black', es: 'negro' },
      ],
      chunks: [
        [
          { speaker: 'student', en: 'Do you have this in red?', es: '¿Tiene esto en rojo?' },
          { speaker: 'tutor', en: 'Yes, right here.', es: 'Sí, aquí está.' },
        ],
        [
          { speaker: 'student', en: 'What is the price?', es: '¿Cuál es el precio?' },
          { speaker: 'tutor', en: 'Twenty dollars.', es: 'Veinte dólares.' },
        ],
      ],
    },
    {
      titleEn: 'Return an Item',
      titleEs: 'Devuelve un Artículo',
      instructionsEn: 'Practice returning an item to the store.',
      instructionsEs: 'Practica devolver un artículo a la tienda.',
      wordBank: [
        { en: 'wrong size', es: 'talla equivocada' },
        { en: 'wrong color', es: 'color equivocado' },
      ],
      chunks: [
        [
          { speaker: 'student', en: 'I want to return this.', es: 'Quiero devolver esto.' },
          { speaker: 'tutor', en: 'What is the problem?', es: '¿Cuál es el problema?' },
        ],
        [
          { speaker: 'student', en: 'Wrong size.', es: 'Talla equivocada.' },
          { speaker: 'tutor', en: 'No problem. Do you have your receipt?', es: 'No hay problema. ¿Tiene su recibo?' },
        ],
      ],
    },
  ],
  worksheet: [
    { id: 'w1', promptEn: 'This shirt is too ____.', promptEs: 'Esta camisa es muy grande. (This shirt is too ____.)', answer: 'big' },
    { id: 'w2', promptEn: 'Do you ____ this in blue?', promptEs: '¿Tiene esto en azul? (Do you ____ this in blue?)', answer: 'have' },
    { id: 'w3', promptEn: 'I am ____ for a warm coat.', promptEs: 'Estoy buscando un abrigo caliente. (I am ____ for a warm coat.)', answer: 'looking' },
    { id: 'w4', promptEn: 'Can I ____ on this jacket?', promptEs: '¿Me puedo probar esta chaqueta? (Can I ____ on this jacket?)', answer: 'try' },
    { id: 'w5', promptEn: 'Is there a ____ on these shoes?', promptEs: '¿Hay un descuento en estos zapatos? (Is there a ____ on these shoes?)', answer: 'discount' },
  ],
}

export default module
