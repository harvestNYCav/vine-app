import type { MathExamQuestionRecord } from '../types'

const EXAM_ID = 'nysed-2026-grade-3'
const SECTION_SLUG = 'fractions'
const CLUSTER = 'Number and Operations - Fractions'
const IMAGE_ROOT = '/vine-app/nysed/2026-grade-3/fractions'

export const FRACTIONS_QUESTIONS: MathExamQuestionRecord[] = [
  {
    id: 'nysed-2026-g3-q1',
    examId: EXAM_ID,
    sectionSlug: SECTION_SLUG,
    number: 1,
    session: 1,
    sourcePage: 4,
    type: 'multiple-choice',
    points: 1,
    primaryStandard: 'NGLS.Math.Content.NY-3.NF.2a',
    cluster: CLUSTER,
    image: {
      en: { src: `${IMAGE_ROOT}/en/q01.webp`, width: 1355, height: 733 },
      es: { src: `${IMAGE_ROOT}/es/q01.webp`, width: 1430, height: 777 },
      alt: {
        en: 'Question 1. Which fraction is represented by the point on the number line shown below? The number line from 0 to 1 is divided into 4 equal intervals, and the point is at the first tick after 0. A: 1/4. B: 1/8. C: 2/4. D: 2/6.',
        es: 'Pregunta 1. ¿Qué fracción está representada por el punto en la recta numérica que se muestra a continuación? La recta numérica de 0 a 1 está dividida en 4 intervalos iguales y el punto está en la primera marca después de 0. A: 1/4. B: 1/8. C: 2/4. D: 2/6.',
      },
    },
    grading: {
      mode: 'choice',
      correct: 'A',
      explanationSource: 'vine-authored',
      explanation: {
        en: 'The distance from 0 to 1 is split into 4 equal intervals. The first tick after 0 represents 1/4, so A is correct.',
        es: 'La distancia de 0 a 1 está dividida en 4 intervalos iguales. La primera marca después de 0 representa 1/4, por lo que A es correcta.',
      },
    },
  },
  {
    id: 'nysed-2026-g3-q5',
    examId: EXAM_ID,
    sectionSlug: SECTION_SLUG,
    number: 5,
    session: 1,
    sourcePage: 6,
    type: 'multiple-choice',
    points: 1,
    primaryStandard: 'NGLS.Math.Content.NY-3.NF.3a',
    cluster: CLUSTER,
    image: {
      en: { src: `${IMAGE_ROOT}/en/q05.webp`, width: 1455, height: 1044 },
      es: { src: `${IMAGE_ROOT}/es/q05.webp`, width: 1454, height: 1044 },
      alt: {
        en: 'Question 5. The model shown below represents a whole divided into equal parts. It is shaded to represent a fraction. The model has 3 equal vertical parts, with the first 2 shaded. Which shape is shaded to represent a fraction equivalent to the fraction of the model that is shaded? A: 3 of 6 equal vertical parts are shaded. B: 2 of 6 equal vertical parts are shaded. C: 5 of 6 equal vertical parts are shaded. D: 4 of 6 equal vertical parts are shaded.',
        es: 'Pregunta 5. El modelo que se muestra a continuación representa un entero dividido en partes iguales. Está sombreado para representar una fracción. El modelo tiene 3 partes verticales iguales y las primeras 2 están sombreadas. ¿Qué forma está sombreada para representar una fracción equivalente a la fracción del modelo que está sombreado? A: 3 de 6 partes verticales iguales están sombreadas. B: 2 de 6 partes verticales iguales están sombreadas. C: 5 de 6 partes verticales iguales están sombreadas. D: 4 de 6 partes verticales iguales están sombreadas.',
      },
    },
    grading: {
      mode: 'choice',
      correct: 'D',
      explanationSource: 'vine-authored',
      explanation: {
        en: 'The original model shows 2/3. Choice D shows 4/6, which is equivalent because both the numerator and denominator of 2/3 were multiplied by 2.',
        es: 'El modelo original muestra 2/3. La opción D muestra 4/6, que es equivalente porque el numerador y el denominador de 2/3 se multiplicaron por 2.',
      },
    },
  },
  {
    id: 'nysed-2026-g3-q11',
    examId: EXAM_ID,
    sectionSlug: SECTION_SLUG,
    number: 11,
    session: 1,
    sourcePage: 8,
    type: 'multiple-choice',
    points: 1,
    primaryStandard: 'NGLS.Math.Content.NY-3.NF.3d',
    cluster: CLUSTER,
    image: {
      en: { src: `${IMAGE_ROOT}/en/q11.webp`, width: 1424, height: 438 },
      es: { src: `${IMAGE_ROOT}/es/q11.webp`, width: 1435, height: 437 },
      alt: {
        en: 'Question 11. Which whole model is divided into equal parts and shaded to represent a fraction less than 2/8? A: 2 of 6 equal parts are shaded. B: 1 of 8 equal parts is shaded. C: 3 of 8 equal parts are shaded. D: 2 of 4 equal parts are shaded.',
        es: 'Pregunta 11. ¿Qué modelo entero está dividido en partes iguales y sombreado para representar una fracción menor que 2/8? A: 2 de 6 partes iguales están sombreadas. B: 1 de 8 partes iguales está sombreada. C: 3 de 8 partes iguales están sombreadas. D: 2 de 4 partes iguales están sombreadas.',
      },
    },
    grading: {
      mode: 'choice',
      correct: 'B',
      explanationSource: 'vine-authored',
      explanation: {
        en: 'Choice B represents 1/8. With the same denominator, 1/8 is less than 2/8 because 1 is less than 2.',
        es: 'La opción B representa 1/8. Con el mismo denominador, 1/8 es menor que 2/8 porque 1 es menor que 2.',
      },
    },
  },
  {
    id: 'nysed-2026-g3-q15',
    examId: EXAM_ID,
    sectionSlug: SECTION_SLUG,
    number: 15,
    session: 1,
    sourcePage: 10,
    type: 'multiple-choice',
    points: 1,
    primaryStandard: 'NGLS.Math.Content.NY-3.NF.3c',
    cluster: CLUSTER,
    image: {
      en: { src: `${IMAGE_ROOT}/en/q15.webp`, width: 1112, height: 543 },
      es: { src: `${IMAGE_ROOT}/es/q15.webp`, width: 1286, height: 543 },
      alt: {
        en: 'Question 15. Which two fractions both represent the same whole number? A: 3/3 and 6/1. B: 4/2 and 2/2. C: 3/1 and 6/2. D: 4/4 and 4/1.',
        es: 'Pregunta 15. ¿Cuáles son las dos fracciones que representan el mismo número entero? A: 3/3 y 6/1. B: 4/2 y 2/2. C: 3/1 y 6/2. D: 4/4 y 4/1.',
      },
    },
    grading: {
      mode: 'choice',
      correct: 'C',
      explanationSource: 'vine-authored',
      explanation: {
        en: 'In choice C, 3/1 equals 3 and 6/2 also equals 3. Both fractions represent the same whole number.',
        es: 'En la opción C, 3/1 es igual a 3 y 6/2 también es igual a 3. Ambas fracciones representan el mismo número entero.',
      },
    },
  },
  {
    id: 'nysed-2026-g3-q19',
    examId: EXAM_ID,
    sectionSlug: SECTION_SLUG,
    number: 19,
    session: 1,
    sourcePage: 12,
    type: 'multiple-choice',
    points: 1,
    primaryStandard: 'NGLS.Math.Content.NY-3.NF.2b',
    cluster: CLUSTER,
    image: {
      en: { src: `${IMAGE_ROOT}/en/q19.webp`, width: 1154, height: 786 },
      es: { src: `${IMAGE_ROOT}/es/q19.webp`, width: 1216, height: 786 },
      alt: {
        en: 'Question 19. Which number line shows the fraction 6/8 in the correct location? A: 6/8 is placed at the second of 6 equal intervals from 0 to 1. B: 6/8 is placed at the second of 8 equal intervals from 0 to 1. C: 6/8 is placed at the sixth of 8 equal intervals from 0 to 1. D: 6/8 is placed at the fourth of 6 equal intervals from 0 to 1.',
        es: 'Pregunta 19. ¿Qué recta numérica muestra la fracción 6/8 en la ubicación correcta? A: 6/8 está ubicado en el segundo de 6 intervalos iguales de 0 a 1. B: 6/8 está ubicado en el segundo de 8 intervalos iguales de 0 a 1. C: 6/8 está ubicado en el sexto de 8 intervalos iguales de 0 a 1. D: 6/8 está ubicado en el cuarto de 6 intervalos iguales de 0 a 1.',
      },
    },
    grading: {
      mode: 'choice',
      correct: 'C',
      explanationSource: 'vine-authored',
      explanation: {
        en: 'To locate 6/8, divide the distance from 0 to 1 into 8 equal intervals and count 6 intervals from 0. Choice C does this.',
        es: 'Para ubicar 6/8, divide la distancia de 0 a 1 en 8 intervalos iguales y cuenta 6 intervalos desde 0. La opción C hace esto.',
      },
    },
  },
  {
    id: 'nysed-2026-g3-q27',
    examId: EXAM_ID,
    sectionSlug: SECTION_SLUG,
    number: 27,
    session: 2,
    sourcePage: 20,
    type: 'multiple-choice',
    points: 1,
    primaryStandard: 'NGLS.Math.Content.NY-3.NF.3b',
    cluster: CLUSTER,
    image: {
      en: { src: `${IMAGE_ROOT}/en/q27.webp`, width: 653, height: 544 },
      es: { src: `${IMAGE_ROOT}/es/q27.webp`, width: 744, height: 544 },
      alt: {
        en: 'Question 27. Which number sentence is true? A: 1/3 = 3/6. B: 2/4 = 4/8. C: 4/6 = 2/4. D: 5/6 = 7/8.',
        es: 'Pregunta 27. ¿Cuál oración numérica es verdadera? A: 1/3 = 3/6. B: 2/4 = 4/8. C: 4/6 = 2/4. D: 5/6 = 7/8.',
      },
    },
    grading: {
      mode: 'choice',
      correct: 'B',
      explanationSource: 'vine-authored',
      explanation: {
        en: 'Both 2/4 and 4/8 are equivalent to 1/2, so the number sentence in choice B is true.',
        es: 'Tanto 2/4 como 4/8 son equivalentes a 1/2, por lo que la oración numérica de la opción B es verdadera.',
      },
    },
  },
  {
    id: 'nysed-2026-g3-q33',
    examId: EXAM_ID,
    sectionSlug: SECTION_SLUG,
    number: 33,
    session: 2,
    sourcePage: 24,
    type: 'short-answer',
    points: 1,
    primaryStandard: 'NGLS.Math.Content.NY-3.NF.1',
    cluster: CLUSTER,
    image: {
      en: { src: `${IMAGE_ROOT}/en/q33.webp`, width: 1227, height: 449 },
      es: { src: `${IMAGE_ROOT}/es/q33.webp`, width: 1315, height: 496 },
      alt: {
        en: 'Question 33. This question is worth 1 credit. The model shown below represents a whole divided into equal parts. The model has 6 equal vertical parts, and the middle 2 parts are shaded. What fraction of the model is shaded?',
        es: 'Pregunta 33. Esta pregunta tiene un valor de 1 crédito. El modelo que se muestra a continuación representa un entero dividido en partes iguales. El modelo tiene 6 partes verticales iguales y las 2 partes del centro están sombreadas. ¿Qué fracción del modelo está sombreada?',
      },
    },
    grading: {
      mode: 'exact',
      acceptedAnswers: ['2/6', '1/3', '2⁄6', '1⁄3', '⅓'],
      explanationSource: 'vine-authored',
      explanation: {
        en: 'The model has 6 equal parts and 2 are shaded, so the shaded fraction is 2/6. The equivalent fraction 1/3 is also correct.',
        es: 'El modelo tiene 6 partes iguales y 2 están sombreadas, por lo que la fracción sombreada es 2/6. La fracción equivalente 1/3 también es correcta.',
      },
    },
  },
  {
    id: 'nysed-2026-g3-q37',
    examId: EXAM_ID,
    sectionSlug: SECTION_SLUG,
    number: 37,
    session: 2,
    sourcePage: 27,
    type: 'constructed-response',
    points: 2,
    primaryStandard: 'NGLS.Math.Content.NY-3.NF.3d',
    cluster: CLUSTER,
    image: {
      en: { src: `${IMAGE_ROOT}/en/q37.webp`, width: 1120, height: 610 },
      es: { src: `${IMAGE_ROOT}/es/q37.webp`, width: 1333, height: 609 },
      alt: {
        en: 'Question 37. This question is worth 2 credits. Information about Pizza A and Pizza B is listed below. The pizzas are the same size. Pizza A is cut into slices that are each 1/6 of the whole. Pizza B is cut into slices that are each 1/8 of the whole. Which pizza is cut into larger slices? Explain how you found your answer.',
        es: 'Pregunta 37. Esta pregunta tiene un valor de 2 créditos. A continuación, se muestra información sobre la Pizza A y la Pizza B. Las pizzas tienen el mismo tamaño. La Pizza A está cortada en porciones que miden 1/6 de toda la pizza. La Pizza B está cortada en porciones que miden 1/8 de toda la pizza. ¿Cuál de las pizzas está cortada en porciones más grandes? Explique cómo encontró su respuesta.',
      },
    },
    grading: {
      mode: 'self-assessed',
      explanationSource: 'vine-authored',
      explanation: {
        en: 'Pizza A has the larger slices. Because the pizzas are the same size, dividing one into 6 equal pieces makes larger pieces than dividing one into 8 equal pieces, so 1/6 is greater than 1/8.',
        es: 'La Pizza A tiene las porciones más grandes. Como las pizzas tienen el mismo tamaño, dividir una en 6 partes iguales produce partes más grandes que dividir una en 8 partes iguales, por lo que 1/6 es mayor que 1/8.',
      },
      criteria: [
        {
          en: 'Identifies Pizza A as the pizza with larger slices.',
          es: 'Identifica la Pizza A como la pizza con porciones más grandes.',
        },
        {
          en: 'Explains a valid comparison, such as fewer equal parts making larger pieces for the same-size whole, or states that 1/6 is greater than 1/8.',
          es: 'Explica una comparación válida, como que menos partes iguales producen partes más grandes para enteros del mismo tamaño, o indica que 1/6 es mayor que 1/8.',
        },
      ],
    },
  },
]
