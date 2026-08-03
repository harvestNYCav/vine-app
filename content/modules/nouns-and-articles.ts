import type { Module } from '@/types'

const module: Module = {
  slug: 'nouns-and-articles',
  track: 'esl',
  titleEn: 'Nouns and Articles',
  titleEs: 'Sustantivos y Artículos',
  descriptionEn: 'Learn how to name things and use "a," "an," and "the" correctly.',
  descriptionEs: 'Aprende a nombrar cosas y a usar "a," "an" y "the" correctamente.',
  icon: 'Tag',
  vocab: [
    { id: 'a-an', en: 'a / an', es: 'un / una',
      exampleEn: 'I have a book. She has an apple.', exampleEs: 'Tengo un libro. Ella tiene una manzana.' },
    { id: 'the', en: 'the', es: 'el / la / los / las',
      exampleEn: 'The book is on the table.', exampleEs: 'El libro está en la mesa.' },
    { id: 'book-books', en: 'book / books', es: 'el libro / los libros',
      exampleEn: 'I have three books.', exampleEs: 'Tengo tres libros.' },
    { id: 'apple-apples', en: 'an apple / apples', es: 'una manzana / manzanas',
      exampleEn: 'I eat an apple every day.', exampleEs: 'Como una manzana todos los días.' },
    { id: 'house', en: 'house', es: 'la casa',
      exampleEn: 'This is a beautiful house.', exampleEs: 'Esta es una casa hermosa.' },
    { id: 'car', en: 'car', es: 'el carro / el coche',
      exampleEn: 'I need to buy a car.', exampleEs: 'Necesito comprar un carro.' },
    { id: 'woman-women', en: 'woman / women', es: 'la mujer / las mujeres',
      exampleEn: 'That woman is my teacher.', exampleEs: 'Esa mujer es mi maestra.' },
    { id: 'man-men', en: 'man / men', es: 'el hombre / los hombres',
      exampleEn: 'The men are working outside.', exampleEs: 'Los hombres están trabajando afuera.' },
    { id: 'child-children', en: 'child / children', es: 'el niño / los niños',
      exampleEn: 'The children are playing.', exampleEs: 'Los niños están jugando.' },
    { id: 'this-is-a', en: 'This is a...', es: 'Esto es un/una...',
      exampleEn: 'This is a good school.', exampleEs: 'Esta es una buena escuela.' },
    { id: 'these-are', en: 'These are...', es: 'Estos son... / Estas son...',
      exampleEn: 'These are my documents.', exampleEs: 'Estos son mis documentos.' },
    { id: 'some', en: 'some', es: 'algunos / algunas / un poco de',
      exampleEn: 'I need some help.', exampleEs: 'Necesito un poco de ayuda.' },
    { id: 'water', en: 'water', es: 'el agua',
      exampleEn: 'Can I have some water, please?', exampleEs: '¿Me puede dar agua, por favor?' },
    { id: 'money', en: 'money', es: 'el dinero',
      exampleEn: "I don't have much money.", exampleEs: 'No tengo mucho dinero.' },
  ],
  grammar: [
    {
      titleEn: '"a" vs "an": listen to the sound, not the letter',
      titleEs: '"a" vs "an": escucha el sonido, no la letra',
      explanationEn: 'Use "an" when the next word starts with a vowel sound (a, e, i, o, u) and "a" when it starts with a consonant sound. This is about sound, not spelling: an apple, a car, an umbrella, a house.',
      explanationEs: 'Usa "an" cuando la siguiente palabra empieza con un sonido de vocal (a, e, i, o, u) y "a" cuando empieza con un sonido de consonante. Esto se trata del sonido, no de la ortografía: an apple, a car, an umbrella, a house.',
      examples: [
        { en: 'I have a book. She has an apple.', es: 'Tengo un libro. Ella tiene una manzana.' },
        { en: 'I need to buy a car.', es: 'Necesito comprar un carro.' },
      ],
    },
    {
      titleEn: 'Irregular plurals: child, woman, man',
      titleEs: 'Plurales irregulares: child, woman, man',
      explanationEn: 'Most nouns just add "-s" for the plural (book → books). But a few common nouns change completely: child becomes children, woman becomes women, and man becomes men. These are worth memorizing since they come up often.',
      explanationEs: 'La mayoría de los sustantivos solo agregan "-s" para el plural (book → books). Pero algunos sustantivos comunes cambian completamente: child se convierte en children, woman se convierte en women, y man se convierte en men. Vale la pena memorizarlos porque aparecen con frecuencia.',
      examples: [
        { en: 'I have three books.', es: 'Tengo tres libros.' },
        { en: 'The children are playing.', es: 'Los niños están jugando.' },
        { en: 'The men are working outside.', es: 'Los hombres están trabajando afuera.' },
      ],
    },
  ],
  quiz: [
    { id: 'q1', type: 'multiple-choice', promptEn: 'Complete: "I have ___ book."', promptEs: 'Completa: "I have ___ book."',
      answer: 'a', options: ['a', 'an', 'the', 'some'] },
    { id: 'q2', type: 'multiple-choice', promptEn: 'Which word goes before "apple"?', promptEs: '¿Qué palabra va antes de "apple"?',
      answer: 'an', options: ['an', 'a', 'the', 'some'] },
    { id: 'q3', type: 'multiple-choice', promptEn: 'The plural of "child" is:', promptEs: 'El plural de "child" es:',
      answer: 'children', options: ['children', 'childs', 'childrens', 'child'] },
    { id: 'q4', type: 'multiple-choice', promptEn: 'The plural of "woman" is:', promptEs: 'El plural de "woman" es:',
      answer: 'women', options: ['women', 'womans', 'womens', 'woman'] },
    { id: 'q5', type: 'multiple-choice', promptEn: '"El agua" in English is:', promptEs: '"El agua" en inglés es:',
      answer: 'water', options: ['water', 'money', 'house', 'book'] },
    { id: 'q6', type: 'multiple-choice', promptEn: 'Which word uses "a," not "an"?', promptEs: '¿Qué palabra usa "a," no "an"?',
      answer: 'car', options: ['car', 'apple', 'umbrella', 'orange'] },
    { id: 'q7', type: 'multiple-choice', promptEn: 'The plural of "man" is:', promptEs: 'El plural de "man" es:',
      answer: 'men', options: ['men', 'mans', 'mens', 'man'] },
    { id: 'q8', type: 'multiple-choice', promptEn: 'Complete: "___ book is on the table." (a specific book you already mentioned)', promptEs: 'Completa: "___ book is on the table." (un libro específico que ya mencionaste)',
      answer: 'The', options: ['The', 'A', 'An', 'Some'] },
  ],
  teachingScenarios: [
    { label: 'Part 1: At the library',
      text: 'You are at the library looking for a book.',
      wordBank: [
        { en: 'New York', es: 'Nueva York' },
        { en: 'cooking', es: 'cocina' },
        { en: 'gardening', es: 'jardinería' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: 'Can I help you find a book?', es: '¿Puedo ayudarte a encontrar un libro?' },
          { speaker: 'student', en: "I'm looking for a book about New York.", es: 'Busco un libro sobre Nueva York.' },
        ],
        [
          { speaker: 'tutor', en: 'Here is a good book for that.', es: 'Aquí hay un buen libro para eso.' },
          { speaker: 'student', en: 'Thank you! Do you have an English dictionary?', es: '¡Gracias! ¿Tiene un diccionario de inglés?' },
        ],
        [
          { speaker: 'tutor', en: 'Yes, right here. Enjoy the books!', es: 'Sí, aquí está. ¡Disfruta los libros!' },
          { speaker: 'student', en: 'Thank you very much.', es: 'Muchas gracias.' },
        ],
      ] },
    { label: 'Part 2: Talking about people you know',
      text: 'Talk about the people in your building.',
      wordBank: [
        { en: 'ten', es: 'diez' },
        { en: 'five', es: 'cinco' },
        { en: 'twenty', es: 'veinte' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: 'Tell me about your building.', es: 'Cuéntame sobre tu edificio.' },
          { speaker: 'student', en: 'The children play outside every day.', es: 'Los niños juegan afuera todos los días.' },
        ],
        [
          { speaker: 'tutor', en: 'How many children live there?', es: '¿Cuántos niños viven ahí?' },
          { speaker: 'student', en: 'Ten children.', es: 'Diez niños.' },
        ],
        [
          { speaker: 'tutor', en: 'And the women and men — are they friendly?', es: '¿Y las mujeres y los hombres son amables?' },
          { speaker: 'student', en: 'Yes, very kind.', es: 'Sí, muy amables.' },
        ],
      ] },
    { label: 'Part 3: Everyday requests at home',
      text: 'Practice simple requests using "some."',
      wordBank: [
        { en: 'water', es: 'agua' },
        { en: 'help', es: 'ayuda' },
        { en: 'money', es: 'dinero' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: 'Can I help you?', es: '¿Puedo ayudarte?' },
          { speaker: 'student', en: 'Can I have some water, please?', es: '¿Me puede dar agua, por favor?' },
        ],
        [
          { speaker: 'tutor', en: 'Of course. Do you need anything else?', es: 'Claro. ¿Necesitas algo más?' },
          { speaker: 'student', en: 'I need some help.', es: 'Necesito un poco de ayuda.' },
        ],
        [
          { speaker: 'tutor', en: 'No problem.', es: 'No hay problema.' },
          { speaker: 'student', en: "I don't have much money right now.", es: 'No tengo mucho dinero ahora mismo.' },
        ],
      ] },
  ],
  practiceActivities: [
    {
      titleEn: 'A or An?',
      titleEs: '¿A o An?',
      instructionsEn: 'Your tutor says a word. Say "a" or "an" before it.',
      instructionsEs: 'Tu tutor dice una palabra. Di "a" o "an" antes de ella.',
      wordBank: [
        { en: 'apple', es: 'manzana' },
        { en: 'car', es: 'carro' },
        { en: 'umbrella', es: 'paraguas' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: 'Apple.', es: 'Manzana.' },
          { speaker: 'student', en: 'An apple.', es: 'Una manzana.' },
        ],
        [
          { speaker: 'tutor', en: 'Car.', es: 'Carro.' },
          { speaker: 'student', en: 'A car.', es: 'Un carro.' },
        ],
      ],
    },
    {
      titleEn: "Describe What's Around You",
      titleEs: 'Describe lo que te Rodea',
      instructionsEn: 'Name something you see, then describe it using "the."',
      instructionsEs: 'Nombra algo que ves, y luego descríbelo usando "the."',
      wordBank: [
        { en: 'book', es: 'libro' },
        { en: 'chair', es: 'silla' },
        { en: 'table', es: 'mesa' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: 'What do you see?', es: '¿Qué ves?' },
          { speaker: 'student', en: 'I see a book.', es: 'Veo un libro.' },
        ],
        [
          { speaker: 'tutor', en: 'Tell me more.', es: 'Cuéntame más.' },
          { speaker: 'student', en: 'The book is red.', es: 'El libro es rojo.' },
        ],
      ],
    },
    {
      titleEn: 'Plural Challenge',
      titleEs: 'Reto de Plurales',
      instructionsEn: 'Your tutor says one person. Say the group.',
      instructionsEs: 'Tu tutor dice una persona. Di el grupo.',
      chunks: [
        [
          { speaker: 'tutor', en: 'One child.', es: 'Un niño.' },
          { speaker: 'student', en: 'Three children.', es: 'Tres niños.' },
        ],
        [
          { speaker: 'tutor', en: 'One woman.', es: 'Una mujer.' },
          { speaker: 'student', en: 'Two women.', es: 'Dos mujeres.' },
        ],
      ],
    },
  ],
  worksheet: [
    { id: 'w1', promptEn: 'I have ____ apple.', promptEs: 'Tengo una manzana. (I have ____ apple.)', answer: 'an' },
    { id: 'w2', promptEn: 'I have ____ book.', promptEs: 'Tengo un libro. (I have ____ book.)', answer: 'a' },
    { id: 'w3', promptEn: '____ book is on the table.', promptEs: 'El libro está en la mesa. (____ book is on the table.)', answer: 'The' },
    { id: 'w4', promptEn: 'The ____ are playing outside.', promptEs: 'Los niños están jugando afuera. (The ____ are playing outside.)', answer: 'children' },
    { id: 'w5', promptEn: 'Can I have ____ water?', promptEs: '¿Me puede dar agua? (Can I have ____ water?)', answer: 'some' },
  ],
}

export default module
