import type { MathExamQuestionRecord } from '../types'

const EXAM_ID = 'nysed-2026-grade-3'
const SECTION_SLUG = 'geometry'
const CLUSTER = 'Geometry'
const IMAGE_ROOT = '/vine-app/nysed/2026-grade-3/geometry'

export const GEOMETRY_QUESTIONS: MathExamQuestionRecord[] = [
  {
    id: 'nysed-2026-g3-q23',
    examId: EXAM_ID,
    sectionSlug: SECTION_SLUG,
    number: 23,
    session: 1,
    sourcePage: 14,
    type: 'multiple-choice',
    points: 1,
    primaryStandard: 'NGLS.Math.Content.NY-3.G.2',
    cluster: CLUSTER,
    image: {
      en: { src: `${IMAGE_ROOT}/en/q23.webp`, width: 1359, height: 589 },
      es: { src: `${IMAGE_ROOT}/es/q23.webp`, width: 1399, height: 589 },
      alt: {
        en: 'Question 23. A square is cut into 8 parts. Each part has the same area. What fraction of the entire area of the square is each part? A: 1/8. B: 7/1. C: 8/1. D: 8/8.',
        es: 'Pregunta 23. Un cuadrado se corta en 8 partes. Cada parte tiene la misma área. ¿Qué fracción del área entera del cuadrado es cada parte? A: 1/8. B: 7/1. C: 8/1. D: 8/8.',
      },
    },
    grading: {
      mode: 'choice',
      correct: 'A',
      explanationSource: 'vine-authored',
      explanation: {
        en: 'The whole is divided into 8 equal-area parts, so each single part is 1 out of 8, or 1/8. Choice A is correct.',
        es: 'El entero está dividido en 8 partes de igual área, por lo que cada parte es 1 de 8, o 1/8. La opción A es correcta.',
      },
    },
  },
  {
    id: 'nysed-2026-g3-q30',
    examId: EXAM_ID,
    sectionSlug: SECTION_SLUG,
    number: 30,
    session: 2,
    sourcePage: 22,
    type: 'multiple-choice',
    points: 1,
    primaryStandard: 'NGLS.Math.Content.NY-3.G.2',
    cluster: CLUSTER,
    image: {
      en: { src: `${IMAGE_ROOT}/en/q30.webp`, width: 1436, height: 634 },
      es: { src: `${IMAGE_ROOT}/es/q30.webp`, width: 1414, height: 717 },
      alt: {
        en: 'Question 30. Which shape is divided into equal parts that each have an area of 1/4 of the whole? A: a circle divided by two crossing lines into 4 unequal regions. B: a diamond-shaped square divided into 4 equal smaller squares. C: a triangle divided by one vertical and one horizontal line into 4 unequal regions. D: a rectangle divided by diagonal lines into 4 unequal regions.',
        es: 'Pregunta 30. ¿Qué forma está dividida en partes iguales que tiene, cada una, un área de 1/4 del entero? A: un círculo dividido por dos líneas que se cruzan en 4 regiones desiguales. B: un cuadrado en forma de rombo dividido en 4 cuadrados más pequeños e iguales. C: un triángulo dividido por una línea vertical y una horizontal en 4 regiones desiguales. D: un rectángulo dividido por líneas diagonales en 4 regiones desiguales.',
      },
    },
    grading: {
      mode: 'choice',
      correct: 'B',
      explanationSource: 'vine-authored',
      explanation: {
        en: 'Choice B divides the whole into 4 equal-area squares. Each of those parts is 1/4 of the whole.',
        es: 'La opción B divide el entero en 4 cuadrados de igual área. Cada una de esas partes es 1/4 del entero.',
      },
    },
  },
]
