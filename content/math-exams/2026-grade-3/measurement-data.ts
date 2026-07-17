import type { MathExamQuestionRecord } from '../types'

export const MEASUREMENT_DATA_QUESTIONS: MathExamQuestionRecord[] = [
  {
    id: 'nysed-2026-g3-q4',
    examId: 'nysed-2026-grade-3',
    sectionSlug: 'measurement-data',
    number: 4,
    session: 1,
    sourcePage: 5,
    type: 'multiple-choice',
    points: 1,
    primaryStandard: 'NGLS.Math.Content.NY-3.MD.2b',
    secondaryStandards: ['NGLS.Math.Content.NY-3.MD.2a'],
    cluster: 'Measurement and Data',
    image: {
      en: {
        src: '/vine-app/nysed/2026-grade-3/measurement-data/en/q04.webp',
        width: 1623,
        height: 1180,
      },
      es: {
        src: '/vine-app/nysed/2026-grade-3/measurement-data/es/q04.webp',
        width: 1569,
        height: 1128,
      },
      alt: {
        en: 'Question 4. The picture below shows water in a bucket. The bucket scale is labeled 5 L, 10 L, 15 L, 20 L, and 25 L; the water reaches 10 L. How many liters of water will be in the bucket after 5 more liters of water are poured into it? A: 10. B: 15. C: 20. D: 25.',
        es: 'Pregunta 4. La siguiente imagen muestra agua en una cubeta. La escala de la cubeta está marcada 5 L, 10 L, 15 L, 20 L y 25 L; el agua llega a 10 L. ¿Cuántos litros de agua habrá en la cubeta después de verter otros 5 litros? A: 10. B: 15. C: 20. D: 25.',
      },
    },
    grading: {
      mode: 'choice',
      correct: 'B',
      explanationSource: 'vine-authored',
      explanation: {
        en: 'The picture starts at 10 liters. Adding 5 liters gives 10 + 5 = 15 liters, so B is correct.',
        es: 'La imagen comienza con 10 litros. Al sumar 5 litros, 10 + 5 = 15 litros, por lo que B es correcta.',
      },
    },
  },
  {
    id: 'nysed-2026-g3-q6',
    examId: 'nysed-2026-grade-3',
    sectionSlug: 'measurement-data',
    number: 6,
    session: 1,
    sourcePage: 6,
    type: 'multiple-choice',
    points: 1,
    primaryStandard: 'NGLS.Math.Content.NY-3.MD.2b',
    cluster: 'Measurement and Data',
    image: {
      en: {
        src: '/vine-app/nysed/2026-grade-3/measurement-data/en/q06.webp',
        width: 1712,
        height: 848,
      },
      es: {
        src: '/vine-app/nysed/2026-grade-3/measurement-data/es/q06.webp',
        width: 1686,
        height: 848,
      },
      alt: {
        en: 'Question 6. A group of students collected trash to clean up their neighborhood. The trash they collected each month for two months is shown below. The trash collected in September was 59 kilograms. The trash collected in October was 81 kilograms. What is the difference, in kilograms, between the trash collected in September and October? A: 20. B: 22. C: 32. D: 38.',
        es: 'Pregunta 6. Un grupo de estudiantes recolectó basura para limpiar su vecindario. A continuación, se muestra la basura que se recolectó cada mes, durante dos meses. En septiembre, se recolectaron 59 kilogramos de basura. En octubre, se recolectaron 81 kilogramos de basura. ¿Cuál es la diferencia, en kilogramos, entre la basura recolectada en septiembre y octubre? A: 20. B: 22. C: 32. D: 38.',
      },
    },
    grading: {
      mode: 'choice',
      correct: 'B',
      explanationSource: 'vine-authored',
      explanation: {
        en: 'A difference is found with subtraction: 81 - 59 = 22 kilograms, so B is correct.',
        es: 'Una diferencia se encuentra con una resta: 81 - 59 = 22 kilogramos, por lo que B es correcta.',
      },
    },
  },
  {
    id: 'nysed-2026-g3-q8',
    examId: 'nysed-2026-grade-3',
    sectionSlug: 'measurement-data',
    number: 8,
    session: 1,
    sourcePage: 7,
    type: 'multiple-choice',
    points: 1,
    primaryStandard: 'NGLS.Math.Content.NY-3.MD.7a',
    cluster: 'Measurement and Data',
    image: {
      en: {
        src: '/vine-app/nysed/2026-grade-3/measurement-data/en/q08.webp',
        width: 1685,
        height: 984,
      },
      es: {
        src: '/vine-app/nysed/2026-grade-3/measurement-data/es/q08.webp',
        width: 1679,
        height: 1036,
      },
      alt: {
        en: 'Question 8. The rectangle shown below is covered completely with unit squares without gaps or overlaps. The diagram has 7 rows with 9 unit squares in each row, and the key says one square equals 1 square unit. Which two ways result in finding the area, in square units, of the rectangle? A: multiply 8 and 6; add 6 rows of 8. B: multiply 8 and 7; add 7 rows of 8. C: multiply 9 and 6; add 6 rows of 9. D: multiply 9 and 7; add 7 rows of 9.',
        es: 'Pregunta 8. El siguiente rectángulo está completamente cubierto por cuadrados unitarios, sin que queden huecos ni se superpongan. El diagrama tiene 7 filas con 9 cuadrados unitarios en cada fila, y la referencia indica que un cuadrado equivale a 1 unidad cuadrada. ¿Cuáles son las dos maneras que dan como resultado el área, en unidades cuadradas, del rectángulo? A: multiplicar 8 por 6; sumar 6 filas de 8. B: multiplicar 8 por 7; sumar 7 filas de 8. C: multiplicar 9 por 6; sumar 6 filas de 9. D: multiplicar 9 por 7; sumar 7 filas de 9.',
      },
    },
    grading: {
      mode: 'choice',
      correct: 'D',
      explanationSource: 'vine-authored',
      explanation: {
        en: 'The rectangle has 9 squares in each of 7 rows. Its area is 9 × 7, which is also 7 rows of 9, so D is correct.',
        es: 'El rectángulo tiene 9 cuadrados en cada una de 7 filas. Su área es 9 × 7, que también son 7 filas de 9, por lo que D es correcta.',
      },
    },
  },
  {
    id: 'nysed-2026-g3-q16',
    examId: 'nysed-2026-grade-3',
    sectionSlug: 'measurement-data',
    number: 16,
    session: 1,
    sourcePage: 10,
    type: 'multiple-choice',
    points: 1,
    primaryStandard: 'NGLS.Math.Content.NY-3.MD.6',
    cluster: 'Measurement and Data',
    image: {
      en: {
        src: '/vine-app/nysed/2026-grade-3/measurement-data/en/q16.webp',
        width: 1496,
        height: 1078,
      },
      es: {
        src: '/vine-app/nysed/2026-grade-3/measurement-data/es/q16.webp',
        width: 1570,
        height: 1131,
      },
      alt: {
        en: 'Question 16. Part of the grid shown below is shaded. The grid has 7 columns and 8 rows, and the key says each unit square equals 1 square unit. Rows 2 through 4 have columns 2 and 3 shaded. Rows 5 through 7 have columns 2 through 5 shaded. The first and last rows are unshaded. What is the area, in square units, of the part of the grid that is shaded? A: 12. B: 18. C: 20. D: 24.',
        es: 'Pregunta 16. Parte de la cuadrilla que se muestra a continuación está sombreada. La cuadrilla tiene 7 columnas y 8 filas, y la referencia indica que cada cuadrado unitario equivale a 1 unidad cuadrada. En las filas 2 a 4 están sombreadas las columnas 2 y 3. En las filas 5 a 7 están sombreadas las columnas 2 a 5. La primera y la última fila no están sombreadas. ¿Cuál es el área, en unidades cuadradas, de la parte de la cuadrilla que está sombreada? A: 12. B: 18. C: 20. D: 24.',
      },
    },
    grading: {
      mode: 'choice',
      correct: 'B',
      explanationSource: 'vine-authored',
      explanation: {
        en: 'Break the shaded L into two rectangles: 2 × 6 = 12 and 2 × 3 = 6. Then 12 + 6 = 18 square units, so B is correct.',
        es: 'Divide la L sombreada en dos rectángulos: 2 × 6 = 12 y 2 × 3 = 6. Luego, 12 + 6 = 18 unidades cuadradas, por lo que B es correcta.',
      },
    },
  },
  {
    id: 'nysed-2026-g3-q18',
    examId: 'nysed-2026-grade-3',
    sectionSlug: 'measurement-data',
    number: 18,
    session: 1,
    sourcePage: 11,
    type: 'multiple-choice',
    points: 1,
    primaryStandard: 'NGLS.Math.Content.NY-3.MD.7b',
    cluster: 'Measurement and Data',
    image: {
      en: {
        src: '/vine-app/nysed/2026-grade-3/measurement-data/en/q18.webp',
        width: 1548,
        height: 538,
      },
      es: {
        src: '/vine-app/nysed/2026-grade-3/measurement-data/es/q18.webp',
        width: 1688,
        height: 538,
      },
      alt: {
        en: 'Question 18. A rug in the shape of a square has side lengths of 6 feet. What is the area, in square feet, of the rug? A: 12. B: 24. C: 30. D: 36.',
        es: 'Pregunta 18. Las longitudes de los lados de una alfombra con forma de cuadrado miden 6 pies. ¿Cuál es el área, en pies cuadrados, de la alfombra? A: 12. B: 24. C: 30. D: 36.',
      },
    },
    grading: {
      mode: 'choice',
      correct: 'D',
      explanationSource: 'vine-authored',
      explanation: {
        en: 'A square with side length 6 feet has area 6 × 6 = 36 square feet, so D is correct.',
        es: 'Un cuadrado con lados de 6 pies tiene un área de 6 × 6 = 36 pies cuadrados, por lo que D es correcta.',
      },
    },
  },
  {
    id: 'nysed-2026-g3-q25',
    examId: 'nysed-2026-grade-3',
    sectionSlug: 'measurement-data',
    number: 25,
    session: 1,
    sourcePage: 15,
    type: 'multiple-choice',
    points: 1,
    primaryStandard: 'NGLS.Math.Content.NY-3.MD.7c',
    cluster: 'Measurement and Data',
    image: {
      en: {
        src: '/vine-app/nysed/2026-grade-3/measurement-data/en/q25.webp',
        width: 1707,
        height: 941,
      },
      es: {
        src: '/vine-app/nysed/2026-grade-3/measurement-data/es/q25.webp',
        width: 1707,
        height: 1044,
      },
      alt: {
        en: 'Question 25. The model below shows a rectangular floor covered with gray tiles and white tiles. The model has 5 rows and 10 columns of unit squares. The first 4 columns are gray and the remaining 6 columns are white. The key says one square equals 1 square unit. Which expression can be used to find the area, in square units, of the entire floor? A: (5 × 4) + (5 × 6). B: (5 × 4) × (5 × 6). C: (5 + 4) + (5 + 6). D: (5 + 4) × (5 + 6).',
        es: 'Pregunta 25. El siguiente modelo muestra un piso rectangular totalmente cubierto con baldosas grises y baldosas blancas. El modelo tiene 5 filas y 10 columnas de cuadrados unitarios. Las primeras 4 columnas son grises y las 6 columnas restantes son blancas. La referencia indica que un cuadrado equivale a 1 unidad cuadrada. ¿Qué expresión podría usarse para encontrar el área, en unidades cuadradas, de todo el piso? A: (5 × 4) + (5 × 6). B: (5 × 4) × (5 × 6). C: (5 + 4) + (5 + 6). D: (5 + 4) × (5 + 6).',
      },
    },
    grading: {
      mode: 'choice',
      correct: 'A',
      explanationSource: 'vine-authored',
      explanation: {
        en: 'The gray part is 5 × 4 and the white part is 5 × 6. Add those two areas, so A is correct.',
        es: 'La parte gris mide 5 × 4 y la parte blanca mide 5 × 6. Se suman las dos áreas, por lo que A es correcta.',
      },
    },
  },
  {
    id: 'nysed-2026-g3-q26',
    examId: 'nysed-2026-grade-3',
    sectionSlug: 'measurement-data',
    number: 26,
    session: 2,
    sourcePage: 20,
    type: 'multiple-choice',
    points: 1,
    primaryStandard: 'NGLS.Math.Content.NY-3.MD.5b',
    cluster: 'Measurement and Data',
    image: {
      en: {
        src: '/vine-app/nysed/2026-grade-3/measurement-data/en/q26.webp',
        width: 1508,
        height: 538,
      },
      es: {
        src: '/vine-app/nysed/2026-grade-3/measurement-data/es/q26.webp',
        width: 1670,
        height: 538,
      },
      alt: {
        en: 'Question 26. How many unit squares are needed to cover a rectangle with an area of 18 square units without any gaps or overlaps? A: 3. B: 6. C: 18. D: 36.',
        es: 'Pregunta 26. ¿Cuántos cuadrados unitarios se necesitan para cubrir un rectángulo con un área de 18 unidades cuadradas sin que queden huecos ni se superpongan? A: 3. B: 6. C: 18. D: 36.',
      },
    },
    grading: {
      mode: 'choice',
      correct: 'C',
      explanationSource: 'vine-authored',
      explanation: {
        en: 'Each unit square covers exactly 1 square unit, so covering 18 square units requires 18 unit squares. C is correct.',
        es: 'Cada cuadrado unitario cubre exactamente 1 unidad cuadrada, por lo que cubrir 18 unidades cuadradas requiere 18 cuadrados unitarios. C es correcta.',
      },
    },
  },
  {
    id: 'nysed-2026-g3-q28',
    examId: 'nysed-2026-grade-3',
    sectionSlug: 'measurement-data',
    number: 28,
    session: 2,
    sourcePage: 21,
    type: 'multiple-choice',
    points: 1,
    primaryStandard: 'NGLS.Math.Content.NY-3.MD.7d',
    cluster: 'Measurement and Data',
    image: {
      en: {
        src: '/vine-app/nysed/2026-grade-3/measurement-data/en/q28.webp',
        width: 1676,
        height: 1286,
      },
      es: {
        src: '/vine-app/nysed/2026-grade-3/measurement-data/es/q28.webp',
        width: 1683,
        height: 1286,
      },
      alt: {
        en: 'Question 28. Two rectangular gardens are built next to each other to create one large garden. The side lengths of the large garden are shown below. The large garden is L-shaped: the left side is 8 feet, the bottom is 8 feet, the top segment is 3 feet, the horizontal step is 5 feet, and the right side is 5 feet. What is the total area, in square feet, of the large garden? A: 29. B: 32. C: 49. D: 54.',
        es: 'Pregunta 28. Se construyen dos jardines rectangulares uno al lado del otro para crear un jardín grande. A continuación, se muestra el largo de los laterales del jardín grande. El jardín grande tiene forma de L: el lado izquierdo mide 8 pies, la base mide 8 pies, el segmento superior mide 3 pies, el escalón horizontal mide 5 pies y el lado derecho mide 5 pies. ¿Cuál es el área total, en pies cuadrados, del jardín grande? A: 29. B: 32. C: 49. D: 54.',
      },
    },
    grading: {
      mode: 'choice',
      correct: 'C',
      explanationSource: 'vine-authored',
      explanation: {
        en: 'Split the garden into a 3-by-8 rectangle and a 5-by-5 rectangle. Their areas are 24 and 25, and 24 + 25 = 49 square feet, so C is correct.',
        es: 'Divide el jardín en un rectángulo de 3 por 8 y otro de 5 por 5. Sus áreas son 24 y 25, y 24 + 25 = 49 pies cuadrados, por lo que C es correcta.',
      },
    },
  },
  {
    id: 'nysed-2026-g3-q36',
    examId: 'nysed-2026-grade-3',
    sectionSlug: 'measurement-data',
    number: 36,
    session: 2,
    sourcePage: 26,
    type: 'constructed-response',
    points: 2,
    primaryStandard: 'NGLS.Math.Content.NY-3.MD.1',
    cluster: 'Measurement and Data',
    image: {
      en: {
        src: '/vine-app/nysed/2026-grade-3/measurement-data/en/q36.webp',
        width: 1720,
        height: 295,
      },
      es: {
        src: '/vine-app/nysed/2026-grade-3/measurement-data/es/q36.webp',
        width: 1669,
        height: 287,
      },
      alt: {
        en: 'Question 36. This question is worth 2 credits. A student starts painting at 5:39 p.m. The student spends 30 minutes painting, and then spends 8 minutes cleaning up. What time does the student finish cleaning up? Show your work. Answer: blank, p.m.',
        es: 'Pregunta 36. Esta pregunta tiene un valor de 2 créditos. Un alumno comienza a pintar a las 5:39 p. m. Dedica 30 minutos a pintar y luego pasa 8 minutos limpiando. ¿A qué hora termina de limpiar el alumno? Muestre cómo lo resolvió. Respuesta: espacio en blanco, p. m.',
      },
    },
    grading: {
      mode: 'self-assessed',
      explanationSource: 'vine-authored',
      explanation: {
        en: 'Add the elapsed time in two steps: 5:39 p.m. + 30 minutes = 6:09 p.m., then 6:09 p.m. + 8 minutes = 6:17 p.m.',
        es: 'Suma el tiempo transcurrido en dos pasos: 5:39 p. m. + 30 minutos = 6:09 p. m.; luego, 6:09 p. m. + 8 minutos = 6:17 p. m.',
      },
      criteria: [
        {
          en: 'The work correctly adds 30 minutes and then 8 minutes, or adds 38 minutes total, while crossing from 5 o’clock to 6 o’clock.',
          es: 'El trabajo suma correctamente 30 minutos y luego 8 minutos, o suma 38 minutos en total, al pasar de las 5 a las 6.',
        },
        {
          en: 'The final answer is 6:17 p.m. and includes the correct time label.',
          es: 'La respuesta final es 6:17 p. m. e incluye la indicación de hora correcta.',
        },
      ],
    },
  },
]
