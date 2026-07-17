import type { MathExamQuestionRecord } from '../types'

const EXAM_ID = 'nysed-2026-grade-3'
const SECTION_SLUG = 'base-ten'
const CLUSTER = 'Number and Operations in Base Ten'
const IMAGE_ROOT = '/vine-app/nysed/2026-grade-3/base-ten'

export const BASE_TEN_QUESTIONS: MathExamQuestionRecord[] = [
  {
    id: 'nysed-2026-g3-q2',
    examId: EXAM_ID,
    sectionSlug: SECTION_SLUG,
    number: 2,
    session: 1,
    sourcePage: 4,
    type: 'multiple-choice',
    points: 1,
    primaryStandard: 'NGLS.Math.Content.NY-3.NBT.4b',
    cluster: CLUSTER,
    image: {
      en: { src: `${IMAGE_ROOT}/en/q02.webp`, width: 912, height: 422 },
      es: { src: `${IMAGE_ROOT}/es/q02.webp`, width: 840, height: 422 },
      alt: {
        en: 'Question 2. What is the number 3,406 written in word form? A: three thousand four hundred sixty. B: three thousand four hundred six. C: thirty-four thousand sixty. D: thirty-four thousand six.',
        es: 'Pregunta 2. ¿Cómo se escribe en letras el número 3,406? A: tres mil cuatrocientos sesenta. B: tres mil cuatrocientos seis. C: treinta y cuatro mil sesenta. D: treinta y cuatro mil seis.',
      },
    },
    grading: {
      mode: 'choice',
      correct: 'B',
      explanationSource: 'vine-authored',
      explanation: {
        en: 'The number has 3 thousands, 4 hundreds, 0 tens, and 6 ones, so it is written as three thousand four hundred six.',
        es: 'El número tiene 3 unidades de mil, 4 centenas, 0 decenas y 6 unidades, por lo que se escribe tres mil cuatrocientos seis.',
      },
    },
  },
  {
    id: 'nysed-2026-g3-q14',
    examId: EXAM_ID,
    sectionSlug: SECTION_SLUG,
    number: 14,
    session: 1,
    sourcePage: 9,
    type: 'multiple-choice',
    points: 1,
    primaryStandard: 'NGLS.Math.Content.NY-3.NBT.1',
    cluster: CLUSTER,
    image: {
      en: { src: `${IMAGE_ROOT}/en/q14.webp`, width: 1005, height: 423 },
      es: { src: `${IMAGE_ROOT}/es/q14.webp`, width: 1142, height: 422 },
      alt: {
        en: 'Question 14. What is the number 2,355 rounded to the nearest ten? A: 2,300. B: 2,350. C: 2,360. D: 2,400.',
        es: 'Pregunta 14. ¿Cuál es el número 2,355 redondeado a la decena más cercana? A: 2,300. B: 2,350. C: 2,360. D: 2,400.',
      },
    },
    grading: {
      mode: 'choice',
      correct: 'C',
      explanationSource: 'vine-authored',
      explanation: {
        en: 'The ones digit is 5, so round the tens place up. The nearest ten is 2,360, which is choice C.',
        es: 'El dígito de las unidades es 5, así que se redondea la posición de las decenas hacia arriba. La decena más cercana es 2,360, que es la opción C.',
      },
    },
  },
  {
    id: 'nysed-2026-g3-q24',
    examId: EXAM_ID,
    sectionSlug: SECTION_SLUG,
    number: 24,
    session: 1,
    sourcePage: 14,
    type: 'multiple-choice',
    points: 1,
    primaryStandard: 'NGLS.Math.Content.NY-3.NBT.4a',
    cluster: CLUSTER,
    image: {
      en: { src: `${IMAGE_ROOT}/en/q24.webp`, width: 1102, height: 423 },
      es: { src: `${IMAGE_ROOT}/es/q24.webp`, width: 992, height: 423 },
      alt: {
        en: 'Question 24. Which value does the digit 6 represent in the number 7,461? A: 6 ones. B: 6 tens. C: 6 hundreds. D: 6 thousands.',
        es: 'Pregunta 24. ¿Qué valor representa el dígito 6 en el número 7,461? A: 6 unidades. B: 6 decenas. C: 6 centenas. D: 6 unidades de mil.',
      },
    },
    grading: {
      mode: 'choice',
      correct: 'B',
      explanationSource: 'vine-authored',
      explanation: {
        en: 'In 7,461, the digit 6 is in the tens place, so it represents 6 tens, or 60. Choice B is correct.',
        es: 'En 7,461, el dígito 6 está en la posición de las decenas, por lo que representa 6 decenas, o 60. La opción B es correcta.',
      },
    },
  },
  {
    id: 'nysed-2026-g3-q32',
    examId: EXAM_ID,
    sectionSlug: SECTION_SLUG,
    number: 32,
    session: 2,
    sourcePage: 23,
    type: 'short-answer',
    points: 1,
    primaryStandard: 'NGLS.Math.Content.NY-3.NBT.3',
    cluster: CLUSTER,
    image: {
      en: { src: `${IMAGE_ROOT}/en/q32.webp`, width: 786, height: 288 },
      es: { src: `${IMAGE_ROOT}/es/q32.webp`, width: 981, height: 288 },
      alt: {
        en: 'Question 32. This question is worth 1 credit. An incomplete equation is shown below: 7 × 50 = (blank × 10). What number makes the equation true?',
        es: 'Pregunta 32. Esta pregunta tiene un valor de 1 crédito. A continuación, se muestra una ecuación incompleta: 7 × 50 = (espacio en blanco × 10). ¿Qué número hace que la ecuación sea verdadera?',
      },
    },
    grading: {
      mode: 'exact',
      acceptedAnswers: ['35'],
      explanationSource: 'vine-authored',
      explanation: {
        en: 'First find 7 × 50 = 350. Since 35 × 10 = 350, the missing number is 35.',
        es: 'Primero calcula 7 × 50 = 350. Como 35 × 10 = 350, el número que falta es 35.',
      },
    },
  },
]
