import type { Module } from '@/types'

const module: Module = {
  slug: 'demonstratives',
  track: 'esl',
  titleEn: 'This/That, These/Those',
  titleEs: 'This/That, These/Those',
  descriptionEn: 'Learn how to point out things that are near or far, one or many.',
  descriptionEs: 'Aprende a señalar cosas que están cerca o lejos, una o varias.',
  icon: 'MousePointer2',
  vocab: [
    { id: 'this', en: 'this', es: 'esto / este / esta',
      exampleEn: 'This is my house.', exampleEs: 'Esta es mi casa.' },
    { id: 'that', en: 'that', es: 'eso / ese / esa',
      exampleEn: 'That is my car.', exampleEs: 'Ese es mi carro.' },
    { id: 'these', en: 'these', es: 'estos / estas',
      exampleEn: 'These are my keys.', exampleEs: 'Estas son mis llaves.' },
    { id: 'those', en: 'those', es: 'esos / esas',
      exampleEn: 'Those are my shoes.', exampleEs: 'Esos son mis zapatos.' },
    { id: 'this-is-my-house', en: 'This is my house', es: 'Esta es mi casa',
      exampleEn: 'This is my house on Main Street.', exampleEs: 'Esta es mi casa en la calle Main.' },
    { id: 'that-is-my-car', en: 'That is my car', es: 'Ese es mi carro',
      exampleEn: 'That is my car over there.', exampleEs: 'Ese es mi carro allá.' },
    { id: 'these-are-my-keys', en: 'These are my keys', es: 'Estas son mis llaves',
      exampleEn: 'These are my keys, right here.', exampleEs: 'Estas son mis llaves, aquí mismo.' },
    { id: 'those-are-my-shoes', en: 'Those are my shoes', es: 'Esos son mis zapatos',
      exampleEn: 'Those are my shoes by the door.', exampleEs: 'Esos son mis zapatos junto a la puerta.' },
    { id: 'is-this-yours', en: 'Is this yours?', es: '¿Esto es tuyo?',
      exampleEn: 'Excuse me, is this yours?', exampleEs: 'Disculpe, ¿esto es suyo?' },
    { id: 'what-is-this', en: 'What is this?', es: '¿Qué es esto?',
      exampleEn: 'What is this? I don\'t know this word.', exampleEs: '¿Qué es esto? No conozco esta palabra.' },
    { id: 'i-like-this-one', en: 'I like this one', es: 'Me gusta este / esta',
      exampleEn: 'I like this one better than that one.', exampleEs: 'Me gusta este más que ese.' },
    { id: 'i-like-that-one', en: 'I like that one', es: 'Me gusta ese / esa',
      exampleEn: 'I like that one over there.', exampleEs: 'Me gusta ese que está allá.' },
    { id: 'here', en: 'here', es: 'aquí',
      exampleEn: 'My documents are here.', exampleEs: 'Mis documentos están aquí.' },
    { id: 'there', en: 'there', es: 'allí / allá',
      exampleEn: 'The bus stop is over there.', exampleEs: 'La parada de autobús está allá.' },
  ],
  grammar: [
    {
      titleEn: 'Near or far, one or many',
      titleEs: 'Cerca o lejos, uno o varios',
      explanationEn: 'English has four words for pointing things out, based on two questions: is it near or far, and is it one thing or more than one? Near + one = this. Far + one = that. Near + many = these. Far + many = those.',
      explanationEs: 'El inglés tiene cuatro palabras para señalar cosas, según dos preguntas: ¿está cerca o lejos?, y ¿es una cosa o más de una? Cerca + una = this. Lejos + una = that. Cerca + varias = these. Lejos + varias = those.',
      examples: [
        { en: 'This is my house.', es: 'Esta es mi casa.' },
        { en: 'That is my car.', es: 'Ese es mi carro.' },
        { en: 'These are my keys.', es: 'Estas son mis llaves.' },
        { en: 'Those are my shoes.', es: 'Esos son mis zapatos.' },
      ],
    },
    {
      titleEn: 'Asking about things you don\'t recognize',
      titleEs: 'Preguntar sobre cosas que no reconoces',
      explanationEn: '"What is this/that?" asks someone to identify something. "Is this/that yours?" asks who something belongs to. Use "this/that" (not "these/those") even if you\'re not sure yet whether it\'s one thing.',
      explanationEs: '"What is this/that?" le pide a alguien que identifique algo. "Is this/that yours?" pregunta a quién pertenece algo. Usa "this/that" (no "these/those") incluso si todavía no estás seguro de si es una sola cosa.',
      examples: [
        { en: 'What is this? I don\'t know this word.', es: '¿Qué es esto? No conozco esta palabra.' },
        { en: 'Excuse me, is this yours?', es: 'Disculpe, ¿esto es suyo?' },
      ],
    },
  ],
  quiz: [
    { id: 'q1', type: 'multiple-choice', promptEn: '"Esto" (near, one thing) in English is:', promptEs: '"Esto" (cerca, una cosa) en inglés es:',
      answer: 'this', options: ['this', 'that', 'these', 'those'] },
    { id: 'q2', type: 'multiple-choice', promptEn: '"Esos" (far, many things) in English is:', promptEs: '"Esos" (lejos, varias cosas) en inglés es:',
      answer: 'those', options: ['those', 'these', 'this', 'that'] },
    { id: 'q3', type: 'multiple-choice', promptEn: 'Complete: "___ are my keys." (they are right here)', promptEs: 'Completa: "___ are my keys." (están aquí mismo)',
      answer: 'These', options: ['These', 'Those', 'This', 'That'] },
    { id: 'q4', type: 'multiple-choice', promptEn: 'Complete: "___ is my car." (it is far away)', promptEs: 'Completa: "___ is my car." (está lejos)',
      answer: 'That', options: ['That', 'This', 'These', 'Those'] },
    { id: 'q5', type: 'multiple-choice', promptEn: '"¿Qué es esto?" in English is:', promptEs: '"¿Qué es esto?" en inglés es:',
      answer: 'What is this?', options: ['What is this?', 'What is that?', 'Is this yours?', 'I like this one'] },
    { id: 'q6', type: 'multiple-choice', promptEn: 'Complete: "___ are my shoes." (far away, plural)', promptEs: 'Completa: "___ are my shoes." (lejos, plural)',
      answer: 'Those', options: ['Those', 'These', 'This', 'That'] },
    { id: 'q7', type: 'multiple-choice', promptEn: '"¿Esto es tuyo?" in English is:', promptEs: '"¿Esto es tuyo?" en inglés es:',
      answer: 'Is this yours?', options: ['Is this yours?', 'What is this?', 'I like this one', 'This is my house'] },
    { id: 'q8', type: 'multiple-choice', promptEn: 'Which word is near and singular?', promptEs: '¿Qué palabra es cercana y singular?',
      answer: 'this', options: ['this', 'that', 'these', 'those'] },
  ],
  teachingScenarios: [
    {
      label: 'Part 1: Pointing out things at home',
      text: 'Practice pointing out things near you at home.',
      wordBank: [
        { en: 'keys', es: 'llaves' },
        { en: 'phone', es: 'teléfono' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: 'What is this?', es: '¿Qué es esto?' },
          { speaker: 'student', en: 'This is my house.', es: 'Esta es mi casa.' },
        ],
        [
          { speaker: 'tutor', en: 'And these things on the table?', es: '¿Y estas cosas en la mesa?' },
          { speaker: 'student', en: 'These are my keys.', es: 'Estas son mis llaves.' },
        ],
        [
          { speaker: 'tutor', en: 'Are they here or over there?', es: '¿Están aquí o allá?' },
          { speaker: 'student', en: 'Here, on the table.', es: 'Aquí, en la mesa.' },
        ],
      ],
    },
    {
      label: 'Part 2: Comparing items in a store',
      text: 'Practice comparing an item close to you with one far away on a shelf.',
      wordBank: [
        { en: 'cheaper', es: 'más barato' },
        { en: 'my favorite color', es: 'mi color favorito' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: 'Which shoes do you like?', es: '¿Cuáles zapatos te gustan?' },
          { speaker: 'student', en: 'I like this one.', es: 'Me gusta este.' },
        ],
        [
          { speaker: 'tutor', en: 'What about those, over there?', es: '¿Y esos, allá?' },
          { speaker: 'student', en: 'I like that one too.', es: 'También me gusta ese.' },
        ],
        [
          { speaker: 'tutor', en: 'So which will you buy?', es: '¿Entonces cuál vas a comprar?' },
          { speaker: 'student', en: 'This one. It is cheaper.', es: 'Este. Es más barato.' },
        ],
      ],
    },
    {
      label: 'Part 3: Asking about unfamiliar things',
      text: 'You see something you don\'t recognize at the pharmacy. Practice asking what it is and whether something is yours.',
      chunks: [
        [
          { speaker: 'tutor', en: 'You see something new on the shelf. What do you ask?', es: 'Ves algo nuevo en el estante. ¿Qué preguntas?' },
          { speaker: 'student', en: 'What is this?', es: '¿Qué es esto?' },
        ],
        [
          { speaker: 'tutor', en: 'That is medicine for a headache.', es: 'Eso es medicina para el dolor de cabeza.' },
          { speaker: 'student', en: 'Thank you.', es: 'Gracias.' },
        ],
        [
          { speaker: 'tutor', en: 'You find something on the floor. What do you ask?', es: 'Encuentras algo en el piso. ¿Qué preguntas?' },
          { speaker: 'student', en: 'Excuse me, is this yours?', es: 'Disculpe, ¿esto es suyo?' },
        ],
      ],
    },
  ],
  practiceActivities: [
    {
      titleEn: 'Point and Say',
      titleEs: 'Señala y Di',
      instructionsEn: 'Point to a real object near you and say what it is.',
      instructionsEs: 'Señala un objeto real cerca de ti y di qué es.',
      wordBank: [
        { en: 'my keys', es: 'mis llaves' },
        { en: 'my shoes', es: 'mis zapatos' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: 'Point to something near you. What is it?', es: 'Señala algo cerca de ti. ¿Qué es?' },
          { speaker: 'student', en: 'This is my phone.', es: 'Este es mi teléfono.' },
        ],
        [
          { speaker: 'tutor', en: 'Now point to something far away.', es: 'Ahora señala algo lejos.' },
          { speaker: 'student', en: 'That is my bag.', es: 'Esa es mi bolsa.' },
        ],
      ],
    },
    {
      titleEn: 'Lost and Found',
      titleEs: 'Objetos Perdidos',
      instructionsEn: 'A tutor holds up an object. Say if it is yours.',
      instructionsEs: 'El tutor sostiene un objeto. Di si es tuyo.',
      chunks: [
        [
          { speaker: 'tutor', en: 'Is this yours?', es: '¿Esto es tuyo?' },
          { speaker: 'student', en: 'Yes, this is mine.', es: 'Sí, esto es mío.' },
        ],
        [
          { speaker: 'tutor', en: 'Is this yours?', es: '¿Esto es tuyo?' },
          { speaker: 'student', en: 'No, that is not mine.', es: 'No, eso no es mío.' },
        ],
      ],
    },
    {
      titleEn: 'This One or That One?',
      titleEs: '¿Este o Ese?',
      instructionsEn: 'Compare two similar items and say which one you like.',
      instructionsEs: 'Compara dos artículos similares y di cuál te gusta.',
      chunks: [
        [
          { speaker: 'tutor', en: 'Two shirts. One is near, one is far. Which do you like?', es: 'Dos camisas. Una está cerca, otra lejos. ¿Cuál te gusta?' },
          { speaker: 'student', en: 'I like this one.', es: 'Me gusta esta.' },
        ],
        [
          { speaker: 'tutor', en: 'Why do you like it?', es: '¿Por qué te gusta?' },
          { speaker: 'student', en: 'These are my favorite color.', es: 'Estas son de mi color favorito.' },
        ],
      ],
    },
  ],
  worksheet: [
    { id: 'w1', promptEn: '____ is my house.', promptEs: 'Esta es mi casa. (____ is my house.)', answer: 'This' },
    { id: 'w2', promptEn: '____ are my keys.', promptEs: 'Estas son mis llaves. (____ are my keys.)', answer: 'These' },
    { id: 'w3', promptEn: '____ is my car.', promptEs: 'Ese es mi carro. (____ is my car.)', answer: 'That' },
    { id: 'w4', promptEn: '____ are my shoes.', promptEs: 'Esos son mis zapatos. (____ are my shoes.)', answer: 'Those' },
    { id: 'w5', promptEn: 'What is ____?', promptEs: '¿Qué es esto? (What is ____?)', answer: 'this' },
  ],
  classWorksheet: [
    { id: 'cw1', promptEn: 'I like ____ one. (near me)', promptEs: 'Me gusta este. (I like ____ one.)', answer: 'this' },
    { id: 'cw2', promptEn: 'I like ____ one over there. (far)', promptEs: 'Me gusta ese de allá. (I like ____ one over there.)', answer: 'that' },
    { id: 'cw3', promptEn: '____ apples here are fresh.', promptEs: 'Estas manzanas aquí están frescas. (____ apples here are fresh.)', answer: 'These' },
    { id: 'cw4', promptEn: '____ houses over there are big.', promptEs: 'Esas casas de allá son grandes. (____ houses over there...)', answer: 'Those' },
    { id: 'cw5', promptEn: 'Is ____ yours? (one thing, near)', promptEs: '¿Esto es tuyo? (Is ____ yours?)', answer: 'this' },
    { id: 'cw6', promptEn: 'What is ____ over there?', promptEs: '¿Qué es eso de allá? (What is ____ over there?)', answer: 'that' },
    { id: 'cw7', promptEn: 'Come ____, please. (to me)', promptEs: 'Ven aquí, por favor. (Come ____, please.)', answer: 'here' },
    { id: 'cw8', promptEn: 'Put the bags over ____.', promptEs: 'Pon las bolsas allá. (Put the bags over ____.)', answer: 'there' },
  ],
  listening: [
    {
      titleEn: 'At the Market',
      titleEs: 'En el mercado',
      script: [
        { speaker: 'Customer', en: 'Excuse me. How much are these tomatoes?' },
        { speaker: 'Seller', en: 'These are two dollars a pound.' },
        { speaker: 'Customer', en: 'And those mangoes over there?' },
        { speaker: 'Seller', en: 'Those are one dollar each.' },
        { speaker: 'Customer', en: 'What is this? I don\'t know this fruit.' },
        { speaker: 'Seller', en: 'That is a dragon fruit. It is sweet.' },
        { speaker: 'Customer', en: 'I like this one. I will take it.' },
      ],
      questions: [
        { id: 'l1q1', promptEn: 'How much are the tomatoes?', promptEs: '¿Cuánto cuestan los tomates?', answer: 'Two dollars a pound' },
        { id: 'l1q2', promptEn: 'How much is one mango?', promptEs: '¿Cuánto cuesta un mango?', answer: 'One dollar' },
        { id: 'l1q3', promptEn: 'What fruit does the customer not know?', promptEs: '¿Qué fruta no conoce el cliente?', answer: 'Dragon fruit' },
        { id: 'l1q4', promptEn: 'Is the dragon fruit sweet or sour?', promptEs: '¿La pitaya es dulce o agria?', answer: 'Sweet' },
      ],
    },
    {
      titleEn: 'Moving Day',
      titleEs: 'Día de mudanza',
      script: [
        { speaker: 'Ray', en: 'Are these boxes yours?' },
        { speaker: 'Kim', en: 'Yes, these are my boxes. They are books.' },
        { speaker: 'Ray', en: 'And that big box by the door?' },
        { speaker: 'Kim', en: 'That is my sister\'s box. It is her TV.' },
        { speaker: 'Ray', en: 'Where do I put those chairs?' },
        { speaker: 'Kim', en: 'Put those chairs here, in the kitchen, please.' },
      ],
      questions: [
        { id: 'l2q1', promptEn: 'What is in Kim\'s boxes?', promptEs: '¿Qué hay en las cajas de Kim?', answer: 'Books' },
        { id: 'l2q2', promptEn: 'Where is the big box?', promptEs: '¿Dónde está la caja grande?', answer: 'By the door' },
        { id: 'l2q3', promptEn: 'Whose TV is in the big box?', promptEs: '¿De quién es la televisión en la caja grande?', answer: 'Kim\'s sister\'s' },
        { id: 'l2q4', promptEn: 'Where do the chairs go?', promptEs: '¿Dónde van las sillas?', answer: 'In the kitchen' },
      ],
    },
  ],
  inPersonQuiz: [
    { id: 'iq1', kind: 'translate', promptEn: 'Write in English: "Esta es mi casa."', answer: 'This is my house.' },
    { id: 'iq2', kind: 'translate', promptEn: 'Write in English: "Esos son mis zapatos."', answer: 'Those are my shoes.' },
    { id: 'iq3', kind: 'translate', promptEn: 'Write in Spanish: "What is this?"', answer: '¿Qué es esto?' },
    { id: 'iq4', kind: 'translate', promptEn: 'Write in English: "Me gusta ese."', answer: 'I like that one.' },
    { id: 'iq5', kind: 'dictation', promptEn: 'These are my keys.', answer: 'These are my keys.' },
    { id: 'iq6', kind: 'dictation', promptEn: 'Is that your car?', answer: 'Is that your car?' },
    { id: 'iq7', kind: 'dictation', promptEn: 'I like this one.', answer: 'I like this one.' },
    { id: 'iq8', kind: 'short-answer', promptEn: 'Plural of "this"?', promptEs: '¿Plural de "this"?', answer: 'these' },
    { id: 'iq9', kind: 'short-answer', promptEn: 'Plural of "that"?', promptEs: '¿Plural de "that"?', answer: 'those' },
    { id: 'iq10', kind: 'short-answer', promptEn: '(Tutor points to an object far away.) What is that?', promptEs: '¿Qué es eso?', answer: 'That is a ___. (Answers will vary.)' },
  ],
}

export default module
