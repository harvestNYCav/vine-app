import type { Module } from '@/types'

const module: Module = {
  slug: 'likes-and-dislikes',
  track: 'esl',
  titleEn: 'Likes and Dislikes',
  titleEs: 'Gustos y Disgustos',
  descriptionEn: 'Learn how to talk about what you like, love, and don\'t like.',
  descriptionEs: 'Aprende a hablar de lo que te gusta, te encanta y no te gusta.',
  icon: 'Heart',
  vocab: [
    { id: 'i-like', en: 'I like...', es: 'Me gusta...',
      exampleEn: 'I like coffee.', exampleEs: 'Me gusta el café.' },
    { id: 'i-dont-like', en: "I don't like...", es: 'No me gusta...',
      exampleEn: "I don't like spicy food.", exampleEs: 'No me gusta la comida picante.' },
    { id: 'i-love', en: 'I love...', es: 'Me encanta...',
      exampleEn: 'I love dancing.', exampleEs: 'Me encanta bailar.' },
    { id: 'i-hate', en: "I don't like ... at all", es: 'No me gusta nada...',
      exampleEn: "I don't like the cold at all.", exampleEs: 'No me gusta nada el frío.' },
    { id: 'i-prefer', en: 'I prefer...', es: 'Prefiero...',
      exampleEn: 'I prefer tea over coffee.', exampleEs: 'Prefiero el té sobre el café.' },
    { id: 'do-you-like', en: 'Do you like...?', es: '¿Te gusta...?',
      exampleEn: 'Do you like pizza?', exampleEs: '¿Te gusta la pizza?' },
    { id: 'my-favorite', en: 'my favorite...', es: 'mi favorito / mi favorita',
      exampleEn: 'My favorite food is rice and beans.', exampleEs: 'Mi comida favorita es arroz con frijoles.' },
    { id: 'i-really-like', en: 'I really like...', es: 'Me gusta mucho...',
      exampleEn: 'I really like this neighborhood.', exampleEs: 'Me gusta mucho este vecindario.' },
    { id: 'i-like-it-a-lot', en: 'I like it a lot', es: 'Me gusta mucho',
      exampleEn: 'I tried this dish and I like it a lot.', exampleEs: 'Probé este plato y me gusta mucho.' },
    { id: 'i-dont-like-it-at-all', en: "I don't like it at all", es: 'No me gusta para nada',
      exampleEn: "I tried it, but I don't like it at all.", exampleEs: 'Lo probé, pero no me gusta para nada.' },
    { id: 'what-do-you-like', en: 'What do you like?', es: '¿Qué te gusta?',
      exampleEn: 'What do you like to do on weekends?', exampleEs: '¿Qué te gusta hacer los fines de semana?' },
    { id: 'i-like-this-food', en: 'I like this food', es: 'Me gusta esta comida',
      exampleEn: 'I like this food a lot.', exampleEs: 'Me gusta mucho esta comida.' },
    { id: 'she-likes-he-likes', en: 'she likes / he likes', es: 'a ella le gusta / a él le gusta',
      exampleEn: 'He likes soccer. She likes music.', exampleEs: 'A él le gusta el fútbol. A ella le gusta la música.' },
    { id: 'me-too-me-neither', en: 'Me too / Me neither', es: 'A mí también / A mí tampoco',
      exampleEn: '"I like coffee." "Me too!"', exampleEs: '"Me gusta el café." "¡A mí también!"' },
  ],
  grammar: [
    {
      titleEn: 'like/love + noun or -ing, and "likes" for he/she',
      titleEs: 'like/love + sustantivo o -ing, y "likes" para he/she',
      explanationEn: 'You can follow "like" or "love" with a noun (I like coffee) or with a verb ending in "-ing" (I love dancing) — both are correct. Remember to add "-s" for he/she: he likes, she likes.',
      explanationEs: 'Puedes usar "like" o "love" seguido de un sustantivo (I like coffee) o de un verbo terminado en "-ing" (I love dancing) — ambos son correctos. Recuerda agregar "-s" para he/she: he likes, she likes.',
      examples: [
        { en: 'I like coffee.', es: 'Me gusta el café.' },
        { en: 'I love dancing.', es: 'Me encanta bailar.' },
        { en: 'He likes soccer. She likes music.', es: 'A él le gusta el fútbol. A ella le gusta la música.' },
      ],
    },
    {
      titleEn: 'Agreeing: Me too / Me neither',
      titleEs: 'Estar de acuerdo: Me too / Me neither',
      explanationEn: 'Use "Me too" to agree with a positive statement (something someone likes). Use "Me neither" to agree with a negative statement (something someone doesn\'t like).',
      explanationEs: 'Usa "Me too" para estar de acuerdo con una afirmación positiva (algo que a alguien le gusta). Usa "Me neither" para estar de acuerdo con una afirmación negativa (algo que a alguien no le gusta).',
      examples: [
        { en: '"I like coffee." "Me too!"', es: '"Me gusta el café." "¡A mí también!"' },
        { en: '"I don\'t like the cold." "Me neither."', es: '"No me gusta el frío." "A mí tampoco."' },
      ],
    },
  ],
  quiz: [
    { id: 'q1', type: 'multiple-choice', promptEn: '"Me gusta" in English is:', promptEs: '"Me gusta" en inglés es:',
      answer: 'I like', options: ['I like', "I don't like", 'I love', 'I prefer'] },
    { id: 'q2', type: 'multiple-choice', promptEn: '"No me gusta" in English is:', promptEs: '"No me gusta" en inglés es:',
      answer: "I don't like", options: ["I don't like", 'I like', 'I love', 'I prefer'] },
    { id: 'q3', type: 'multiple-choice', promptEn: 'Complete: "She ___ coffee."', promptEs: 'Completa: "She ___ coffee." (le gusta)',
      answer: 'likes', options: ['likes', 'like', 'liking', 'to like'] },
    { id: 'q4', type: 'multiple-choice', promptEn: '"¿Te gusta la pizza?" in English is:', promptEs: '"¿Te gusta la pizza?" en inglés es:',
      answer: 'Do you like pizza?', options: ['Do you like pizza?', 'You like pizza?', 'I like pizza', 'Are you pizza?'] },
    { id: 'q5', type: 'multiple-choice', promptEn: '"A mí también" in English is:', promptEs: '"A mí también" en inglés es:',
      answer: 'Me too', options: ['Me too', 'Me neither', 'I like it', 'I prefer it'] },
    { id: 'q6', type: 'multiple-choice', promptEn: 'Complete: "He ___ soccer."', promptEs: 'Completa: "He ___ soccer."',
      answer: 'likes', options: ['likes', 'like', 'liking', 'to like'] },
    { id: 'q7', type: 'multiple-choice', promptEn: 'Which response agrees with "I don\'t like spicy food"?', promptEs: '¿Qué respuesta está de acuerdo con "I don\'t like spicy food"?',
      answer: 'Me neither', options: ['Me neither', 'Me too', 'I like it', 'I prefer it'] },
    { id: 'q8', type: 'multiple-choice', promptEn: '"Prefiero el té" in English is:', promptEs: '"Prefiero el té" en inglés es:',
      answer: 'I prefer tea', options: ['I prefer tea', 'I like tea', 'I love tea', "I don't like tea"] },
  ],
  teachingScenarios: [
    {
      label: 'Part 1: Talking about food',
      text: 'You are at a restaurant. Practice saying what food you like and don\'t like.',
      wordBank: [
        { en: 'coffee', es: 'café' },
        { en: 'tea', es: 'té' },
        { en: 'spicy food', es: 'comida picante' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: 'Do you like spicy food?', es: '¿Te gusta la comida picante?' },
          { speaker: 'student', en: "I don't like spicy food.", es: 'No me gusta la comida picante.' },
        ],
        [
          { speaker: 'tutor', en: 'Do you like coffee?', es: '¿Te gusta el café?' },
          { speaker: 'student', en: 'I like coffee.', es: 'Me gusta el café.' },
        ],
        [
          { speaker: 'tutor', en: 'Do you prefer tea or coffee?', es: '¿Prefieres el té o el café?' },
          { speaker: 'student', en: 'I prefer tea.', es: 'Prefiero el té.' },
        ],
      ],
    },
    {
      label: 'Part 2: Talking about hobbies',
      text: 'Practice talking about what you like to do in your free time.',
      wordBank: [
        { en: 'dancing', es: 'bailar' },
        { en: 'music', es: 'la música' },
        { en: 'soccer', es: 'el fútbol' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: 'What do you like to do on weekends?', es: '¿Qué te gusta hacer los fines de semana?' },
          { speaker: 'student', en: 'I love dancing.', es: 'Me encanta bailar.' },
        ],
        [
          { speaker: 'tutor', en: 'Do you like music too?', es: '¿Te gusta la música también?' },
          { speaker: 'student', en: 'I like it a lot.', es: 'Me gusta mucho.' },
        ],
      ],
    },
    {
      label: 'Part 3: Agreeing and sharing favorites',
      text: 'Practice agreeing with someone using "Me too" or "Me neither."',
      chunks: [
        [
          { speaker: 'tutor', en: 'I like coffee.', es: 'Me gusta el café.' },
          { speaker: 'student', en: 'Me too!', es: '¡A mí también!' },
        ],
        [
          { speaker: 'tutor', en: "I don't like spicy food.", es: 'No me gusta la comida picante.' },
          { speaker: 'student', en: 'Me neither.', es: 'A mí tampoco.' },
        ],
        [
          { speaker: 'tutor', en: 'What is your favorite food?', es: '¿Cuál es tu comida favorita?' },
          { speaker: 'student', en: 'Rice and beans.', es: 'Arroz con frijoles.' },
        ],
      ],
    },
  ],
  practiceActivities: [
    {
      titleEn: 'Favorites Interview',
      titleEs: 'Entrevista de Favoritos',
      instructionsEn: 'Ask your tutor about their favorite food and season.',
      instructionsEs: 'Pregúntale a tu tutor sobre su comida y estación favorita.',
      wordBank: [
        { en: 'summer', es: 'verano' },
        { en: 'winter', es: 'invierno' },
      ],
      chunks: [
        [
          { speaker: 'student', en: 'What do you like to eat?', es: '¿Qué te gusta comer?' },
          { speaker: 'tutor', en: 'I like pizza.', es: 'Me gusta la pizza.' },
        ],
        [
          { speaker: 'student', en: 'Do you like summer?', es: '¿Te gusta el verano?' },
          { speaker: 'tutor', en: 'I love summer.', es: 'Me encanta el verano.' },
        ],
      ],
    },
    {
      titleEn: 'Agree or Disagree',
      titleEs: 'De Acuerdo o en Desacuerdo',
      instructionsEn: 'The tutor says something they like or don\'t like. Say if you agree.',
      instructionsEs: 'El tutor dice algo que le gusta o no le gusta. Di si estás de acuerdo.',
      chunks: [
        [
          { speaker: 'tutor', en: "I don't like cold weather.", es: 'No me gusta el frío.' },
          { speaker: 'student', en: 'Me neither.', es: 'A mí tampoco.' },
        ],
        [
          { speaker: 'tutor', en: 'I love weekends.', es: 'Me encantan los fines de semana.' },
          { speaker: 'student', en: 'Me too!', es: '¡A mí también!' },
        ],
      ],
    },
    {
      titleEn: 'Describe Someone You Know',
      titleEs: 'Describe a Alguien que Conoces',
      instructionsEn: 'Describe what a family member likes, using "he" or "she."',
      instructionsEs: 'Describe lo que le gusta a un familiar, usando "he" o "she."',
      chunks: [
        [
          { speaker: 'tutor', en: 'What does your brother like?', es: '¿Qué le gusta a tu hermano?' },
          { speaker: 'student', en: 'He likes soccer.', es: 'A él le gusta el fútbol.' },
        ],
        [
          { speaker: 'tutor', en: 'What does your sister like?', es: '¿Qué le gusta a tu hermana?' },
          { speaker: 'student', en: 'She likes music.', es: 'A ella le gusta la música.' },
        ],
      ],
    },
  ],
  worksheet: [
    { id: 'w1', promptEn: 'I ____ coffee.', promptEs: 'Me gusta el café. (I ____ coffee.)', answer: 'like' },
    { id: 'w2', promptEn: 'She ____ tea.', promptEs: 'A ella le gusta el té. (She ____ tea.)', answer: 'likes' },
    { id: 'w3', promptEn: "I don't ____ spicy food.", promptEs: 'No me gusta la comida picante. (I don\'t ____ spicy food.)', answer: 'like' },
    { id: 'w4', promptEn: '____ you like pizza?', promptEs: '¿Te gusta la pizza? (____ you like pizza?)', answer: 'Do' },
    { id: 'w5', promptEn: 'I ____ dancing.', promptEs: 'Me encanta bailar. (I ____ dancing.)', answer: 'love' },
  ],
}

export default module
