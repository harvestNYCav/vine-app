import type { MathExamDefinition } from '../types'

export const GRADE_3_2026_EXAM_ID = 'nysed-2026-grade-3'

export const GRADE_3_2026_EXAM: MathExamDefinition = {
  id: GRADE_3_2026_EXAM_ID,
  slug: '2026-grade-3',
  year: 2026,
  grade: 3,
  standardsFramework: 'NGLS',
  supportedLanguages: ['en', 'es'],
  title: {
    en: 'New York Grade 3 Math',
    es: 'Matemáticas de Nueva York - Grado 3',
  },
  description: {
    en: 'Learn each Grade 3 math domain, then practice with official released New York State questions.',
    es: 'Aprende cada área de matemáticas de tercer grado y luego practica con preguntas oficiales publicadas por el Estado de Nueva York.',
  },
  sourceTitle: {
    en: '2026 NYS Grade 3 Mathematics Test Released Questions',
    es: 'Preguntas publicadas del examen de Matemáticas de 3.er grado del Estado de Nueva York de 2026',
  },
  sourceUrl: {
    en: 'https://www.nysedregents.org/ei/math/2026/2026-released-items-math-g3.pdf',
    es: 'https://www.nysedregents.org/ei/math/2026/spanish/2026-released-items-math-g3-spanish.pdf',
  },
  accessedAt: '2026-07-11',
  sections: [
    {
      slug: 'operations-algebra',
      emoji: '🧩',
      title: { en: 'Operations & Algebra', es: 'Operaciones y álgebra' },
      description: {
        en: 'Multiplication, division, patterns, equations, and two-step problems.',
        es: 'Multiplicación, división, patrones, ecuaciones y problemas de dos pasos.',
      },
      overview: {
        en: 'Operations and Algebraic Thinking is about seeing the structure behind a problem. You will connect multiplication and division, use properties to rewrite expressions, find unknown values, and decide which operations a story problem needs.',
        es: 'Operaciones y pensamiento algebraico trata de ver la estructura de un problema. Conectarás la multiplicación y la división, usarás propiedades para reescribir expresiones, hallarás valores desconocidos y decidirás qué operaciones necesita un problema verbal.',
      },
      learningGoals: [
        { en: 'Interpret multiplication and division situations.', es: 'Interpretar situaciones de multiplicación y división.' },
        { en: 'Use patterns and properties to solve efficiently.', es: 'Usar patrones y propiedades para resolver de manera eficiente.' },
        { en: 'Represent and solve one- and two-step word problems.', es: 'Representar y resolver problemas verbales de uno y dos pasos.' },
      ],
      strategy: {
        en: 'Name what each number represents before choosing an operation. For an unknown factor, turn multiplication into a related division fact.',
        es: 'Di qué representa cada número antes de elegir una operación. Para un factor desconocido, convierte la multiplicación en una división relacionada.',
      },
      workedExample: {
        prompt: {
          en: 'There are 6 trays with 8 muffins on each tray. How many muffins are there in all?',
          es: 'Hay 6 bandejas con 8 panecillos en cada bandeja. ¿Cuántos panecillos hay en total?',
        },
        steps: [
          { en: 'Equal groups tell us to multiply: 6 groups x 8 in each group.', es: 'Los grupos iguales nos indican que debemos multiplicar: 6 grupos x 8 en cada grupo.' },
          { en: 'Use a known fact: 5 x 8 = 40, then add one more group of 8.', es: 'Usa un dato conocido: 5 x 8 = 40, luego suma un grupo más de 8.' },
          { en: '40 + 8 = 48.', es: '40 + 8 = 48.' },
        ],
        answer: { en: 'There are 48 muffins.', es: 'Hay 48 panecillos.' },
      },
      questionIds: [3, 7, 10, 12, 17, 20, 22, 29, 35, 38].map(number => `nysed-2026-g3-q${number}`),
    },
    {
      slug: 'measurement-data',
      emoji: '📏',
      title: { en: 'Measurement & Data', es: 'Medición y datos' },
      description: {
        en: 'Area, liquid volume, time, graphs, and measurement problem solving.',
        es: 'Área, volumen líquido, tiempo, gráficas y resolución de problemas de medición.',
      },
      overview: {
        en: 'Measurement connects numbers to the real world. You will read scales and graphs, measure area with unit squares, and reason about elapsed time and quantities with units.',
        es: 'La medición conecta los números con el mundo real. Leerás escalas y gráficas, medirás el área con unidades cuadradas y razonarás sobre el tiempo transcurrido y cantidades con unidades.',
      },
      learningGoals: [
        { en: 'Find area by counting or multiplying unit squares.', es: 'Hallar el área contando o multiplicando unidades cuadradas.' },
        { en: 'Read and compare measurements and data displays.', es: 'Leer y comparar mediciones y representaciones de datos.' },
        { en: 'Solve elapsed-time and measurement word problems.', es: 'Resolver problemas verbales de tiempo transcurrido y medición.' },
      ],
      strategy: {
        en: 'Write the unit beside every value. Before calculating, ask whether the answer should be a length, an area, a volume, a time, or a difference.',
        es: 'Escribe la unidad junto a cada valor. Antes de calcular, pregunta si la respuesta debe ser una longitud, un área, un volumen, una hora o una diferencia.',
      },
      workedExample: {
        prompt: {
          en: 'A rectangle has 4 rows of 7 unit squares. What is its area?',
          es: 'Un rectángulo tiene 4 filas de 7 unidades cuadradas. ¿Cuál es su área?',
        },
        steps: [
          { en: 'Area counts the unit squares covering the rectangle.', es: 'El área cuenta las unidades cuadradas que cubren el rectángulo.' },
          { en: 'There are 4 equal rows with 7 squares in each row.', es: 'Hay 4 filas iguales con 7 cuadrados en cada fila.' },
          { en: '4 x 7 = 28.', es: '4 x 7 = 28.' },
        ],
        answer: { en: 'The area is 28 square units.', es: 'El área es 28 unidades cuadradas.' },
      },
      questionIds: [4, 6, 8, 16, 18, 25, 26, 28, 36].map(number => `nysed-2026-g3-q${number}`),
    },
    {
      slug: 'fractions',
      emoji: '🍕',
      title: { en: 'Fractions', es: 'Fracciones' },
      description: {
        en: 'Equal parts, number lines, equivalent fractions, and comparing fractions.',
        es: 'Partes iguales, rectas numéricas, fracciones equivalentes y comparación de fracciones.',
      },
      overview: {
        en: 'A fraction names equal parts of one whole. You will connect shaded models and number lines to fraction symbols, recognize equivalent fractions, and compare fractions that refer to the same whole.',
        es: 'Una fracción nombra partes iguales de un entero. Conectarás modelos sombreados y rectas numéricas con símbolos de fracciones, reconocerás fracciones equivalentes y compararás fracciones del mismo entero.',
      },
      learningGoals: [
        { en: 'Identify the numerator and denominator in a visual model.', es: 'Identificar el numerador y el denominador en un modelo visual.' },
        { en: 'Place and interpret fractions on a number line.', es: 'Ubicar e interpretar fracciones en una recta numérica.' },
        { en: 'Recognize and compare equivalent fractions.', es: 'Reconocer y comparar fracciones equivalentes.' },
      ],
      strategy: {
        en: 'First check that the whole is divided into equal parts. The denominator counts all equal parts; the numerator counts the parts being described.',
        es: 'Primero verifica que el entero esté dividido en partes iguales. El denominador cuenta todas las partes iguales; el numerador cuenta las partes descritas.',
      },
      workedExample: {
        prompt: {
          en: 'A rectangle is divided into 8 equal pieces and 4 are shaded. What fraction is shaded?',
          es: 'Un rectángulo está dividido en 8 partes iguales y 4 están sombreadas. ¿Qué fracción está sombreada?',
        },
        steps: [
          { en: 'There are 8 equal parts in all, so the denominator is 8.', es: 'Hay 8 partes iguales en total, por eso el denominador es 8.' },
          { en: 'There are 4 shaded parts, so the numerator is 4.', es: 'Hay 4 partes sombreadas, por eso el numerador es 4.' },
          { en: 'The model shows 4/8, which is the same amount as 1/2.', es: 'El modelo muestra 4/8, que es la misma cantidad que 1/2.' },
        ],
        answer: { en: 'The shaded fraction is 4/8, or 1/2.', es: 'La fracción sombreada es 4/8, o 1/2.' },
      },
      questionIds: [1, 5, 11, 15, 19, 27, 33, 37].map(number => `nysed-2026-g3-q${number}`),
    },
    {
      slug: 'base-ten',
      emoji: '🔢',
      title: { en: 'Base Ten & Place Value', es: 'Base diez y valor posicional' },
      description: {
        en: 'Place value, number names, rounding, and multiplying by tens.',
        es: 'Valor posicional, nombres de números, redondeo y multiplicación por decenas.',
      },
      overview: {
        en: 'Our number system is built in groups of ten. A digit has a different value depending on its place, and that structure helps us read, round, compare, and calculate with larger numbers.',
        es: 'Nuestro sistema numérico se construye en grupos de diez. Un dígito tiene un valor diferente según su posición, y esa estructura nos ayuda a leer, redondear, comparar y calcular con números mayores.',
      },
      learningGoals: [
        { en: 'Read and write multi-digit whole numbers.', es: 'Leer y escribir números enteros de varios dígitos.' },
        { en: 'Identify the value represented by a digit.', es: 'Identificar el valor representado por un dígito.' },
        { en: 'Use place value to round and multiply by multiples of ten.', es: 'Usar el valor posicional para redondear y multiplicar por múltiplos de diez.' },
      ],
      strategy: {
        en: 'Label the places from right to left: ones, tens, hundreds, thousands. When rounding, look only at the digit immediately to the right of the target place.',
        es: 'Nombra las posiciones de derecha a izquierda: unidades, decenas, centenas, millares. Al redondear, mira solo el dígito inmediatamente a la derecha de la posición indicada.',
      },
      workedExample: {
        prompt: {
          en: 'What value does the digit 7 represent in 4,782?',
          es: '¿Qué valor representa el dígito 7 en 4,782?',
        },
        steps: [
          { en: 'Read the places from right: 2 ones, 8 tens, 7 hundreds, 4 thousands.', es: 'Lee las posiciones desde la derecha: 2 unidades, 8 decenas, 7 centenas, 4 millares.' },
          { en: 'The 7 is in the hundreds place.', es: 'El 7 está en la posición de las centenas.' },
          { en: '7 hundreds = 700.', es: '7 centenas = 700.' },
        ],
        answer: { en: 'The digit 7 represents 700.', es: 'El dígito 7 representa 700.' },
      },
      questionIds: [2, 14, 24, 32].map(number => `nysed-2026-g3-q${number}`),
    },
    {
      slug: 'geometry',
      emoji: '📐',
      title: { en: 'Geometry', es: 'Geometría' },
      description: {
        en: 'Equal-area parts and reasoning about shapes.',
        es: 'Partes de igual área y razonamiento sobre figuras.',
      },
      overview: {
        en: 'Geometry describes shapes and how they can be partitioned. Equal-area parts do not have to look identical, but together they must cover the whole without gaps or overlaps.',
        es: 'La geometría describe figuras y cómo se pueden dividir. Las partes de igual área no tienen que verse idénticas, pero juntas deben cubrir el entero sin espacios ni superposiciones.',
      },
      learningGoals: [
        { en: 'Recognize when a whole is divided into equal-area parts.', es: 'Reconocer cuándo un entero está dividido en partes de igual área.' },
        { en: 'Describe each equal part as a unit fraction.', es: 'Describir cada parte igual como una fracción unitaria.' },
      ],
      strategy: {
        en: 'Count the equal-area parts, not just the lines or corners. If a whole has n equal-area parts, each part is 1/n of the whole.',
        es: 'Cuenta las partes de igual área, no solo las líneas o esquinas. Si un entero tiene n partes de igual área, cada parte es 1/n del entero.',
      },
      workedExample: {
        prompt: {
          en: 'A square is divided into 4 parts with the same area. What fraction of the square is each part?',
          es: 'Un cuadrado está dividido en 4 partes con la misma área. ¿Qué fracción del cuadrado es cada parte?',
        },
        steps: [
          { en: 'The square is the whole.', es: 'El cuadrado es el entero.' },
          { en: 'There are 4 parts, and every part has the same area.', es: 'Hay 4 partes y cada parte tiene la misma área.' },
          { en: 'One of 4 equal parts is 1/4.', es: 'Una de 4 partes iguales es 1/4.' },
        ],
        answer: { en: 'Each part is 1/4 of the square.', es: 'Cada parte es 1/4 del cuadrado.' },
      },
      questionIds: [23, 30].map(number => `nysed-2026-g3-q${number}`),
    },
  ],
}
