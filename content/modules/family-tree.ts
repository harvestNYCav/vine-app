import type { Module } from '@/types'

const module: Module = {
  slug: 'family-tree',
  track: 'esl',
  titleEn: 'Family',
  titleEs: 'La Familia',
  descriptionEn: 'Learn how to talk about your family members in English.',
  descriptionEs: 'Aprende a hablar de los miembros de tu familia en inglés.',
  icon: 'Users',
  vocab: [
    {
      id: 'mother',
      en: 'mother / mom',
      es: 'la madre / mamá',
      exampleEn: 'My mother is a great cook.',
      exampleEs: 'Mi mamá cocina muy bien.',
    },
    {
      id: 'father',
      en: 'father / dad',
      es: 'el padre / papá',
      exampleEn: 'My father works in construction.',
      exampleEs: 'Mi papá trabaja en construcción.',
    },
    {
      id: 'brother',
      en: 'brother',
      es: 'el hermano',
      exampleEn: 'I have two brothers and one sister.',
      exampleEs: 'Tengo dos hermanos y una hermana.',
    },
    {
      id: 'sister',
      en: 'sister',
      es: 'la hermana',
      exampleEn: 'My sister lives in the Bronx.',
      exampleEs: 'Mi hermana vive en el Bronx.',
    },
    {
      id: 'son',
      en: 'son',
      es: 'el hijo',
      exampleEn: 'My son is seven years old.',
      exampleEs: 'Mi hijo tiene siete años.',
    },
    {
      id: 'daughter',
      en: 'daughter',
      es: 'la hija',
      exampleEn: 'My daughter is learning English at school.',
      exampleEs: 'Mi hija está aprendiendo inglés en la escuela.',
    },
    {
      id: 'grandparents',
      en: 'grandparents',
      es: 'los abuelos',
      exampleEn: 'My grandparents stayed in Mexico.',
      exampleEs: 'Mis abuelos se quedaron en México.',
    },
    {
      id: 'i-have',
      en: 'I have... / I don\'t have...',
      es: 'Tengo... / No tengo...',
      exampleEn: 'I have three children. I don\'t have any brothers.',
      exampleEs: 'Tengo tres hijos. No tengo hermanos.',
    },
    {
      id: 'husband-wife',
      en: 'husband / wife',
      es: 'el esposo / la esposa',
      exampleEn: 'My husband works in Manhattan.',
      exampleEs: 'Mi esposo trabaja en Manhattan.',
    },
    {
      id: 'children',
      en: 'children / kids',
      es: 'los hijos / los niños',
      exampleEn: 'I have three children.',
      exampleEs: 'Tengo tres hijos.',
    },
    {
      id: 'cousin',
      en: 'cousin',
      es: 'el primo / la prima',
      exampleEn: 'My cousin lives in Brooklyn.',
      exampleEs: 'Mi primo vive en Brooklyn.',
    },
    {
      id: 'aunt-uncle',
      en: 'aunt / uncle',
      es: 'la tía / el tío',
      exampleEn: 'My aunt and uncle came to visit.',
      exampleEs: 'Mi tía y mi tío vinieron de visita.',
    },
    {
      id: 'baby',
      en: 'baby',
      es: 'el bebé',
      exampleEn: 'My baby is one year old.',
      exampleEs: 'Mi bebé tiene un año.',
    },
    {
      id: 'how-many-children',
      en: 'How many children do you have?',
      es: '¿Cuántos hijos tienes?',
      exampleEn: 'How many children do you have? I have two.',
      exampleEs: '¿Cuántos hijos tienes? Tengo dos.',
    },
  ],
  grammar: [
    {
      titleEn: '"I have" / "I don\'t have" + family member',
      titleEs: '"I have" / "I don\'t have" + familiar',
      explanationEn: 'Use "I have..." to say who is in your family, and "I don\'t have any..." to say you don\'t have a certain family member. Add "-s" to make family words plural when there\'s more than one.',
      explanationEs: 'Usa "I have..." para decir quién está en tu familia, y "I don\'t have any..." para decir que no tienes cierto familiar. Agrega "-s" para hacer plurales las palabras de familia cuando hay más de uno.',
      examples: [
        { en: 'I have two brothers and one sister.', es: 'Tengo dos hermanos y una hermana.' },
        { en: "I don't have any brothers.", es: 'No tengo hermanos.' },
      ],
    },
    {
      titleEn: 'Asking "How many...?"',
      titleEs: 'Preguntar "How many...?"',
      explanationEn: '"How many" + a plural noun + "do you have?" asks for a count. Answer with "I have" + the number.',
      explanationEs: '"How many" + un sustantivo plural + "do you have?" pregunta por una cantidad. Responde con "I have" + el número.',
      examples: [
        { en: 'How many children do you have? I have two.', es: '¿Cuántos hijos tienes? Tengo dos.' },
      ],
    },
  ],
  quiz: [
    {
      id: 'q1',
      type: 'multiple-choice',
      promptEn: '"La hermana" in English is:',
      promptEs: '"La hermana" en inglés es:',
      answer: 'sister',
      options: ['sister', 'daughter', 'mother', 'aunt'],
    },
    {
      id: 'q2',
      type: 'multiple-choice',
      promptEn: '"My son is seven years old" means:',
      promptEs: '"My son is seven years old" significa:',
      answer: 'Mi hijo tiene siete años',
      options: ['Mi hijo tiene siete años', 'Mi hermano tiene siete años', 'Mi padre tiene siete años', 'Mi hijo tiene siete hijos'],
    },
    {
      id: 'q3',
      type: 'multiple-choice',
      promptEn: '"Los abuelos" in English is:',
      promptEs: '"Los abuelos" en inglés es:',
      answer: 'grandparents',
      options: ['grandparents', 'parents', 'children', 'cousins'],
    },
    {
      id: 'q4',
      type: 'multiple-choice',
      promptEn: 'How do you say "Tengo dos hijos" in English?',
      promptEs: '¿Cómo se dice "Tengo dos hijos" en inglés?',
      answer: 'I have two children',
      options: ['I have two children', 'I have two brothers', 'I don\'t have children', 'My two sons'],
    },
    {
      id: 'q5',
      type: 'multiple-choice',
      promptEn: '"La hija" in English is:',
      promptEs: '"La hija" en inglés es:',
      answer: 'daughter',
      options: ['daughter', 'sister', 'mother', 'grandmother'],
    },
    {
      id: 'q6',
      type: 'multiple-choice',
      promptEn: 'Complete: "I ___ two brothers and one sister."',
      promptEs: 'Completa: "I ___ two brothers and one sister."',
      answer: 'have',
      options: ['have', 'has', 'am', 'are'],
    },
    {
      id: 'q7',
      type: 'multiple-choice',
      promptEn: '"Mis abuelos" in English is:',
      promptEs: '"Mis abuelos" en inglés es:',
      answer: 'my grandparents',
      options: ['my grandparents', 'my parents', 'my cousins', 'my aunts'],
    },
    {
      id: 'q8',
      type: 'multiple-choice',
      promptEn: 'Which question asks how many kids someone has?',
      promptEs: '¿Qué pregunta pregunta cuántos hijos tiene alguien?',
      answer: 'How many children do you have?',
      options: ['How many children do you have?', 'Do you have children?', "What is your child's name?", 'Where are your children?'],
    },
  ],
  teachingScenarios: [
    {
      label: 'Part 1: Talking about your immediate family',
      text: 'You are talking with a new friend. They want to know about your parents and siblings.',
      wordBank: [
        { en: 'one sister', es: 'una hermana' },
        { en: 'two brothers', es: 'dos hermanos' },
        { en: 'no siblings', es: 'ningún hermano' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: 'Tell me about your parents.', es: 'Cuéntame de tus padres.' },
          { speaker: 'student', en: 'My mother is a cook.', es: 'Mi mamá es cocinera.' },
        ],
        [
          { speaker: 'tutor', en: 'Do you have any brothers or sisters?', es: '¿Tienes hermanos o hermanas?' },
          { speaker: 'student', en: 'I have two brothers and one sister.', es: 'Tengo dos hermanos y una hermana.' },
        ],
        [
          { speaker: 'tutor', en: 'Where does your sister live?', es: '¿Dónde vive tu hermana?' },
          { speaker: 'student', en: 'She lives in the Bronx.', es: 'Vive en el Bronx.' },
        ],
      ],
    },
    {
      label: 'Part 2: Talking about your spouse and children',
      text: 'The conversation continues. Practice talking about your husband/wife and children.',
      wordBank: [
        { en: 'one child', es: 'un hijo' },
        { en: 'two children', es: 'dos hijos' },
        { en: 'three children', es: 'tres hijos' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: 'Do you have a husband or wife?', es: '¿Tienes esposo o esposa?' },
          { speaker: 'student', en: 'Yes, my husband works in Manhattan.', es: 'Sí, mi esposo trabaja en Manhattan.' },
        ],
        [
          { speaker: 'tutor', en: 'How many children do you have?', es: '¿Cuántos hijos tienes?' },
          { speaker: 'student', en: 'I have three children.', es: 'Tengo tres hijos.' },
        ],
        [
          { speaker: 'tutor', en: 'Tell me about them.', es: 'Cuéntame de ellos.' },
          { speaker: 'student', en: 'My son is seven. My baby is one.', es: 'Mi hijo tiene siete años. Mi bebé tiene un año.' },
        ],
      ],
    },
    {
      label: 'Part 3: Talking about extended family',
      text: 'Your friend asks about your cousins, aunts, and uncles.',
      chunks: [
        [
          { speaker: 'tutor', en: 'Do you have any cousins?', es: '¿Tienes primos?' },
          { speaker: 'student', en: 'Yes, my cousin lives in Brooklyn.', es: 'Sí, mi primo vive en Brooklyn.' },
        ],
        [
          { speaker: 'tutor', en: 'What about aunts and uncles?', es: '¿Y tus tías y tíos?' },
          { speaker: 'student', en: 'They visited last month.', es: 'Vinieron de visita el mes pasado.' },
        ],
        [
          { speaker: 'tutor', en: 'Are your grandparents here?', es: '¿Tus abuelos están aquí?' },
          { speaker: 'student', en: 'No, they stayed in Mexico.', es: 'No, se quedaron en México.' },
        ],
      ],
    },
  ],
  practiceActivities: [
    {
      titleEn: 'Do You Have...?',
      titleEs: '¿Tienes...?',
      instructionsEn: 'Practice saying which family members you do and do not have.',
      instructionsEs: 'Practica decir qué familiares tienes y cuáles no tienes.',
      wordBank: [
        { en: 'brothers', es: 'hermanos' },
        { en: 'sisters', es: 'hermanas' },
        { en: 'cousins', es: 'primos' },
      ],
      chunks: [
        [
          { speaker: 'tutor', en: 'Do you have any brothers?', es: '¿Tienes hermanos?' },
          { speaker: 'student', en: "No, I don't have any brothers.", es: 'No, no tengo hermanos.' },
        ],
        [
          { speaker: 'tutor', en: 'Do you have a baby?', es: '¿Tienes un bebé?' },
          { speaker: 'student', en: 'Yes, my baby is one year old.', es: 'Sí, mi bebé tiene un año.' },
        ],
      ],
    },
    {
      titleEn: 'Guess Who',
      titleEs: 'Adivina Quién',
      instructionsEn: 'Practice guessing a family word from a clue.',
      instructionsEs: 'Practica adivinar una palabra de familia a partir de una pista.',
      chunks: [
        [
          { speaker: 'tutor', en: "My father's brother. What do we call him?", es: 'El hermano de mi padre. ¿Cómo le llamamos?' },
          { speaker: 'student', en: 'Uncle.', es: 'Tío.' },
        ],
        [
          { speaker: 'tutor', en: "My mother's sister. What do we call her?", es: 'La hermana de mi madre. ¿Cómo le llamamos?' },
          { speaker: 'student', en: 'Aunt.', es: 'Tía.' },
        ],
      ],
    },
    {
      titleEn: 'How Many?',
      titleEs: '¿Cuántos?',
      instructionsEn: "Practice asking the tutor how many family members they have.",
      instructionsEs: 'Practica preguntarle al tutor cuántos familiares tiene.',
      wordBank: [
        { en: 'one', es: 'uno' },
        { en: 'two', es: 'dos' },
        { en: 'three', es: 'tres' },
      ],
      chunks: [
        [
          { speaker: 'student', en: 'How many cousins do you have?', es: '¿Cuántos primos tienes?' },
          { speaker: 'tutor', en: 'I have two cousins.', es: 'Tengo dos primos.' },
        ],
        [
          { speaker: 'student', en: 'How many children do you have?', es: '¿Cuántos hijos tienes?' },
          { speaker: 'tutor', en: 'I have one child.', es: 'Tengo un hijo.' },
        ],
      ],
    },
  ],
  worksheet: [
    { id: 'w1', promptEn: 'I ____ two brothers.', promptEs: 'Tengo dos hermanos. (I ____ two brothers.)', answer: 'have' },
    { id: 'w2', promptEn: 'My ____ works in construction.', promptEs: 'Mi padre trabaja en construcción. (My ____ works in construction.)', answer: 'father' },
    { id: 'w3', promptEn: 'How many ____ do you have?', promptEs: '¿Cuántos hijos tienes? (How many ____ do you have?)', answer: 'children' },
    { id: 'w4', promptEn: 'This is my ____. She is my father\'s sister.', promptEs: 'Esta es mi tía. (This is my ____.)', answer: 'aunt' },
    { id: 'w5', promptEn: 'My ____ is one year old.', promptEs: 'Mi bebé tiene un año. (My ____ is one year old.)', answer: 'baby' },
  ],
  classWorksheet: [
    { id: 'cw1', promptEn: 'My ____ is my mother\'s mother.', promptEs: 'Mi abuela es la mamá de mi mamá. (My ____ is my mother\'s mother.)', answer: 'grandmother' },
    { id: 'cw2', promptEn: 'My uncle\'s son is my ____.', promptEs: 'El hijo de mi tío es mi primo. (... is my ____.)', answer: 'cousin' },
    { id: 'cw3', promptEn: 'My father\'s brother is my ____.', promptEs: 'El hermano de mi papá es mi tío. (... is my ____.)', answer: 'uncle' },
    { id: 'cw4', promptEn: 'I have one ____. Her name is Ana. (hija)', promptEs: 'Tengo una hija. (I have one ____.)', answer: 'daughter' },
    { id: 'cw5', promptEn: 'My ____ is a good man. We are married. (esposo)', promptEs: 'Mi esposo es un buen hombre. (My ____ is a good man.)', answer: 'husband' },
    { id: 'cw6', promptEn: 'I don\'t ____ any sisters.', promptEs: 'No tengo hermanas. (I don\'t ____ any sisters.)', answer: 'have' },
    { id: 'cw7', promptEn: 'How many ____ do you have? (hermanos)', promptEs: '¿Cuántos hermanos tienes? (How many ____ do you have?)', answer: 'brothers' },
    { id: 'cw8', promptEn: 'My ____ are 3 and 7 years old. (niños)', promptEs: 'Mis niños tienen 3 y 7 años. (My ____ are 3 and 7.)', answer: 'kids' },
  ],
  listening: [
    {
      titleEn: 'A Family Photo',
      titleEs: 'Una foto familiar',
      script: [
        { speaker: 'Rita', en: 'Look at this photo. This is my family.' },
        { speaker: 'Sam', en: 'Who is the man with the hat?' },
        { speaker: 'Rita', en: 'That is my father. And this is my mom next to him.' },
        { speaker: 'Sam', en: 'Who are the children?' },
        { speaker: 'Rita', en: 'They are my sister\'s kids. A boy and a girl.' },
        { speaker: 'Sam', en: 'And the baby?' },
        { speaker: 'Rita', en: 'That is my son, Leo. He was one year old in this photo.' },
      ],
      questions: [
        { id: 'l1q1', promptEn: 'Who is the man with the hat?', promptEs: '¿Quién es el hombre con sombrero?', answer: 'Rita\'s father' },
        { id: 'l1q2', promptEn: 'Who is next to him?', promptEs: '¿Quién está al lado de él?', answer: 'Rita\'s mom' },
        { id: 'l1q3', promptEn: 'Whose kids are in the photo?', promptEs: '¿De quién son los niños en la foto?', answer: 'Rita\'s sister\'s' },
        { id: 'l1q4', promptEn: 'What is the baby\'s name?', promptEs: '¿Cómo se llama el bebé?', answer: 'Leo' },
      ],
    },
    {
      titleEn: 'Talking About Family',
      titleEs: 'Hablando de la familia',
      script: [
        { speaker: 'Tutor', en: 'Do you have a big family, Jorge?' },
        { speaker: 'Jorge', en: 'Yes! I have four brothers and two sisters.' },
        { speaker: 'Tutor', en: 'Wow. Are you married?' },
        { speaker: 'Jorge', en: 'Yes. My wife\'s name is Paula. We have three children.' },
        { speaker: 'Tutor', en: 'Do your parents live in New York?' },
        { speaker: 'Jorge', en: 'No. My parents and grandparents live in Puebla, Mexico.' },
      ],
      questions: [
        { id: 'l2q1', promptEn: 'How many brothers does Jorge have?', promptEs: '¿Cuántos hermanos tiene Jorge?', answer: 'Four' },
        { id: 'l2q2', promptEn: 'What is his wife\'s name?', promptEs: '¿Cómo se llama su esposa?', answer: 'Paula' },
        { id: 'l2q3', promptEn: 'How many children do they have?', promptEs: '¿Cuántos hijos tienen?', answer: 'Three' },
        { id: 'l2q4', promptEn: 'Where do his parents live?', promptEs: '¿Dónde viven sus padres?', answer: 'In Puebla, Mexico' },
      ],
    },
  ],
  inPersonQuiz: [
    { id: 'iq1', kind: 'translate', promptEn: 'Write in English: "mi hermana"', answer: 'my sister' },
    { id: 'iq2', kind: 'translate', promptEn: 'Write in English: "los abuelos"', answer: 'the grandparents' },
    { id: 'iq3', kind: 'translate', promptEn: 'Write in Spanish: "my aunt and uncle"', answer: 'mi tía y mi tío' },
    { id: 'iq4', kind: 'translate', promptEn: 'Write in English: "Tengo dos hijos."', answer: 'I have two children (sons).' },
    { id: 'iq5', kind: 'dictation', promptEn: 'This is my mother.', answer: 'This is my mother.' },
    { id: 'iq6', kind: 'dictation', promptEn: 'I have three cousins.', answer: 'I have three cousins.' },
    { id: 'iq7', kind: 'dictation', promptEn: 'How many children do you have?', answer: 'How many children do you have?' },
    { id: 'iq8', kind: 'short-answer', promptEn: 'What do you call your sister\'s son? (sobrino)', promptEs: '¿Cómo llamas al hijo de tu hermana?', answer: 'nephew' },
    { id: 'iq9', kind: 'short-answer', promptEn: 'How many brothers and sisters do you have?', promptEs: '¿Cuántos hermanos tienes?', answer: 'I have ___. (Answers will vary.)' },
    { id: 'iq10', kind: 'short-answer', promptEn: 'Who lives with you?', promptEs: '¿Quién vive contigo?', answer: 'My ___ lives with me. (Answers will vary.)' },
  ],
}

export default module
