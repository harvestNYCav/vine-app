import type { MathExamQuestionRecord } from '../types'

const EXAM_ID = 'nysed-2026-grade-3'
const SECTION_SLUG = 'operations-algebra'
const CLUSTER = 'Operations and Algebraic Thinking'
const IMAGE_ROOT = '/vine-app/nysed/2026-grade-3/operations-algebra'

export const OPERATIONS_ALGEBRA_QUESTIONS: MathExamQuestionRecord[] = [
  {
    id: 'nysed-2026-g3-q3',
    examId: EXAM_ID,
    sectionSlug: SECTION_SLUG,
    number: 3,
    session: 1,
    sourcePage: 5,
    type: 'multiple-choice',
    points: 1,
    primaryStandard: 'NGLS.Math.Content.NY-3.OA.3',
    cluster: CLUSTER,
    image: {
      en: { src: `${IMAGE_ROOT}/en/q03.webp`, width: 1477, height: 490 },
      es: { src: `${IMAGE_ROOT}/es/q03.webp`, width: 1544, height: 490 },
      alt: {
        en: 'Question 3. Jaylani has 54 cookies. She puts all of the cookies into 9 bags. Each bag has the same number of cookies. How many cookies does Jaylani put into each bag? A: 6. B: 7. C: 45. D: 63.',
        es: 'Pregunta 3. Jaylani tiene 54 galletas. Ella pone todas las galletitas en 9 bolsas. Cada bolsa tiene la misma cantidad de galletas. ¿Cuántas galletas pone Jaylani en cada bolsa? A: 6. B: 7. C: 45. D: 63.',
      },
    },
    grading: {
      mode: 'choice',
      correct: 'A',
      explanation: {
        en: 'Divide 54 cookies equally among 9 bags: 54 ÷ 9 = 6 cookies in each bag.',
        es: 'Divide 54 galletas en partes iguales entre 9 bolsas: 54 ÷ 9 = 6 galletas en cada bolsa.',
      },
    },
  },
  {
    id: 'nysed-2026-g3-q7',
    examId: EXAM_ID,
    sectionSlug: SECTION_SLUG,
    number: 7,
    session: 1,
    sourcePage: 7,
    type: 'multiple-choice',
    points: 1,
    primaryStandard: 'NGLS.Math.Content.NY-3.OA.9',
    cluster: CLUSTER,
    image: {
      en: { src: `${IMAGE_ROOT}/en/q07.webp`, width: 910, height: 582 },
      es: { src: `${IMAGE_ROOT}/es/q07.webp`, width: 1022, height: 582 },
      alt: {
        en: 'Question 7. The number pattern shown below continues: 2, 8, 14, 20, ... What is the seventh number in the pattern? A: 26. B: 32. C: 38. D: 44.',
        es: 'Pregunta 7. El patrón numérico que se presenta abajo continúa: 2, 8, 14, 20, ... ¿Cuál es el séptimo número del patrón? A: 26. B: 32. C: 38. D: 44.',
      },
    },
    grading: {
      mode: 'choice',
      correct: 'C',
      explanation: {
        en: 'The pattern adds 6 each time. The next three numbers are 26, 32, and 38, so the seventh number is 38.',
        es: 'El patrón suma 6 cada vez. Los tres números siguientes son 26, 32 y 38, así que el séptimo número es 38.',
      },
    },
  },
  {
    id: 'nysed-2026-g3-q10',
    examId: EXAM_ID,
    sectionSlug: SECTION_SLUG,
    number: 10,
    session: 1,
    sourcePage: 8,
    type: 'multiple-choice',
    points: 1,
    primaryStandard: 'NGLS.Math.Content.NY-3.OA.5',
    cluster: CLUSTER,
    image: {
      en: { src: `${IMAGE_ROOT}/en/q10.webp`, width: 1271, height: 590 },
      es: { src: `${IMAGE_ROOT}/es/q10.webp`, width: 1450, height: 637 },
      alt: {
        en: 'Question 10. An equation with two blanks is shown: 5 × 6 = (2 × blank) + (3 × blank). What number can go into both blanks to make the equation true? A: 3. B: 4. C: 5. D: 6.',
        es: 'Pregunta 10. A continuación, se muestra una ecuación con dos espacios en blanco: 5 × 6 = (2 × espacio en blanco) + (3 × espacio en blanco). ¿Qué número puede ir en ambos espacios en blanco para que la ecuación sea verdadera? A: 3. B: 4. C: 5. D: 6.',
      },
    },
    grading: {
      mode: 'choice',
      correct: 'D',
      explanation: {
        en: 'Split 5 groups of 6 into 2 groups of 6 and 3 groups of 6: (2 × 6) + (3 × 6) = 12 + 18 = 30.',
        es: 'Separa 5 grupos de 6 en 2 grupos de 6 y 3 grupos de 6: (2 × 6) + (3 × 6) = 12 + 18 = 30.',
      },
    },
  },
  {
    id: 'nysed-2026-g3-q12',
    examId: EXAM_ID,
    sectionSlug: SECTION_SLUG,
    number: 12,
    session: 1,
    sourcePage: 9,
    type: 'multiple-choice',
    points: 1,
    primaryStandard: 'NGLS.Math.Content.NY-3.OA.1',
    cluster: CLUSTER,
    image: {
      en: { src: `${IMAGE_ROOT}/en/q12.webp`, width: 1261, height: 449 },
      es: { src: `${IMAGE_ROOT}/es/q12.webp`, width: 1524, height: 496 },
      alt: {
        en: 'Question 12. Which story problem can be represented by the expression 4 × 2? A: Jim has 4 cookies. He shares them equally between 2 people. B: Jim has 4 pieces of candy. He gives away 2 of the pieces. C: Jim has 4 pencils. A friend gives him 2 more pencils. D: Jim has 4 bags of toys. Each bag has 2 toys.',
        es: 'Pregunta 12. ¿Cuál de los enunciados de problema se puede representar mediante la expresión 4 × 2? A: Jim tiene 4 galletitas. Las comparte por igual entre 2 personas. B: Jim tiene 4 dulces. Entrega 2 de los dulces. C: Jim tiene 4 lápices. Un amigo le da otros 2 lápices más. D: Jim tiene 4 bolsas con juguetes. Cada bolsa tiene 2 juguetes.',
      },
    },
    grading: {
      mode: 'choice',
      correct: 'D',
      explanation: {
        en: 'Four bags with 2 toys in each bag make 4 equal groups of 2, which is represented by 4 × 2.',
        es: 'Cuatro bolsas con 2 juguetes en cada bolsa forman 4 grupos iguales de 2, lo cual se representa con 4 × 2.',
      },
    },
  },
  {
    id: 'nysed-2026-g3-q17',
    examId: EXAM_ID,
    sectionSlug: SECTION_SLUG,
    number: 17,
    session: 1,
    sourcePage: 11,
    type: 'multiple-choice',
    points: 1,
    primaryStandard: 'NGLS.Math.Content.NY-3.OA.6',
    cluster: CLUSTER,
    image: {
      en: { src: `${IMAGE_ROOT}/en/q17.webp`, width: 1355, height: 447 },
      es: { src: `${IMAGE_ROOT}/es/q17.webp`, width: 1424, height: 447 },
      alt: {
        en: 'Question 17. Which equation can be used to find the value of the expression 28 ÷ 4? A: 4 × ? = 28. B: 28 × 4 = ?. C: ? − 4 = 28. D: 28 − ? = 4.',
        es: 'Pregunta 17. ¿Qué ecuación se puede usar para averiguar el valor de la expresión 28 ÷ 4? A: 4 × ? = 28. B: 28 × 4 = ?. C: ? − 4 = 28. D: 28 − ? = 4.',
      },
    },
    grading: {
      mode: 'choice',
      correct: 'A',
      explanation: {
        en: 'Division can be viewed as finding an unknown factor. The value of 28 ÷ 4 is the number that makes 4 × ? = 28 true.',
        es: 'La división se puede ver como hallar un factor desconocido. El valor de 28 ÷ 4 es el número que hace verdadera la ecuación 4 × ? = 28.',
      },
    },
  },
  {
    id: 'nysed-2026-g3-q20',
    examId: EXAM_ID,
    sectionSlug: SECTION_SLUG,
    number: 20,
    session: 1,
    sourcePage: 12,
    type: 'multiple-choice',
    points: 1,
    primaryStandard: 'NGLS.Math.Content.NY-3.OA.3',
    secondaryStandards: ['NGLS.Math.Content.NY-3.NBT.3'],
    cluster: CLUSTER,
    image: {
      en: { src: `${IMAGE_ROOT}/en/q20.webp`, width: 1553, height: 538 },
      es: { src: `${IMAGE_ROOT}/es/q20.webp`, width: 1510, height: 538 },
      alt: {
        en: 'Question 20. Nellie made bracelets for 6 of her friends. She used 10 beads for each bracelet. She made 2 bracelets for each friend. How many beads did Nellie use to make all of the bracelets? A: 20. B: 60. C: 80. D: 120.',
        es: 'Pregunta 20. Nellie hizo brazaletes para 6 de sus amigos. Usó 10 cuentas para cada brazalete. Hizo 2 brazaletes para cada amigo. ¿Cuántas cuentas usó Nellie para hacer todos los brazaletes? A: 20. B: 60. C: 80. D: 120.',
      },
    },
    grading: {
      mode: 'choice',
      correct: 'D',
      explanation: {
        en: 'Nellie made 6 × 2 = 12 bracelets. At 10 beads per bracelet, she used 12 × 10 = 120 beads.',
        es: 'Nellie hizo 6 × 2 = 12 brazaletes. Con 10 cuentas por brazalete, usó 12 × 10 = 120 cuentas.',
      },
    },
  },
  {
    id: 'nysed-2026-g3-q22',
    examId: EXAM_ID,
    sectionSlug: SECTION_SLUG,
    number: 22,
    session: 1,
    sourcePage: 13,
    type: 'multiple-choice',
    points: 1,
    primaryStandard: 'NGLS.Math.Content.NY-3.OA.2',
    cluster: CLUSTER,
    image: {
      en: { src: `${IMAGE_ROOT}/en/q22.webp`, width: 1354, height: 789 },
      es: { src: `${IMAGE_ROOT}/es/q22.webp`, width: 1538, height: 835 },
      alt: {
        en: 'Question 22. A division problem is represented by a number line labeled 0, 7, 14, 21, 28, 35, and 42, with six equal jumps of 7 from 0 to 42. Which division problem is represented by the number line? A: 7 marbles are placed into 42 groups with 6 marbles in each group. B: 6 marbles are placed into 42 groups with 7 marbles in each group. C: 42 marbles are placed into 6 groups with 7 marbles in each group. D: 42 marbles are placed into 7 groups with 7 marbles in each group.',
        es: 'Pregunta 22. Un problema de división está representado por una recta numérica marcada con 0, 7, 14, 21, 28, 35 y 42, con seis saltos iguales de 7 desde 0 hasta 42. ¿Qué problema de división está representado por la recta numérica? A: Se colocan 7 canicas en 42 grupos con 6 canicas en cada grupo. B: Se colocan 6 canicas en 42 grupos con 7 canicas en cada grupo. C: Se colocan 42 canicas en 6 grupos con 7 canicas en cada grupo. D: Se colocan 42 canicas en 7 grupos con 7 canicas en cada grupo.',
      },
    },
    grading: {
      mode: 'choice',
      correct: 'C',
      explanation: {
        en: 'The number line shows 42 split into 6 equal jumps of 7. That matches placing 42 marbles into 6 groups with 7 marbles in each group.',
        es: 'La recta numérica muestra 42 dividido en 6 saltos iguales de 7. Eso corresponde a colocar 42 canicas en 6 grupos con 7 canicas en cada grupo.',
      },
    },
  },
  {
    id: 'nysed-2026-g3-q29',
    examId: EXAM_ID,
    sectionSlug: SECTION_SLUG,
    number: 29,
    session: 2,
    sourcePage: 21,
    type: 'multiple-choice',
    points: 1,
    primaryStandard: 'NGLS.Math.Content.NY-3.OA.4',
    cluster: CLUSTER,
    image: {
      en: { src: `${IMAGE_ROOT}/en/q29.webp`, width: 835, height: 589 },
      es: { src: `${IMAGE_ROOT}/es/q29.webp`, width: 1007, height: 590 },
      alt: {
        en: 'Question 29. An equation is shown: ? ÷ 4 = 8. What number makes this equation true? A: 4. B: 12. C: 28. D: 32.',
        es: 'Pregunta 29. A continuación, se muestra una ecuación: ? ÷ 4 = 8. ¿Qué número hace que la ecuación sea verdadera? A: 4. B: 12. C: 28. D: 32.',
      },
    },
    grading: {
      mode: 'choice',
      correct: 'D',
      explanation: {
        en: 'If a number divided by 4 equals 8, multiply 8 by 4 to find the number: 8 × 4 = 32.',
        es: 'Si un número dividido entre 4 es igual a 8, multiplica 8 por 4 para hallar el número: 8 × 4 = 32.',
      },
    },
  },
  {
    id: 'nysed-2026-g3-q35',
    examId: EXAM_ID,
    sectionSlug: SECTION_SLUG,
    number: 35,
    session: 2,
    sourcePage: 25,
    type: 'constructed-response',
    points: 2,
    primaryStandard: 'NGLS.Math.Content.NY-3.OA.6',
    cluster: CLUSTER,
    image: {
      en: { src: `${IMAGE_ROOT}/en/q35.webp`, width: 1489, height: 417 },
      es: { src: `${IMAGE_ROOT}/es/q35.webp`, width: 1455, height: 417 },
      alt: {
        en: 'Question 35. This question is worth 2 credits. An incomplete equation is shown: ? × 5 = 45. How can division be used to find the value of the unknown number? Be sure to include the value of the unknown number in your answer. Explain your answer.',
        es: 'Pregunta 35. Esta pregunta tiene un valor de 2 créditos. A continuación, se muestra una ecuación incompleta: ? × 5 = 45. ¿Cómo se puede usar la división para hallar el valor del número desconocido? Asegúrese de incluir el valor del número desconocido en su respuesta. Explique su respuesta.',
      },
    },
    grading: {
      mode: 'self-assessed',
      explanation: {
        en: 'Use the inverse relationship between multiplication and division: 45 ÷ 5 = 9. The unknown number is 9, and 9 × 5 = 45 confirms it.',
        es: 'Usa la relación inversa entre la multiplicación y la división: 45 ÷ 5 = 9. El número desconocido es 9, y 9 × 5 = 45 lo confirma.',
      },
      criteria: [
        {
          en: 'Finds the unknown value of 9.',
          es: 'Halla que el valor desconocido es 9.',
        },
        {
          en: 'Explains the related division 45 ÷ 5 = 9, or gives equivalent division reasoning.',
          es: 'Explica la división relacionada 45 ÷ 5 = 9, o presenta un razonamiento de división equivalente.',
        },
      ],
    },
  },
  {
    id: 'nysed-2026-g3-q38',
    examId: EXAM_ID,
    sectionSlug: SECTION_SLUG,
    number: 38,
    session: 2,
    sourcePage: 28,
    type: 'constructed-response',
    points: 3,
    primaryStandard: 'NGLS.Math.Content.NY-3.OA.8b',
    cluster: CLUSTER,
    image: {
      en: { src: `${IMAGE_ROOT}/en/q38.webp`, width: 1521, height: 678 },
      es: { src: `${IMAGE_ROOT}/es/q38.webp`, width: 1548, height: 725 },
      alt: {
        en: 'Question 38. This question is worth 3 credits. Three friends go to a movie theater. They have a total of $40 to spend on tickets and popcorn. Information about the price of tickets and popcorn is shown below. Each movie ticket is $9. Each bucket of popcorn is $4. They will buy 3 movie tickets. They will buy 2 buckets of popcorn. One of the friends says $40 is enough to buy all the movie tickets and buckets of popcorn. Is the friend correct? Explain your answer.',
        es: 'Pregunta 38. Esta pregunta tiene un valor de 3 créditos. Tres amigos van al cine. Tienen un total de $40 para gastar en entradas y palomitas de maíz. A continuación, se muestra el precio de las entradas y de las palomitas de maíz. Cada entrada al cine cuesta $9. Cada contenedor de palomitas de maíz cuesta $4. Van a comprar 3 entradas para el cine. Van a comprar 2 contenedores de palomitas de maíz. Uno de los amigos dice que $40 son suficientes para comprar todas las entradas y contenedores de palomitas de maíz. ¿El amigo está en lo correcto? Explique su respuesta.',
      },
    },
    grading: {
      mode: 'self-assessed',
      explanation: {
        en: 'Three tickets cost 3 × $9 = $27, and two buckets of popcorn cost 2 × $4 = $8. The total is $27 + $8 = $35, so the friend is correct and $5 remains.',
        es: 'Tres entradas cuestan 3 × $9 = $27, y dos contenedores de palomitas de maíz cuestan 2 × $4 = $8. El total es $27 + $8 = $35, así que el amigo está en lo correcto y sobran $5.',
      },
      criteria: [
        {
          en: 'Calculates that the 3 movie tickets cost $27.',
          es: 'Calcula que las 3 entradas al cine cuestan $27.',
        },
        {
          en: 'Calculates that the 2 buckets of popcorn cost $8.',
          es: 'Calcula que los 2 contenedores de palomitas de maíz cuestan $8.',
        },
        {
          en: 'Combines the costs to get $35 and correctly concludes that $40 is enough.',
          es: 'Combina los costos para obtener $35 y concluye correctamente que $40 son suficientes.',
        },
      ],
    },
  },
]
