import type { Module } from '@/types'

const module: Module = {
  slug: 'possessives-and-reflexives',
  track: 'esl',
  titleEn: 'Possessives and Reflexives',
  titleEs: 'Posesivos y Reflexivos',
  descriptionEn: 'Learn how to say what belongs to you and talk about doing things yourself.',
  descriptionEs: 'Aprende a decir qué te pertenece y a hablar de hacer cosas tú mismo.',
  icon: 'Key',
  vocab: [
    { id: 'my', en: 'my', es: 'mi / mis',
      exampleEn: 'This is my house.', exampleEs: 'Esta es mi casa.' },
    { id: 'your', en: 'your', es: 'tu / tus',
      exampleEn: 'Is this your coat?', exampleEs: '¿Es tu abrigo?' },
    { id: 'his-her', en: 'his / her', es: 'su / sus (de él / de ella)',
      exampleEn: 'This is his car. That is her phone.', exampleEs: 'Este es su carro (de él). Ese es su teléfono (de ella).' },
    { id: 'our', en: 'our', es: 'nuestro / nuestra',
      exampleEn: 'This is our apartment.', exampleEs: 'Este es nuestro apartamento.' },
    { id: 'their', en: 'their', es: 'su / sus (de ellos)',
      exampleEn: 'That is their car.', exampleEs: 'Ese es su carro (de ellos).' },
    { id: 'mine', en: 'mine', es: 'mío / mía',
      exampleEn: 'This bag is mine.', exampleEs: 'Esta bolsa es mía.' },
    { id: 'marias-house', en: "Maria's house", es: 'la casa de María',
      exampleEn: "That is Maria's house.", exampleEs: 'Esa es la casa de María.' },
    { id: 'myself', en: 'myself', es: 'yo mismo / yo misma',
      exampleEn: 'I made this myself.', exampleEs: 'Hice esto yo mismo.' },
    { id: 'yourself', en: 'yourself', es: 'tú mismo / tú misma',
      exampleEn: 'Did you do this yourself?', exampleEs: '¿Hiciste esto tú mismo?' },
    { id: 'himself-herself', en: 'himself / herself', es: 'él mismo / ella misma',
      exampleEn: 'He fixed the car himself.', exampleEs: 'Él arregló el carro él mismo.' },
    { id: 'ourselves', en: 'ourselves', es: 'nosotros mismos',
      exampleEn: 'We cleaned the house ourselves.', exampleEs: 'Limpiamos la casa nosotros mismos.' },
    { id: 'themselves', en: 'themselves', es: 'ellos mismos',
      exampleEn: 'They painted the room themselves.', exampleEs: 'Ellos pintaron el cuarto ellos mismos.' },
    { id: 'by-myself', en: 'by myself', es: 'yo solo / yo sola',
      exampleEn: 'I live by myself.', exampleEs: 'Vivo yo solo.' },
    { id: 'whose-is-this', en: 'Whose is this?', es: '¿De quién es esto?',
      exampleEn: 'Whose is this jacket?', exampleEs: '¿De quién es esta chaqueta?' },
  ],
  grammar: [
    {
      titleEn: 'Possessive adjectives: my, your, his, her, our, their',
      titleEs: 'Adjetivos posesivos: my, your, his, her, our, their',
      explanationEn: 'A possessive adjective goes directly before a noun to show who it belongs to. It never stands alone — it always needs a noun right after it: my house, her phone, their car.',
      explanationEs: 'Un adjetivo posesivo va justo antes de un sustantivo para mostrar a quién pertenece. Nunca va solo — siempre necesita un sustantivo justo después: my house, her phone, their car.',
      examples: [
        { en: 'This is my house.', es: 'Esta es mi casa.' },
        { en: 'This is his car. That is her phone.', es: 'Este es su carro (de él). Ese es su teléfono (de ella).' },
        { en: 'That is their car.', es: 'Ese es su carro (de ellos).' },
      ],
    },
    {
      titleEn: '"Mine" and reflexive pronouns: myself, himself, ourselves',
      titleEs: '"Mine" y pronombres reflexivos: myself, himself, ourselves',
      explanationEn: '"Mine" replaces "my + noun" and stands alone with no noun after it: "This bag is mine" (not "This bag is mine bag"). Reflexive pronouns (myself, yourself, himself, herself, ourselves, themselves) show that someone did something alone, without help.',
      explanationEs: '"Mine" reemplaza "my + sustantivo" y va sola sin sustantivo después: "This bag is mine" (no "This bag is mine bag"). Los pronombres reflexivos (myself, yourself, himself, herself, ourselves, themselves) muestran que alguien hizo algo solo, sin ayuda.',
      examples: [
        { en: 'This bag is mine.', es: 'Esta bolsa es mía.' },
        { en: 'I made this myself.', es: 'Hice esto yo mismo.' },
        { en: 'We cleaned the house ourselves.', es: 'Limpiamos la casa nosotros mismos.' },
      ],
    },
  ],
  quiz: [
    { id: 'q1', type: 'multiple-choice', promptEn: '"Mi" (before a noun) in English is:', promptEs: '"Mi" (antes de un sustantivo) en inglés es:',
      answer: 'my', options: ['my', 'mine', 'me', 'I'] },
    { id: 'q2', type: 'multiple-choice', promptEn: 'Complete: "This bag is ___." (it belongs to me)', promptEs: 'Completa: "This bag is ___." (me pertenece)',
      answer: 'mine', options: ['mine', 'my', 'myself', 'I'] },
    { id: 'q3', type: 'multiple-choice', promptEn: '"Maria\'s house" means:', promptEs: '"Maria\'s house" significa:',
      answer: 'the house that belongs to Maria', options: ['the house that belongs to Maria', 'Maria is a house', 'Maria lives near a house', 'a house named Maria'] },
    { id: 'q4', type: 'multiple-choice', promptEn: '"Yo mismo" in English is:', promptEs: '"Yo mismo" en inglés es:',
      answer: 'myself', options: ['myself', 'my', 'mine', 'I'] },
    { id: 'q5', type: 'multiple-choice', promptEn: '"¿De quién es esto?" in English is:', promptEs: '"¿De quién es esto?" en inglés es:',
      answer: 'Whose is this?', options: ['Whose is this?', 'What is this?', 'Is this mine?', 'This is mine'] },
    { id: 'q6', type: 'multiple-choice', promptEn: 'Complete: "That is ___ car." (de ellos)', promptEs: 'Completa: "That is ___ car." (de ellos)',
      answer: 'their', options: ['their', 'they', 'them', 'theirs'] },
    { id: 'q7', type: 'multiple-choice', promptEn: 'Which word stands alone, with no noun after it?', promptEs: '¿Qué palabra va sola, sin sustantivo después?',
      answer: 'mine', options: ['mine', 'my', 'myself', 'I'] },
    { id: 'q8', type: 'multiple-choice', promptEn: '"Ella misma" in English is:', promptEs: '"Ella misma" en inglés es:',
      answer: 'herself', options: ['herself', 'himself', 'her', 'hers'] },
  ],
  teachingScenarios: [
    {
      label: 'Part 1: Talking about your things and family',
      text: 'Practice talking about your own belongings and family.',
      wordBank: [
        { en: 'his', es: 'su (de él)' },
        { en: 'her', es: 'su (de ella)' },
        { en: 'their', es: 'su (de ellos)' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: 'Is this your coat?', es: '¿Es tu abrigo?' },
          { speaker: 'student', en: 'Yes, this is my coat.', es: 'Sí, este es mi abrigo.' },
        ],
        [
          { speaker: 'tutor', en: 'Whose car is that, your brother\'s?', es: '¿De quién es ese carro, de tu hermano?' },
          { speaker: 'student', en: 'This is his car.', es: 'Este es su carro.' },
        ],
        [
          { speaker: 'tutor', en: "And the phone, your sister's?", es: '¿Y el teléfono, de tu hermana?' },
          { speaker: 'student', en: 'That is her phone.', es: 'Ese es su teléfono.' },
        ],
      ],
    },
    {
      label: 'Part 2: Asking whose something is',
      text: 'You find something that isn\'t yours. Practice asking whose it is.',
      chunks: [
        [
          { speaker: 'tutor', en: "I found a bag. You don't know whose it is.", es: 'Encontré una bolsa. No sabes de quién es.' },
          { speaker: 'student', en: 'Whose is this?', es: '¿De quién es esto?' },
        ],
        [
          { speaker: 'tutor', en: 'Is this jacket yours?', es: '¿Esta chaqueta es tuya?' },
          { speaker: 'student', en: 'No, this bag is mine.', es: 'No, esta bolsa es mía.' },
        ],
        [
          { speaker: 'tutor', en: 'I think the jacket belongs to Maria.', es: 'Creo que la chaqueta es de María.' },
          { speaker: 'student', en: "That is Maria's jacket.", es: 'Esa es la chaqueta de María.' },
        ],
      ],
    },
    {
      label: 'Part 3: Talking about doing things alone',
      text: 'Practice talking about things you did yourself.',
      wordBank: [
        { en: 'fixed my car', es: 'arreglé mi carro' },
        { en: 'made dinner', es: 'hice la cena' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: 'Did you do this yourself?', es: '¿Hiciste esto tú mismo?' },
          { speaker: 'student', en: 'Yes, I fixed my car myself.', es: 'Sí, arreglé mi carro yo mismo.' },
        ],
        [
          { speaker: 'tutor', en: 'Do you live with family, or by yourself?', es: '¿Vives con familia, o solo?' },
          { speaker: 'student', en: 'I live by myself.', es: 'Vivo yo solo.' },
        ],
      ],
    },
  ],
  practiceActivities: [
    {
      titleEn: 'Whose Is It?',
      titleEs: '¿De Quién Es?',
      instructionsEn: 'The tutor points to an object and asks whose it is.',
      instructionsEs: 'El tutor señala un objeto y pregunta de quién es.',
      chunks: [
        [
          { speaker: 'tutor', en: 'Whose is this?', es: '¿De quién es esto?' },
          { speaker: 'student', en: 'This is mine.', es: 'Esto es mío.' },
        ],
        [
          { speaker: 'tutor', en: 'Whose is that?', es: '¿De quién es eso?' },
          { speaker: 'student', en: 'That is yours.', es: 'Eso es tuyo.' },
        ],
      ],
    },
    {
      titleEn: 'Did You Do It Yourself?',
      titleEs: '¿Lo Hiciste Tú Mismo?',
      instructionsEn: 'The tutor asks if you did something alone.',
      instructionsEs: 'El tutor pregunta si hiciste algo solo.',
      wordBank: [
        { en: 'cooked', es: 'cociné' },
        { en: 'cleaned the house', es: 'limpié la casa' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: 'Did you cook this yourself?', es: '¿Cocinaste esto tú mismo?' },
          { speaker: 'student', en: 'Yes, I cooked it myself.', es: 'Sí, lo cociné yo mismo.' },
        ],
        [
          { speaker: 'tutor', en: 'Did you clean the house yourself?', es: '¿Limpiaste la casa tú mismo?' },
          { speaker: 'student', en: 'We cleaned it ourselves.', es: 'La limpiamos nosotros mismos.' },
        ],
      ],
    },
    {
      titleEn: 'Family Belongings',
      titleEs: 'Pertenencias de la Familia',
      instructionsEn: 'Describe an item that belongs to a family member.',
      instructionsEs: 'Describe un objeto que pertenece a un familiar.',
      chunks: [
        [
          { speaker: 'tutor', en: 'Tell me about your brother\'s things.', es: 'Cuéntame de las cosas de tu hermano.' },
          { speaker: 'student', en: 'This is his car.', es: 'Este es su carro.' },
        ],
        [
          { speaker: 'tutor', en: 'And your parents\' things?', es: '¿Y las cosas de tus padres?' },
          { speaker: 'student', en: 'That is their house.', es: 'Esa es su casa.' },
        ],
      ],
    },
  ],
  worksheet: [
    { id: 'w1', promptEn: 'This is ____ house.', promptEs: 'Esta es mi casa. (This is ____ house.)', answer: 'my' },
    { id: 'w2', promptEn: 'That book is ____.', promptEs: 'Ese libro es mío. (That book is ____.)', answer: 'mine' },
    { id: 'w3', promptEn: 'I made dinner ____.', promptEs: 'Hice la cena yo mismo. (I made dinner ____.)', answer: 'myself' },
    { id: 'w4', promptEn: '____ is this coat?', promptEs: '¿De quién es este abrigo? (____ is this coat?)', answer: 'Whose' },
    { id: 'w5', promptEn: 'They cleaned the house ____.', promptEs: 'Limpiaron la casa ellos mismos. (They cleaned the house ____.)', answer: 'themselves' },
  ],
  classWorksheet: [
    { id: 'cw1', promptEn: 'Carlos lost ____ wallet. (de él)', promptEs: 'Carlos perdió su cartera. (Carlos lost ____ wallet.)', answer: 'his' },
    { id: 'cw2', promptEn: 'Ana is with ____ mother. (de ella)', promptEs: 'Ana está con su mamá. (Ana is with ____ mother.)', answer: 'her' },
    { id: 'cw3', promptEn: 'We love ____ new apartment.', promptEs: 'Nos encanta nuestro apartamento nuevo. (We love ____ new apartment.)', answer: 'our' },
    { id: 'cw4', promptEn: 'The kids have ____ toys.', promptEs: 'Los niños tienen sus juguetes. (The kids have ____ toys.)', answer: 'their' },
    { id: 'cw5', promptEn: 'Is this ____ phone? (de ti)', promptEs: '¿Es este tu teléfono? (Is this ____ phone?)', answer: 'your' },
    { id: 'cw6', promptEn: 'This is ____ car. (de Maria)', promptEs: 'Este es el carro de María. (This is ____ car.)', answer: "Maria's" },
    { id: 'cw7', promptEn: 'She cut ____ in the kitchen.', promptEs: 'Ella se cortó en la cocina. (She cut ____ in the kitchen.)', answer: 'herself' },
    { id: 'cw8', promptEn: 'I live by ____.', promptEs: 'Vivo solo. (I live by ____.)', answer: 'myself' },
  ],
  listening: [
    {
      titleEn: 'Lost and Found',
      titleEs: 'Objetos perdidos',
      script: [
        { speaker: 'Teacher', en: 'Whose umbrella is this?' },
        { speaker: 'Lucia', en: 'It is not mine. Maybe it is Pedro\'s.' },
        { speaker: 'Pedro', en: 'Yes, it is mine! Thank you.' },
        { speaker: 'Teacher', en: 'And whose jacket is this?' },
        { speaker: 'Lucia', en: 'That is my sister\'s jacket. Her name is Rosa.' },
        { speaker: 'Teacher', en: 'Please give it to her. And these keys?' },
        { speaker: 'Pedro', en: 'Those are our keys. Mine and my wife\'s.' },
      ],
      questions: [
        { id: 'l1q1', promptEn: 'Whose umbrella is it?', promptEs: '¿De quién es el paraguas?', answer: 'Pedro\'s' },
        { id: 'l1q2', promptEn: 'Whose jacket is it?', promptEs: '¿De quién es la chaqueta?', answer: 'Lucia\'s sister\'s (Rosa\'s)' },
        { id: 'l1q3', promptEn: 'What is the name of Lucia\'s sister?', promptEs: '¿Cómo se llama la hermana de Lucía?', answer: 'Rosa' },
        { id: 'l1q4', promptEn: 'Whose keys are they?', promptEs: '¿De quién son las llaves?', answer: 'Pedro and his wife\'s' },
      ],
    },
    {
      titleEn: 'I Did It Myself',
      titleEs: 'Lo hice yo mismo',
      script: [
        { speaker: 'Beto', en: 'Your kitchen is beautiful! Who painted it?' },
        { speaker: 'Luz', en: 'I painted it myself.' },
        { speaker: 'Beto', en: 'Wow! And the table?' },
        { speaker: 'Luz', en: 'My husband made it himself.' },
        { speaker: 'Beto', en: 'Do your kids help?' },
        { speaker: 'Luz', en: 'Yes. They clean their rooms by themselves now.' },
      ],
      questions: [
        { id: 'l2q1', promptEn: 'Who painted the kitchen?', promptEs: '¿Quién pintó la cocina?', answer: 'Luz (she painted it herself)' },
        { id: 'l2q2', promptEn: 'Who made the table?', promptEs: '¿Quién hizo la mesa?', answer: 'Her husband' },
        { id: 'l2q3', promptEn: 'What do the kids clean?', promptEs: '¿Qué limpian los niños?', answer: 'Their rooms' },
        { id: 'l2q4', promptEn: 'Do the kids need help to clean?', promptEs: '¿Los niños necesitan ayuda para limpiar?', answer: 'No. They clean by themselves.' },
      ],
    },
  ],
  inPersonQuiz: [
    { id: 'iq1', kind: 'translate', promptEn: 'Write in English: "Es mío."', answer: 'It is mine.' },
    { id: 'iq2', kind: 'translate', promptEn: 'Write in English: "su casa (de ellos)"', answer: 'their house' },
    { id: 'iq3', kind: 'translate', promptEn: 'Write in Spanish: "Whose book is this?"', answer: '¿De quién es este libro?' },
    { id: 'iq4', kind: 'translate', promptEn: 'Write in English: "Lo hice yo mismo."', answer: 'I did it myself.' },
    { id: 'iq5', kind: 'dictation', promptEn: 'This is my brother\'s car.', answer: 'This is my brother\'s car.' },
    { id: 'iq6', kind: 'dictation', promptEn: 'Our house is small.', answer: 'Our house is small.' },
    { id: 'iq7', kind: 'dictation', promptEn: 'She lives by herself.', answer: 'She lives by herself.' },
    { id: 'iq8', kind: 'short-answer', promptEn: 'Complete: "He hurt ___."', promptEs: 'Completa: "He hurt ___."', answer: 'himself' },
    { id: 'iq9', kind: 'short-answer', promptEn: 'Complete: "This bag is not yours. It is ___." (de mí)', promptEs: 'Completa: "It is ___." (de mí)', answer: 'mine' },
    { id: 'iq10', kind: 'short-answer', promptEn: 'What is your mother\'s name?', promptEs: '¿Cómo se llama tu mamá?', answer: 'My mother\'s name is ___. (Answers will vary.)' },
  ],
}

export default module
