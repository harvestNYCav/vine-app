import type { Module } from '@/types'

const module: Module = {
  slug: 'buying-groceries',
  track: 'esl',
  titleEn: 'Buying Groceries',
  titleEs: 'Comprar Comida',
  descriptionEn: 'Learn how to shop for food at a supermarket in New York.',
  descriptionEs: 'Aprende a hacer compras en un supermercado en Nueva York.',
  icon: 'ShoppingCart',
  vocab: [
    {
      id: 'aisle',
      en: 'aisle',
      es: 'el pasillo',
      exampleEn: 'The rice is in aisle 5.',
      exampleEs: 'El arroz está en el pasillo 5.',
    },
    {
      id: 'how-much',
      en: 'How much does this cost?',
      es: '¿Cuánto cuesta esto?',
      exampleEn: 'Excuse me, how much does this cost?',
      exampleEs: 'Disculpe, ¿cuánto cuesta esto?',
    },
    {
      id: 'receipt',
      en: 'receipt',
      es: 'el recibo',
      exampleEn: 'Can I have a receipt, please?',
      exampleEs: '¿Me puede dar el recibo, por favor?',
    },
    {
      id: 'cashier',
      en: 'cashier',
      es: 'el cajero / la cajera',
      exampleEn: 'Pay at the cashier at the front of the store.',
      exampleEs: 'Paga en la caja al frente de la tienda.',
    },
    {
      id: 'bag',
      en: 'bag',
      es: 'la bolsa',
      exampleEn: 'Do you need a bag for your groceries?',
      exampleEs: '¿Necesita una bolsa para sus compras?',
    },
    {
      id: 'on-sale',
      en: 'on sale',
      es: 'en oferta / en descuento',
      exampleEn: 'The chicken is on sale this week.',
      exampleEs: 'El pollo está en oferta esta semana.',
    },
    {
      id: 'where-is',
      en: 'Where is the...?',
      es: '¿Dónde está el/la...?',
      exampleEn: 'Excuse me, where is the milk?',
      exampleEs: 'Disculpe, ¿dónde está la leche?',
    },
    {
      id: 'cash-credit',
      en: 'cash or credit card',
      es: 'efectivo o tarjeta de crédito',
      exampleEn: 'Will you be paying with cash or credit card?',
      exampleEs: '¿Va a pagar con efectivo o tarjeta de crédito?',
    },
    {
      id: 'fresh',
      en: 'fresh',
      es: 'fresco / fresca',
      exampleEn: 'Is this fish fresh?',
      exampleEs: '¿Este pescado está fresco?',
    },
    {
      id: 'pound',
      en: 'pound',
      es: 'la libra',
      exampleEn: 'I need two pounds of rice.',
      exampleEs: 'Necesito dos libras de arroz.',
    },
    {
      id: 'checkout-line',
      en: 'checkout line',
      es: 'la fila de pago',
      exampleEn: 'The checkout line is very long today.',
      exampleEs: 'La fila de pago está muy larga hoy.',
    },
    {
      id: 'do-you-have',
      en: 'Do you have...?',
      es: '¿Tiene...?',
      exampleEn: 'Do you have any fresh tomatoes?',
      exampleEs: '¿Tiene tomates frescos?',
    },
    {
      id: 'expensive-cheap',
      en: 'expensive / cheap',
      es: 'caro / barato',
      exampleEn: 'This store is expensive, but that one is cheap.',
      exampleEs: 'Esta tienda es cara, pero esa es barata.',
    },
    {
      id: 'i-would-like',
      en: 'I would like...',
      es: 'Quisiera... / Me gustaría...',
      exampleEn: 'I would like two pounds of chicken, please.',
      exampleEs: 'Quisiera dos libras de pollo, por favor.',
    },
  ],
  grammar: [
    {
      titleEn: 'Asking prices: "How much does this cost?"',
      titleEs: 'Preguntar precios: "How much does this cost?"',
      explanationEn: 'Use "How much does this cost?" (or the shorter "How much is this?") to ask a price. Use "I would like..." + an amount to ask for a specific quantity of something.',
      explanationEs: 'Usa "How much does this cost?" (o la forma más corta "How much is this?") para preguntar un precio. Usa "I would like..." + una cantidad para pedir una cantidad específica de algo.',
      examples: [
        { en: 'Excuse me, how much does this cost?', es: 'Disculpe, ¿cuánto cuesta esto?' },
        { en: 'I would like two pounds of chicken, please.', es: 'Quisiera dos libras de pollo, por favor.' },
      ],
    },
    {
      titleEn: '"Do you have...?" to ask what\'s available',
      titleEs: '"Do you have...?" para preguntar qué hay disponible',
      explanationEn: 'Use "Do you have...?" to ask whether a store carries something, and "Where is...?" once you know they do, to find where it is.',
      explanationEs: 'Usa "Do you have...?" para preguntar si una tienda tiene algo, y "Where is...?" una vez que sabes que sí, para encontrar dónde está.',
      examples: [
        { en: 'Do you have any fresh tomatoes?', es: '¿Tiene tomates frescos?' },
        { en: 'Excuse me, where is the milk?', es: 'Disculpe, ¿dónde está la leche?' },
      ],
    },
  ],
  quiz: [
    {
      id: 'q1',
      type: 'multiple-choice',
      promptEn: 'How do you ask where something is in a store?',
      promptEs: '¿Cómo preguntas dónde está algo en una tienda?',
      answer: 'Where is the...?',
      options: ['Where is the...?', 'How much does this cost?', 'Can I have a receipt?', 'Is this on sale?'],
    },
    {
      id: 'q2',
      type: 'multiple-choice',
      promptEn: '"El pasillo" in English is:',
      promptEs: '"El pasillo" en inglés es:',
      answer: 'aisle',
      options: ['aisle', 'cashier', 'receipt', 'bag'],
    },
    {
      id: 'q3',
      type: 'multiple-choice',
      promptEn: 'How do you ask the price of something?',
      promptEs: '¿Cómo preguntas el precio de algo?',
      answer: 'How much does this cost?',
      options: ['How much does this cost?', 'Where is the cashier?', 'Can I have a bag?', 'Is this on sale?'],
    },
    {
      id: 'q4',
      type: 'multiple-choice',
      promptEn: '"En oferta" in English means:',
      promptEs: '"En oferta" en inglés significa:',
      answer: 'on sale',
      options: ['on sale', 'on aisle', 'on cash', 'on receipt'],
    },
    {
      id: 'q5',
      type: 'multiple-choice',
      promptEn: 'The person who takes your payment at the store is called:',
      promptEs: 'La persona que recibe tu pago en la tienda se llama:',
      answer: 'cashier',
      options: ['cashier', 'manager', 'customer', 'bagger'],
    },
    {
      id: 'q6',
      type: 'multiple-choice',
      promptEn: 'Complete: "I would ___ two pounds of rice."',
      promptEs: 'Completa: "I would ___ two pounds of rice."',
      answer: 'like',
      options: ['like', 'likes', 'liking', 'to like'],
    },
    {
      id: 'q7',
      type: 'multiple-choice',
      promptEn: 'Which phrase asks if a store carries something?',
      promptEs: '¿Qué frase pregunta si una tienda tiene algo?',
      answer: 'Do you have...?',
      options: ['Do you have...?', 'How much does this cost?', 'Where is the...?', 'Can I have a receipt?'],
    },
    {
      id: 'q8',
      type: 'multiple-choice',
      promptEn: '"Barato" in English is:',
      promptEs: '"Barato" en inglés es:',
      answer: 'cheap',
      options: ['cheap', 'expensive', 'fresh', 'on sale'],
    },
  ],
  teachingScenarios: [
    {
      label: 'Part 1: Finding items and asking prices',
      text: 'You are at a supermarket. Practice asking where things are and how much they cost.',
      wordBank: [
        { en: 'rice', es: 'arroz' },
        { en: 'bread', es: 'pan' },
        { en: 'vegetables', es: 'verduras' },
      ],
      chunks: [
        [
          { speaker: 'student', en: 'Excuse me, where is the rice?', es: 'Disculpe, ¿dónde está el arroz?' },
          { speaker: 'tutor', en: 'The rice is in aisle 5.', es: 'El arroz está en el pasillo 5.' },
        ],
        [
          { speaker: 'student', en: 'Where is the bread?', es: '¿Dónde está el pan?' },
          { speaker: 'tutor', en: 'The bread is in aisle 3.', es: 'El pan está en el pasillo 3.' },
        ],
        [
          { speaker: 'student', en: 'How much does this cost?', es: '¿Cuánto cuesta esto?' },
          { speaker: 'tutor', en: "It's two dollars.", es: 'Cuesta dos dólares.' },
        ],
      ],
    },
    {
      label: 'Part 2: Asking for a specific amount',
      text: 'You need a specific quantity of food and want to know if it is fresh. Practice asking the person at the counter.',
      wordBank: [
        { en: 'chicken', es: 'pollo' },
        { en: 'fish', es: 'pescado' },
        { en: 'beef', es: 'carne de res' },
      ],
      chunks: [
        [
          { speaker: 'student', en: 'I would like two pounds of chicken, please.', es: 'Quisiera dos libras de pollo, por favor.' },
          { speaker: 'tutor', en: 'Of course. Anything else?', es: 'Claro. ¿Algo más?' },
        ],
        [
          { speaker: 'student', en: 'Is the fish fresh?', es: '¿El pescado está fresco?' },
          { speaker: 'tutor', en: 'Yes, it came in this morning.', es: 'Sí, llegó esta mañana.' },
        ],
        [
          { speaker: 'student', en: 'How much does this cost?', es: '¿Cuánto cuesta esto?' },
          { speaker: 'tutor', en: 'Twelve dollars total.', es: 'Doce dólares en total.' },
        ],
      ],
    },
    {
      label: 'Part 3: Checkout and paying',
      text: 'You are in the checkout line. Practice paying and asking for a bag and a receipt.',
      wordBank: [
        { en: 'cash', es: 'efectivo' },
        { en: 'credit card', es: 'tarjeta de crédito' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: 'Cash or credit card?', es: '¿Efectivo o tarjeta de crédito?' },
          { speaker: 'student', en: 'Credit card, please.', es: 'Tarjeta de crédito, por favor.' },
        ],
        [
          { speaker: 'tutor', en: 'Do you need a bag?', es: '¿Necesita una bolsa?' },
          { speaker: 'student', en: 'Yes, please.', es: 'Sí, por favor.' },
        ],
        [
          { speaker: 'student', en: 'Can I have a receipt?', es: '¿Me puede dar el recibo?' },
          { speaker: 'tutor', en: 'Of course, here you go.', es: 'Claro, aquí tiene.' },
        ],
      ],
    },
  ],
  practiceActivities: [
    {
      titleEn: 'Is It Expensive?',
      titleEs: '¿Es Caro?',
      instructionsEn: 'Practice asking if something is expensive, cheap, or on sale.',
      instructionsEs: 'Practica preguntar si algo es caro, barato o está en oferta.',
      wordBank: [
        { en: 'expensive', es: 'caro' },
        { en: 'cheap', es: 'barato' },
        { en: 'on sale', es: 'en oferta' },
      ],
      chunks: [
        [
          { speaker: 'student', en: 'Is this expensive?', es: '¿Esto es caro?' },
          { speaker: 'tutor', en: "No, it's cheap.", es: 'No, es barato.' },
        ],
        [
          { speaker: 'student', en: 'Is it on sale?', es: '¿Está en oferta?' },
          { speaker: 'tutor', en: 'Yes, two dollars.', es: 'Sí, dos dólares.' },
        ],
      ],
    },
    {
      titleEn: 'Ask for a Different Amount',
      titleEs: 'Pide Otra Cantidad',
      instructionsEn: 'Practice asking for fresh vegetables and a specific amount.',
      instructionsEs: 'Practica pedir verduras frescas y una cantidad específica.',
      wordBank: [
        { en: 'tomatoes', es: 'tomates' },
        { en: 'onions', es: 'cebollas' },
        { en: 'potatoes', es: 'papas' },
      ],
      chunks: [
        [
          { speaker: 'student', en: 'Do you have fresh tomatoes?', es: '¿Tiene tomates frescos?' },
          { speaker: 'tutor', en: 'Yes, right here.', es: 'Sí, aquí están.' },
        ],
        [
          { speaker: 'student', en: 'I would like two pounds, please.', es: 'Quisiera dos libras, por favor.' },
          { speaker: 'tutor', en: 'Of course.', es: 'Claro.' },
        ],
      ],
    },
    {
      titleEn: 'At the Checkout',
      titleEs: 'En la Fila de Pago',
      instructionsEn: 'Practice talking to the cashier at a busy checkout line.',
      instructionsEs: 'Practica hablar con el cajero en una fila de pago muy ocupada.',
      chunks: [
        [
          { speaker: 'student', en: 'The checkout line is long today.', es: 'La fila de pago está larga hoy.' },
          { speaker: 'tutor', en: "Yes, it's busy.", es: 'Sí, está ocupado.' },
        ],
        [
          { speaker: 'student', en: 'Thank you for your help.', es: 'Gracias por su ayuda.' },
          { speaker: 'tutor', en: 'You are welcome.', es: 'De nada.' },
        ],
      ],
    },
  ],
  worksheet: [
    { id: 'w1', promptEn: 'Excuse me, ____ is the milk?', promptEs: 'Disculpe, ¿____ está la leche?', answer: 'where' },
    { id: 'w2', promptEn: 'How ____ does this cost?', promptEs: '¿Cuánto cuesta esto? (How ____ does this cost?)', answer: 'much' },
    { id: 'w3', promptEn: 'I would ____ two pounds of rice.', promptEs: 'Quisiera dos libras de arroz. (I would ____ two pounds...)', answer: 'like' },
    { id: 'w4', promptEn: 'Do you ____ any fresh tomatoes?', promptEs: '¿Tiene tomates frescos? (Do you ____ any fresh tomatoes?)', answer: 'have' },
    { id: 'w5', promptEn: 'Can I ____ a receipt, please?', promptEs: '¿Me puede dar el recibo? (Can I ____ a receipt, please?)', answer: 'have' },
  ],
  classWorksheet: [
    { id: 'cw1', promptEn: 'The rice is in ____ 5.', promptEs: 'El arroz está en el pasillo 5. (The rice is in ____ 5.)', answer: 'aisle' },
    { id: 'cw2', promptEn: 'The chicken is ____ today. It is cheap!', promptEs: 'El pollo está en oferta hoy. (The chicken is ____ today.)', answer: 'on sale' },
    { id: 'cw3', promptEn: 'These bananas are very ____. (frescas)', promptEs: 'Estos plátanos están muy frescos. (These bananas are very ____.)', answer: 'fresh' },
    { id: 'cw4', promptEn: 'The ____ gives me my change.', promptEs: 'El cajero me da mi cambio. (The ____ gives me my change.)', answer: 'cashier' },
    { id: 'cw5', promptEn: 'Do you need a ____ for your groceries?', promptEs: '¿Necesita una bolsa? (Do you need a ____?)', answer: 'bag' },
    { id: 'cw6', promptEn: 'Cash or ____ card?', promptEs: '¿Efectivo o tarjeta de crédito? (Cash or ____ card?)', answer: 'credit' },
    { id: 'cw7', promptEn: 'Steak is ____. Rice is cheap.', promptEs: 'La carne es cara. El arroz es barato. (Steak is ____.)', answer: 'expensive' },
    { id: 'cw8', promptEn: 'The ____ line is very long today.', promptEs: 'La fila para pagar es muy larga hoy. (The ____ line...)', answer: 'checkout' },
  ],
  listening: [
    {
      titleEn: 'At the Supermarket',
      titleEs: 'En el supermercado',
      script: [
        { speaker: 'Customer', en: 'Excuse me. Where is the bread?' },
        { speaker: 'Worker', en: 'It is in aisle 3, next to the cereal.' },
        { speaker: 'Customer', en: 'Thank you. Do you have fresh fish?' },
        { speaker: 'Worker', en: 'Yes, in the back of the store. Salmon is on sale today.' },
        { speaker: 'Customer', en: 'How much does it cost?' },
        { speaker: 'Worker', en: 'Nine dollars a pound.' },
        { speaker: 'Customer', en: 'Great. I would like two pounds.' },
      ],
      questions: [
        { id: 'l1q1', promptEn: 'Where is the bread?', promptEs: '¿Dónde está el pan?', answer: 'In aisle 3 (next to the cereal)' },
        { id: 'l1q2', promptEn: 'What is on sale?', promptEs: '¿Qué está en oferta?', answer: 'Salmon' },
        { id: 'l1q3', promptEn: 'How much is one pound?', promptEs: '¿Cuánto cuesta una libra?', answer: 'Nine dollars' },
        { id: 'l1q4', promptEn: 'How many pounds does the customer want?', promptEs: '¿Cuántas libras quiere el cliente?', answer: 'Two' },
      ],
    },
    {
      titleEn: 'Paying at Checkout',
      titleEs: 'Pagando en la caja',
      script: [
        { speaker: 'Cashier', en: 'Hi. Did you find everything?' },
        { speaker: 'Mrs. Lee', en: 'Yes, thank you.' },
        { speaker: 'Cashier', en: 'Your total is 32 dollars and 50 cents. Cash or credit card?' },
        { speaker: 'Mrs. Lee', en: 'Cash, please. Here is 40 dollars.' },
        { speaker: 'Cashier', en: 'Your change is 7 dollars and 50 cents. Do you want a bag?' },
        { speaker: 'Mrs. Lee', en: 'No, I have my own bag. Can I have the receipt, please?' },
      ],
      questions: [
        { id: 'l2q1', promptEn: 'What is the total?', promptEs: '¿Cuál es el total?', answer: '$32.50' },
        { id: 'l2q2', promptEn: 'How does Mrs. Lee pay?', promptEs: '¿Cómo paga la Sra. Lee?', answer: 'With cash' },
        { id: 'l2q3', promptEn: 'How much is her change?', promptEs: '¿Cuánto es su cambio?', answer: '$7.50' },
        { id: 'l2q4', promptEn: 'Why doesn\'t she need a bag?', promptEs: '¿Por qué no necesita una bolsa?', answer: 'She has her own bag.' },
      ],
    },
  ],
  inPersonQuiz: [
    { id: 'iq1', kind: 'translate', promptEn: 'Write in English: "¿Cuánto cuesta esto?"', answer: 'How much does this cost?' },
    { id: 'iq2', kind: 'translate', promptEn: 'Write in English: "el recibo"', answer: 'the receipt' },
    { id: 'iq3', kind: 'translate', promptEn: 'Write in Spanish: "Is it on sale?"', answer: '¿Está en oferta?' },
    { id: 'iq4', kind: 'translate', promptEn: 'Write in English: "Quisiera una libra de queso."', answer: 'I would like a pound of cheese.' },
    { id: 'iq5', kind: 'dictation', promptEn: 'Where is the milk?', answer: 'Where is the milk?' },
    { id: 'iq6', kind: 'dictation', promptEn: 'The apples are fresh.', answer: 'The apples are fresh.' },
    { id: 'iq7', kind: 'dictation', promptEn: 'I will pay with cash.', answer: 'I will pay with cash.' },
    { id: 'iq8', kind: 'short-answer', promptEn: 'Opposite of "expensive"?', promptEs: '¿Lo contrario de "expensive"?', answer: 'cheap' },
    { id: 'iq9', kind: 'short-answer', promptEn: 'Write three things you buy every week.', promptEs: 'Escribe tres cosas que compras cada semana.', answer: 'milk, eggs, bread... (Answers will vary.)' },
    { id: 'iq10', kind: 'short-answer', promptEn: 'Ask a worker where the eggs are.', promptEs: 'Pregúntale a un empleado dónde están los huevos.', answer: 'Excuse me, where are the eggs?' },
  ],
}

export default module
