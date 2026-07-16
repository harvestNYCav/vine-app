import type { GradeLevel } from '@/lib/grade-levels'
import type {
  LocalizedText,
  MathExamSectionDefinition,
  MathExamWorkedExample,
} from './types'

export type MathDomainCode =
  | 'OA'
  | 'NBT'
  | 'NF'
  | 'MD'
  | 'G'
  | 'RP'
  | 'NS'
  | 'EE'
  | 'F'
  | 'SP'

type DomainMeta = {
  slug: string
  emoji: string
  title: LocalizedText
}

type DomainLessonBody = {
  description: LocalizedText
  overview: LocalizedText
  learningGoals: LocalizedText[]
  strategy: LocalizedText
  workedExample: MathExamWorkedExample
}

const DOMAIN_META: Record<MathDomainCode, DomainMeta> = {
  OA: {
    slug: 'operations-algebra',
    emoji: '🧩',
    title: { en: 'Operations & Algebraic Thinking', es: 'Operaciones y pensamiento algebraico' },
  },
  NBT: {
    slug: 'base-ten',
    emoji: '🔢',
    title: { en: 'Numbers & Operations in Base Ten', es: 'Números y operaciones en base diez' },
  },
  NF: {
    slug: 'fractions',
    emoji: '🍕',
    title: { en: 'Numbers & Operations—Fractions', es: 'Números y operaciones—Fracciones' },
  },
  MD: {
    slug: 'measurement-data',
    emoji: '📏',
    title: { en: 'Measurement & Data', es: 'Medición y datos' },
  },
  G: {
    slug: 'geometry',
    emoji: '📐',
    title: { en: 'Geometry', es: 'Geometría' },
  },
  RP: {
    slug: 'ratios-proportions',
    emoji: '⚖️',
    title: { en: 'Ratios & Proportional Relationships', es: 'Razones y relaciones proporcionales' },
  },
  NS: {
    slug: 'number-system',
    emoji: '➗',
    title: { en: 'The Number System', es: 'El sistema numérico' },
  },
  EE: {
    slug: 'expressions-equations',
    emoji: '🧮',
    title: { en: 'Expressions & Equations', es: 'Expresiones y ecuaciones' },
  },
  F: {
    slug: 'functions',
    emoji: '📈',
    title: { en: 'Functions', es: 'Funciones' },
  },
  SP: {
    slug: 'statistics-probability',
    emoji: '📊',
    title: { en: 'Statistics & Probability', es: 'Estadística y probabilidad' },
  },
}

const GRADE_DOMAIN_LESSONS: Record<
  GradeLevel,
  Partial<Record<MathDomainCode, DomainLessonBody>>
> = {
  3: {
    OA: {
      description: {
        en: 'Multiply, divide, solve two-step problems, and describe arithmetic patterns.',
        es: 'Multiplica, divide, resuelve problemas de dos pasos y describe patrones aritméticos.',
      },
      overview: {
        en: 'In Grade 3, multiplication describes equal groups and division finds a group size or number of groups. Their inverse relationship, operation properties, and patterns help you solve facts within 100 and two-step problems.',
        es: 'En 3.er grado, la multiplicación describe grupos iguales y la división halla el tamaño o la cantidad de grupos. Su relación inversa, las propiedades y los patrones ayudan a resolver operaciones hasta 100 y problemas de dos pasos.',
      },
      learningGoals: [
        { en: 'Represent multiplication and division with models and equations.', es: 'Representar la multiplicación y la división con modelos y ecuaciones.' },
        { en: 'Use fact families and properties to calculate within 100.', es: 'Usar familias de operaciones y propiedades para calcular hasta 100.' },
        { en: 'Solve two-step problems and identify arithmetic patterns.', es: 'Resolver problemas de dos pasos e identificar patrones aritméticos.' },
      ],
      strategy: {
        en: 'Draw equal groups or an array, write the matching equation, and use the inverse operation to check a missing factor or quotient.',
        es: 'Dibuja grupos iguales o una matriz, escribe la ecuación correspondiente y usa la operación inversa para comprobar un factor o cociente desconocido.',
      },
      workedExample: {
        prompt: { en: 'Four bags hold 6 apples each. Three apples are eaten. How many apples remain?', es: 'Cuatro bolsas contienen 6 manzanas cada una. Se comen 3 manzanas. ¿Cuántas quedan?' },
        steps: [
          { en: 'Find the total in the equal groups: 4 × 6 = 24.', es: 'Halla el total de los grupos iguales: 4 × 6 = 24.' },
          { en: 'Subtract the 3 apples that were eaten: 24 − 3.', es: 'Resta las 3 manzanas que se comieron: 24 − 3.' },
          { en: '24 − 3 = 21.', es: '24 − 3 = 21.' },
        ],
        answer: { en: '21 apples remain.', es: 'Quedan 21 manzanas.' },
      },
    },
    NBT: {
      description: {
        en: 'Use place value to round, add, subtract, and multiply by tens.',
        es: 'Usa el valor posicional para redondear, sumar, restar y multiplicar por decenas.',
      },
      overview: {
        en: 'Grade 3 place-value work extends through 1,000. You round to the nearest ten or hundred, add and subtract within 1,000, and multiply one-digit numbers by multiples of ten.',
        es: 'En 3.er grado, el valor posicional se extiende hasta 1,000. Redondeas a la decena o centena más cercana, sumas y restas hasta 1,000 y multiplicas números de una cifra por múltiplos de diez.',
      },
      learningGoals: [
        { en: 'Round whole numbers to the nearest ten or hundred.', es: 'Redondear números enteros a la decena o centena más cercana.' },
        { en: 'Add and subtract accurately within 1,000.', es: 'Sumar y restar con precisión hasta 1,000.' },
        { en: 'Use place value to multiply a one-digit number by a multiple of 10.', es: 'Usar el valor posicional para multiplicar un número de una cifra por un múltiplo de 10.' },
      ],
      strategy: {
        en: 'Line up equal place values. When regrouping, record the new tens or hundreds before continuing.',
        es: 'Alinea valores posicionales iguales. Al reagrupar, anota las nuevas decenas o centenas antes de continuar.',
      },
      workedExample: {
        prompt: { en: 'Find 347 + 286.', es: 'Calcula 347 + 286.' },
        steps: [
          { en: 'Add ones: 7 + 6 = 13; write 3 and regroup 1 ten.', es: 'Suma unidades: 7 + 6 = 13; escribe 3 y reagrupa 1 decena.' },
          { en: 'Add tens: 1 + 4 + 8 = 13; write 3 and regroup 1 hundred.', es: 'Suma decenas: 1 + 4 + 8 = 13; escribe 3 y reagrupa 1 centena.' },
          { en: 'Add hundreds: 1 + 3 + 2 = 6.', es: 'Suma centenas: 1 + 3 + 2 = 6.' },
        ],
        answer: { en: '347 + 286 = 633.', es: '347 + 286 = 633.' },
      },
    },
    NF: {
      description: {
        en: 'Understand fractions as equal parts and as numbers on a number line.',
        es: 'Comprende las fracciones como partes iguales y como números en una recta numérica.',
      },
      overview: {
        en: 'A Grade 3 fraction is built from unit fractions such as 1/4. Models and number lines show the whole, the number of equal parts, equivalence, and comparisons with the same whole.',
        es: 'Una fracción de 3.er grado se forma con fracciones unitarias como 1/4. Los modelos y las rectas numéricas muestran el entero, las partes iguales, la equivalencia y comparaciones del mismo entero.',
      },
      learningGoals: [
        { en: 'Explain the numerator and denominator using equal parts.', es: 'Explicar el numerador y el denominador usando partes iguales.' },
        { en: 'Place simple fractions on a number line.', es: 'Ubicar fracciones sencillas en una recta numérica.' },
        { en: 'Recognize equivalent fractions and compare fractions with the same numerator or denominator.', es: 'Reconocer fracciones equivalentes y comparar fracciones con el mismo numerador o denominador.' },
      ],
      strategy: {
        en: 'Mark the same whole into equal intervals. Compare the size or number of parts only after checking that the wholes match.',
        es: 'Divide el mismo entero en intervalos iguales. Compara el tamaño o la cantidad de partes solo después de comprobar que los enteros sean iguales.',
      },
      workedExample: {
        prompt: { en: 'Which is greater, 3/4 or 2/4?', es: '¿Cuál es mayor, 3/4 o 2/4?' },
        steps: [
          { en: 'Both fractions use the same whole and have denominator 4.', es: 'Ambas fracciones usan el mismo entero y tienen denominador 4.' },
          { en: 'Each fourth is the same size, so compare the numerators.', es: 'Cada cuarto tiene el mismo tamaño, así que compara los numeradores.' },
          { en: 'Three fourths are more than two fourths.', es: 'Tres cuartos son más que dos cuartos.' },
        ],
        answer: { en: '3/4 > 2/4.', es: '3/4 > 2/4.' },
      },
    },
    MD: {
      description: {
        en: 'Solve problems with time, mass, volume, graphs, area, and perimeter.',
        es: 'Resuelve problemas de tiempo, masa, volumen, gráficas, área y perímetro.',
      },
      overview: {
        en: 'Grade 3 measurement connects units to real situations. You tell time to the minute, measure mass and liquid volume, read scaled graphs, and distinguish area from perimeter.',
        es: 'La medición de 3.er grado conecta las unidades con situaciones reales. Lees la hora al minuto, mides masa y volumen líquido, interpretas gráficas con escala y distingues área de perímetro.',
      },
      learningGoals: [
        { en: 'Solve elapsed-time, mass, and liquid-volume problems.', es: 'Resolver problemas de tiempo transcurrido, masa y volumen líquido.' },
        { en: 'Read picture graphs, bar graphs, and line plots with scales.', es: 'Leer pictogramas, gráficas de barras y diagramas de puntos con escalas.' },
        { en: 'Find and compare area and perimeter.', es: 'Hallar y comparar área y perímetro.' },
      ],
      strategy: {
        en: 'Write the unit next to every measurement. For elapsed time, jump to a friendly clock time and then add the jumps.',
        es: 'Escribe la unidad junto a cada medida. Para el tiempo transcurrido, avanza hasta una hora conveniente y luego suma los intervalos.',
      },
      workedExample: {
        prompt: { en: 'A movie starts at 2:35 p.m. and ends at 3:10 p.m. How long is it?', es: 'Una película empieza a las 2:35 p. m. y termina a las 3:10 p. m. ¿Cuánto dura?' },
        steps: [
          { en: 'From 2:35 to 3:00 is 25 minutes.', es: 'De 2:35 a 3:00 hay 25 minutos.' },
          { en: 'From 3:00 to 3:10 is 10 minutes.', es: 'De 3:00 a 3:10 hay 10 minutos.' },
          { en: '25 + 10 = 35 minutes.', es: '25 + 10 = 35 minutos.' },
        ],
        answer: { en: 'The movie is 35 minutes long.', es: 'La película dura 35 minutos.' },
      },
    },
    G: {
      description: {
        en: 'Classify quadrilaterals and partition shapes into equal fractional parts.',
        es: 'Clasifica cuadriláteros y divide figuras en partes fraccionarias iguales.',
      },
      overview: {
        en: 'Grade 3 geometry focuses on attributes of quadrilaterals and equal-area partitions. A shape may belong to more than one category because it can have several defining properties.',
        es: 'La geometría de 3.er grado se centra en los atributos de los cuadriláteros y las divisiones de igual área. Una figura puede pertenecer a más de una categoría porque puede tener varias propiedades definitorias.',
      },
      learningGoals: [
        { en: 'Classify quadrilaterals by sides and angles.', es: 'Clasificar cuadriláteros por sus lados y ángulos.' },
        { en: 'Explain why a shape can belong to more than one category.', es: 'Explicar por qué una figura puede pertenecer a más de una categoría.' },
        { en: 'Partition shapes into equal areas and name each share as a unit fraction.', es: 'Dividir figuras en áreas iguales y nombrar cada parte como fracción unitaria.' },
      ],
      strategy: {
        en: 'Use only marked or stated properties. Check each category definition instead of judging a shape by how it looks.',
        es: 'Usa solo las propiedades marcadas o indicadas. Comprueba la definición de cada categoría en vez de juzgar la figura por su apariencia.',
      },
      workedExample: {
        prompt: { en: 'A square has four right angles and four equal sides. Is it also a rectangle?', es: 'Un cuadrado tiene cuatro ángulos rectos y cuatro lados iguales. ¿También es un rectángulo?' },
        steps: [
          { en: 'A rectangle is a quadrilateral with four right angles.', es: 'Un rectángulo es un cuadrilátero con cuatro ángulos rectos.' },
          { en: 'The square has four sides and four right angles.', es: 'El cuadrado tiene cuatro lados y cuatro ángulos rectos.' },
          { en: 'Having four equal sides does not stop it from being a rectangle.', es: 'Tener cuatro lados iguales no impide que sea un rectángulo.' },
        ],
        answer: { en: 'Yes. Every square is also a rectangle.', es: 'Sí. Todo cuadrado también es un rectángulo.' },
      },
    },
  },
  4: {
    OA: {
      description: {
        en: 'Use multiplicative comparisons, factors, and patterns in multi-step problems.',
        es: 'Usa comparaciones multiplicativas, factores y patrones en problemas de varios pasos.',
      },
      overview: {
        en: 'Grade 4 operations include statements such as “five times as many,” multi-step whole-number problems, factor pairs, multiples, prime and composite numbers, and patterns made by rules.',
        es: 'Las operaciones de 4.º grado incluyen expresiones como “cinco veces más,” problemas de varios pasos con enteros, pares de factores, múltiplos, números primos y compuestos y patrones generados por reglas.',
      },
      learningGoals: [
        { en: 'Represent multiplicative comparisons with equations.', es: 'Representar comparaciones multiplicativas con ecuaciones.' },
        { en: 'Solve multi-step problems and interpret remainders.', es: 'Resolver problemas de varios pasos e interpretar residuos.' },
        { en: 'Find factor pairs, identify multiples, and analyze patterns.', es: 'Hallar pares de factores, identificar múltiplos y analizar patrones.' },
      ],
      strategy: {
        en: 'Translate “times as many” as multiplication, label each intermediate result, and decide what any remainder means in the situation.',
        es: 'Traduce “veces más” como multiplicación, nombra cada resultado intermedio y decide qué significa cualquier residuo en la situación.',
      },
      workedExample: {
        prompt: { en: 'Lina has 7 stickers. Omar has 5 times as many. How many stickers does Omar have?', es: 'Lina tiene 7 pegatinas. Omar tiene 5 veces esa cantidad. ¿Cuántas pegatinas tiene Omar?' },
        steps: [
          { en: '“5 times as many as 7” means 5 × 7.', es: '“5 veces la cantidad de 7” significa 5 × 7.' },
          { en: 'Use the multiplication fact 5 × 7 = 35.', es: 'Usa la operación 5 × 7 = 35.' },
          { en: 'Check: 35 ÷ 7 = 5.', es: 'Comprueba: 35 ÷ 7 = 5.' },
        ],
        answer: { en: 'Omar has 35 stickers.', es: 'Omar tiene 35 pegatinas.' },
      },
    },
    NBT: {
      description: {
        en: 'Use place value through 1,000,000 and compute with multi-digit whole numbers.',
        es: 'Usa el valor posicional hasta 1,000,000 y calcula con números enteros de varias cifras.',
      },
      overview: {
        en: 'In Grade 4, each place is ten times the place to its right. This structure supports reading, comparing, and rounding large numbers, plus multi-digit addition, subtraction, multiplication, and division.',
        es: 'En 4.º grado, cada posición vale diez veces la posición a su derecha. Esta estructura permite leer, comparar y redondear números grandes, además de sumar, restar, multiplicar y dividir números de varias cifras.',
      },
      learningGoals: [
        { en: 'Read, compare, and round whole numbers through 1,000,000.', es: 'Leer, comparar y redondear números enteros hasta 1,000,000.' },
        { en: 'Add and subtract multi-digit whole numbers fluently.', es: 'Sumar y restar con fluidez números enteros de varias cifras.' },
        { en: 'Multiply up to four-digit by one-digit numbers and divide by one-digit divisors.', es: 'Multiplicar números de hasta cuatro cifras por una cifra y dividir entre divisores de una cifra.' },
      ],
      strategy: {
        en: 'Estimate first, align place values, and use partial products or quotients so every step has a clear place-value meaning.',
        es: 'Estima primero, alinea los valores posicionales y usa productos o cocientes parciales para que cada paso tenga un significado posicional claro.',
      },
      workedExample: {
        prompt: { en: 'Find 3,482 × 6.', es: 'Calcula 3,482 × 6.' },
        steps: [
          { en: 'Break 3,482 into 3,000 + 400 + 80 + 2.', es: 'Descompón 3,482 en 3,000 + 400 + 80 + 2.' },
          { en: 'Multiply each part by 6: 18,000 + 2,400 + 480 + 12.', es: 'Multiplica cada parte por 6: 18,000 + 2,400 + 480 + 12.' },
          { en: 'Add the partial products: 20,892.', es: 'Suma los productos parciales: 20,892.' },
        ],
        answer: { en: '3,482 × 6 = 20,892.', es: '3,482 × 6 = 20,892.' },
      },
    },
    NF: {
      description: {
        en: 'Build equivalent fractions and calculate with fractions and decimal notation.',
        es: 'Construye fracciones equivalentes y calcula con fracciones y notación decimal.',
      },
      overview: {
        en: 'Grade 4 fraction work uses equivalence to compare fractions, joins and separates fractions with like denominators, multiplies a fraction by a whole number, and connects tenths to hundredths and decimals.',
        es: 'En 4.º grado, la equivalencia se usa para comparar fracciones, sumar y restar fracciones con denominadores iguales, multiplicar una fracción por un entero y conectar décimos, centésimos y decimales.',
      },
      learningGoals: [
        { en: 'Generate and explain equivalent fractions.', es: 'Generar y explicar fracciones equivalentes.' },
        { en: 'Add and subtract fractions and mixed numbers with like denominators.', es: 'Sumar y restar fracciones y números mixtos con denominadores iguales.' },
        { en: 'Multiply a fraction by a whole number and compare decimal fractions.', es: 'Multiplicar una fracción por un entero y comparar fracciones decimales.' },
      ],
      strategy: {
        en: 'Keep the size of each part fixed when adding like denominators; combine only the number of parts. Use equivalence before comparing unlike denominators.',
        es: 'Mantén fijo el tamaño de cada parte al sumar denominadores iguales; combina solo la cantidad de partes. Usa equivalencia antes de comparar denominadores distintos.',
      },
      workedExample: {
        prompt: { en: 'Find 2 1/4 + 1 2/4.', es: 'Calcula 2 1/4 + 1 2/4.' },
        steps: [
          { en: 'Add the whole numbers: 2 + 1 = 3.', es: 'Suma los enteros: 2 + 1 = 3.' },
          { en: 'Add the fourths: 1/4 + 2/4 = 3/4.', es: 'Suma los cuartos: 1/4 + 2/4 = 3/4.' },
          { en: 'Combine the whole and fractional parts.', es: 'Combina la parte entera y la fraccionaria.' },
        ],
        answer: { en: '2 1/4 + 1 2/4 = 3 3/4.', es: '2 1/4 + 1 2/4 = 3 3/4.' },
      },
    },
    MD: {
      description: {
        en: 'Convert measurements, interpret fractional data, and measure angles.',
        es: 'Convierte medidas, interpreta datos fraccionarios y mide ángulos.',
      },
      overview: {
        en: 'Grade 4 measurement connects equivalent units within one system, perimeter and area formulas, line plots with fractional values, and angle measure as part of a full 360° turn.',
        es: 'La medición de 4.º grado conecta unidades equivalentes de un sistema, fórmulas de perímetro y área, diagramas de puntos con valores fraccionarios y los ángulos como parte de un giro completo de 360°.',
      },
      learningGoals: [
        { en: 'Convert larger units to smaller units within one measurement system.', es: 'Convertir unidades mayores en menores dentro de un sistema de medida.' },
        { en: 'Solve perimeter, area, and fractional line-plot problems.', es: 'Resolver problemas de perímetro, área y diagramas de puntos con fracciones.' },
        { en: 'Measure, draw, add, and subtract angles.', es: 'Medir, dibujar, sumar y restar ángulos.' },
      ],
      strategy: {
        en: 'Write a conversion fact first, then multiply by the number of larger units. For angles, place the protractor center on the vertex and start at 0°.',
        es: 'Escribe primero una equivalencia y luego multiplica por la cantidad de unidades mayores. Para ángulos, coloca el centro del transportador en el vértice y empieza en 0°.',
      },
      workedExample: {
        prompt: { en: 'A ribbon is 3 feet long. How many inches long is it?', es: 'Una cinta mide 3 pies. ¿Cuántas pulgadas mide?' },
        steps: [
          { en: 'Use the conversion 1 foot = 12 inches.', es: 'Usa la equivalencia 1 pie = 12 pulgadas.' },
          { en: 'There are 3 groups of 12 inches.', es: 'Hay 3 grupos de 12 pulgadas.' },
          { en: '3 × 12 = 36.', es: '3 × 12 = 36.' },
        ],
        answer: { en: 'The ribbon is 36 inches long.', es: 'La cinta mide 36 pulgadas.' },
      },
    },
    G: {
      description: {
        en: 'Draw and classify lines, angles, triangles, and quadrilaterals.',
        es: 'Dibuja y clasifica rectas, ángulos, triángulos y cuadriláteros.',
      },
      overview: {
        en: 'Grade 4 geometry uses parallel and perpendicular lines, angle types, shape hierarchies, and lines of symmetry. Classification depends on stated properties, not a figure’s orientation.',
        es: 'La geometría de 4.º grado usa rectas paralelas y perpendiculares, tipos de ángulos, jerarquías de figuras y ejes de simetría. La clasificación depende de las propiedades, no de la orientación de la figura.',
      },
      learningGoals: [
        { en: 'Identify and draw points, lines, rays, and angle types.', es: 'Identificar y dibujar puntos, rectas, semirrectas y tipos de ángulos.' },
        { en: 'Classify triangles and quadrilaterals by their properties.', es: 'Clasificar triángulos y cuadriláteros por sus propiedades.' },
        { en: 'Recognize and draw lines of symmetry.', es: 'Reconocer y dibujar ejes de simetría.' },
      ],
      strategy: {
        en: 'Mark right angles, equal sides, and parallel lines, then test the figure against every category definition that applies.',
        es: 'Marca los ángulos rectos, lados iguales y rectas paralelas; luego compara la figura con cada definición que corresponda.',
      },
      workedExample: {
        prompt: { en: 'A triangle has one 90° angle and two equal sides. How can it be classified?', es: 'Un triángulo tiene un ángulo de 90° y dos lados iguales. ¿Cómo se clasifica?' },
        steps: [
          { en: 'A triangle with a 90° angle is a right triangle.', es: 'Un triángulo con un ángulo de 90° es rectángulo.' },
          { en: 'A triangle with two equal sides is isosceles.', es: 'Un triángulo con dos lados iguales es isósceles.' },
          { en: 'Both descriptions can be true at the same time.', es: 'Ambas descripciones pueden ser verdaderas a la vez.' },
        ],
        answer: { en: 'It is an isosceles right triangle.', es: 'Es un triángulo rectángulo isósceles.' },
      },
    },
  },
  5: {
    OA: {
      description: {
        en: 'Evaluate numerical expressions and analyze paired numerical patterns.',
        es: 'Evalúa expresiones numéricas y analiza pares de patrones numéricos.',
      },
      overview: {
        en: 'Grade 5 operations use parentheses, brackets, and braces to group calculations. Two rules can generate related patterns that are compared in tables or on a coordinate plane.',
        es: 'Las operaciones de 5.º grado usan paréntesis, corchetes y llaves para agrupar cálculos. Dos reglas pueden generar patrones relacionados que se comparan en tablas o en el plano de coordenadas.',
      },
      learningGoals: [
        { en: 'Write and evaluate expressions with grouping symbols.', es: 'Escribir y evaluar expresiones con símbolos de agrupación.' },
        { en: 'Interpret a numerical expression without always calculating it.', es: 'Interpretar una expresión numérica sin tener que calcularla siempre.' },
        { en: 'Generate two patterns and explain their relationship.', es: 'Generar dos patrones y explicar su relación.' },
      ],
      strategy: {
        en: 'Work from the innermost grouping symbols outward, then multiply or divide before adding or subtracting.',
        es: 'Trabaja desde los símbolos de agrupación más internos hacia afuera; luego multiplica o divide antes de sumar o restar.',
      },
      workedExample: {
        prompt: { en: 'Evaluate 3 × (8 + 4) − 5.', es: 'Evalúa 3 × (8 + 4) − 5.' },
        steps: [
          { en: 'Evaluate the parentheses: 8 + 4 = 12.', es: 'Evalúa el paréntesis: 8 + 4 = 12.' },
          { en: 'Multiply: 3 × 12 = 36.', es: 'Multiplica: 3 × 12 = 36.' },
          { en: 'Subtract: 36 − 5 = 31.', es: 'Resta: 36 − 5 = 31.' },
        ],
        answer: { en: 'The value of the expression is 31.', es: 'El valor de la expresión es 31.' },
      },
    },
    NBT: {
      description: {
        en: 'Use powers of ten and compute with whole numbers and decimals.',
        es: 'Usa potencias de diez y calcula con números enteros y decimales.',
      },
      overview: {
        en: 'Grade 5 place value extends to thousandths. Powers of ten explain decimal shifts, while place-value models and standard algorithms support whole-number division and decimal operations.',
        es: 'El valor posicional de 5.º grado se extiende hasta los milésimos. Las potencias de diez explican los cambios decimales, y los modelos y algoritmos apoyan la división de enteros y las operaciones con decimales.',
      },
      learningGoals: [
        { en: 'Explain place-value relationships using powers of 10.', es: 'Explicar relaciones de valor posicional usando potencias de 10.' },
        { en: 'Read, compare, and round decimals through thousandths.', es: 'Leer, comparar y redondear decimales hasta los milésimos.' },
        { en: 'Compute with multi-digit whole numbers and decimals through hundredths.', es: 'Calcular con enteros de varias cifras y decimales hasta los centésimos.' },
      ],
      strategy: {
        en: 'Estimate the size of the answer, align decimal points for addition or subtraction, and use place-value reasoning to place the decimal in a product or quotient.',
        es: 'Estima el tamaño de la respuesta, alinea los puntos decimales al sumar o restar y usa el valor posicional para ubicar el decimal en un producto o cociente.',
      },
      workedExample: {
        prompt: { en: 'Find 4.7 × 3.', es: 'Calcula 4.7 × 3.' },
        steps: [
          { en: 'Think of 4.7 as 47 tenths.', es: 'Piensa en 4.7 como 47 décimos.' },
          { en: '47 tenths × 3 = 141 tenths.', es: '47 décimos × 3 = 141 décimos.' },
          { en: '141 tenths equals 14.1.', es: '141 décimos equivalen a 14.1.' },
        ],
        answer: { en: '4.7 × 3 = 14.1.', es: '4.7 × 3 = 14.1.' },
      },
    },
    NF: {
      description: {
        en: 'Add, subtract, multiply, and divide fractions in Grade 5 situations.',
        es: 'Suma, resta, multiplica y divide fracciones en situaciones de 5.º grado.',
      },
      overview: {
        en: 'Grade 5 fraction operations include adding unlike denominators, interpreting multiplication as scaling, multiplying fractions, and dividing unit fractions by whole numbers or whole numbers by unit fractions.',
        es: 'Las operaciones con fracciones de 5.º grado incluyen sumar denominadores distintos, interpretar la multiplicación como escala, multiplicar fracciones y dividir fracciones unitarias entre enteros o enteros entre fracciones unitarias.',
      },
      learningGoals: [
        { en: 'Add and subtract fractions with unlike denominators.', es: 'Sumar y restar fracciones con denominadores distintos.' },
        { en: 'Interpret and calculate products of fractions.', es: 'Interpretar y calcular productos de fracciones.' },
        { en: 'Solve division problems involving a unit fraction and a whole number.', es: 'Resolver divisiones que incluyan una fracción unitaria y un número entero.' },
      ],
      strategy: {
        en: 'Use a common denominator only for addition or subtraction. For multiplication, multiply the factors directly and check whether scaling should make the result larger or smaller.',
        es: 'Usa un denominador común solo para sumar o restar. Para multiplicar, multiplica los factores directamente y comprueba si la escala debe producir un resultado mayor o menor.',
      },
      workedExample: {
        prompt: { en: 'Find 2/3 + 3/4.', es: 'Calcula 2/3 + 3/4.' },
        steps: [
          { en: 'Use 12 as a common denominator.', es: 'Usa 12 como denominador común.' },
          { en: 'Rewrite: 2/3 = 8/12 and 3/4 = 9/12.', es: 'Reescribe: 2/3 = 8/12 y 3/4 = 9/12.' },
          { en: 'Add: 8/12 + 9/12 = 17/12 = 1 5/12.', es: 'Suma: 8/12 + 9/12 = 17/12 = 1 5/12.' },
        ],
        answer: { en: '2/3 + 3/4 = 1 5/12.', es: '2/3 + 3/4 = 1 5/12.' },
      },
    },
    MD: {
      description: {
        en: 'Convert units, analyze fractional data, and find volume.',
        es: 'Convierte unidades, analiza datos fraccionarios y halla volumen.',
      },
      overview: {
        en: 'Grade 5 measurement includes conversions within a system, line plots with fraction operations, and volume as the number of unit cubes in a right rectangular prism.',
        es: 'La medición de 5.º grado incluye conversiones dentro de un sistema, diagramas de puntos con operaciones de fracciones y el volumen como cantidad de cubos unitarios en un prisma rectangular recto.',
      },
      learningGoals: [
        { en: 'Convert measurement units to solve multi-step problems.', es: 'Convertir unidades de medida para resolver problemas de varios pasos.' },
        { en: 'Use fraction operations with data on a line plot.', es: 'Usar operaciones con fracciones en datos de un diagrama de puntos.' },
        { en: 'Find volume with unit cubes and V = l × w × h.', es: 'Hallar volumen con cubos unitarios y V = l × a × h.' },
      ],
      strategy: {
        en: 'For volume, identify three perpendicular dimensions, multiply them, and label the result in cubic units.',
        es: 'Para el volumen, identifica tres dimensiones perpendiculares, multiplícalas y expresa el resultado en unidades cúbicas.',
      },
      workedExample: {
        prompt: { en: 'A rectangular prism is 4 units long, 3 units wide, and 5 units high. What is its volume?', es: 'Un prisma rectangular mide 4 unidades de largo, 3 de ancho y 5 de alto. ¿Cuál es su volumen?' },
        steps: [
          { en: 'Use V = length × width × height.', es: 'Usa V = largo × ancho × altura.' },
          { en: 'Substitute the dimensions: V = 4 × 3 × 5.', es: 'Sustituye las dimensiones: V = 4 × 3 × 5.' },
          { en: '4 × 3 × 5 = 60.', es: '4 × 3 × 5 = 60.' },
        ],
        answer: { en: 'The volume is 60 cubic units.', es: 'El volumen es 60 unidades cúbicas.' },
      },
    },
    G: {
      description: {
        en: 'Graph points in the first quadrant and classify shapes in a hierarchy.',
        es: 'Representa puntos en el primer cuadrante y clasifica figuras en una jerarquía.',
      },
      overview: {
        en: 'Grade 5 geometry uses ordered pairs to locate points in the first quadrant and organizes two-dimensional figures by inherited properties—for example, every square is also a rectangle and a rhombus.',
        es: 'La geometría de 5.º grado usa pares ordenados para ubicar puntos en el primer cuadrante y organiza figuras bidimensionales por propiedades heredadas; por ejemplo, todo cuadrado también es rectángulo y rombo.',
      },
      learningGoals: [
        { en: 'Interpret the x- and y-coordinates of an ordered pair.', es: 'Interpretar las coordenadas x e y de un par ordenado.' },
        { en: 'Graph points to represent real situations and numerical patterns.', es: 'Representar puntos para modelar situaciones y patrones numéricos.' },
        { en: 'Classify two-dimensional figures in a property hierarchy.', es: 'Clasificar figuras bidimensionales en una jerarquía de propiedades.' },
      ],
      strategy: {
        en: 'Start at the origin: move horizontally for x, then vertically for y. For classification, trace all categories whose definitions the shape satisfies.',
        es: 'Empieza en el origen: muévete horizontalmente para x y luego verticalmente para y. Para clasificar, identifica todas las categorías cuyas definiciones cumple la figura.',
      },
      workedExample: {
        prompt: { en: 'Point A is at (2, 3). How do you locate it?', es: 'El punto A está en (2, 3). ¿Cómo lo ubicas?' },
        steps: [
          { en: 'Begin at the origin, (0, 0).', es: 'Empieza en el origen, (0, 0).' },
          { en: 'Move 2 units right for the x-coordinate.', es: 'Muévete 2 unidades a la derecha por la coordenada x.' },
          { en: 'Move 3 units up for the y-coordinate and plot the point.', es: 'Muévete 3 unidades hacia arriba por la coordenada y y marca el punto.' },
        ],
        answer: { en: 'Point A is 2 units right and 3 units up from the origin.', es: 'El punto A está 2 unidades a la derecha y 3 unidades arriba del origen.' },
      },
    },
  },
  6: {
    RP: {
      description: {
        en: 'Reason with ratios, unit rates, percentages, and measurement conversions.',
        es: 'Razona con razones, tasas unitarias, porcentajes y conversiones de medida.',
      },
      overview: {
        en: 'Grade 6 ratio reasoning compares two quantities and uses equivalent ratios or unit rates to solve problems. Tables, double number lines, equations, and percent models show the same relationship.',
        es: 'El razonamiento de razones de 6.º grado compara dos cantidades y usa razones equivalentes o tasas unitarias para resolver problemas. Tablas, rectas numéricas dobles, ecuaciones y modelos de porcentaje muestran la misma relación.',
      },
      learningGoals: [
        { en: 'Interpret ratio language and generate equivalent ratios.', es: 'Interpretar el lenguaje de razones y generar razones equivalentes.' },
        { en: 'Find unit rates, including rates involving fractions.', es: 'Hallar tasas unitarias, incluso tasas con fracciones.' },
        { en: 'Solve percent and unit-conversion problems with ratio reasoning.', es: 'Resolver problemas de porcentajes y conversiones con razonamiento de razones.' },
      ],
      strategy: {
        en: 'Label both quantities and their units, find the amount for one unit, and scale that unit rate to the amount requested.',
        es: 'Nombra ambas cantidades y sus unidades, halla la cantidad por una unidad y escala esa tasa unitaria hasta la cantidad pedida.',
      },
      workedExample: {
        prompt: { en: 'Five notebooks cost $15. At the same rate, what do 8 notebooks cost?', es: 'Cinco cuadernos cuestan $15. A la misma tasa, ¿cuánto cuestan 8 cuadernos?' },
        steps: [
          { en: 'Find the cost per notebook: $15 ÷ 5 = $3.', es: 'Halla el costo por cuaderno: $15 ÷ 5 = $3.' },
          { en: 'Multiply the unit rate by 8 notebooks.', es: 'Multiplica la tasa unitaria por 8 cuadernos.' },
          { en: '$3 × 8 = $24.', es: '$3 × 8 = $24.' },
        ],
        answer: { en: 'Eight notebooks cost $24.', es: 'Ocho cuadernos cuestan $24.' },
      },
    },
    NS: {
      description: {
        en: 'Divide fractions, calculate with decimals, and reason about signed numbers.',
        es: 'Divide fracciones, calcula con decimales y razona sobre números con signo.',
      },
      overview: {
        en: 'Grade 6 extends the number system to negative rational numbers. It also develops fraction division, fluent decimal computation, common factors and multiples, and coordinate reasoning in all four quadrants.',
        es: 'El 6.º grado extiende el sistema numérico a números racionales negativos. También desarrolla la división de fracciones, el cálculo decimal, factores y múltiplos comunes y coordenadas en los cuatro cuadrantes.',
      },
      learningGoals: [
        { en: 'Divide fractions and explain the quotient with a model or equation.', es: 'Dividir fracciones y explicar el cociente con un modelo o ecuación.' },
        { en: 'Compute fluently with multi-digit numbers and decimals.', es: 'Calcular con fluidez con números de varias cifras y decimales.' },
        { en: 'Order signed numbers and use absolute value and coordinates.', es: 'Ordenar números con signo y usar valor absoluto y coordenadas.' },
      ],
      strategy: {
        en: 'For fraction division, ask how many groups of the divisor fit in the dividend, then multiply by the reciprocal and check the size of the quotient.',
        es: 'Para dividir fracciones, pregunta cuántos grupos del divisor caben en el dividendo; luego multiplica por el recíproco y comprueba el tamaño del cociente.',
      },
      workedExample: {
        prompt: { en: 'How many 1/8-cup servings are in 3/4 cup?', es: '¿Cuántas porciones de 1/8 de taza hay en 3/4 de taza?' },
        steps: [
          { en: 'Write the division: 3/4 ÷ 1/8.', es: 'Escribe la división: 3/4 ÷ 1/8.' },
          { en: 'Multiply by the reciprocal: 3/4 × 8/1.', es: 'Multiplica por el recíproco: 3/4 × 8/1.' },
          { en: '24/4 = 6.', es: '24/4 = 6.' },
        ],
        answer: { en: 'There are 6 servings.', es: 'Hay 6 porciones.' },
      },
    },
    EE: {
      description: {
        en: 'Use exponents, variables, equivalent expressions, one-step equations, and inequalities.',
        es: 'Usa exponentes, variables, expresiones equivalentes, ecuaciones de un paso y desigualdades.',
      },
      overview: {
        en: 'Grade 6 algebra moves between words, expressions, equations, tables, and graphs. Exponents and order of operations evaluate expressions, while properties and inverse operations reveal unknown values.',
        es: 'El álgebra de 6.º grado conecta palabras, expresiones, ecuaciones, tablas y gráficas. Los exponentes y el orden de operaciones evalúan expresiones, y las propiedades y operaciones inversas revelan valores desconocidos.',
      },
      learningGoals: [
        { en: 'Write and evaluate numerical and variable expressions with exponents.', es: 'Escribir y evaluar expresiones numéricas y variables con exponentes.' },
        { en: 'Use properties to identify equivalent expressions.', es: 'Usar propiedades para identificar expresiones equivalentes.' },
        { en: 'Solve one-variable equations and inequalities and represent dependent-variable relationships.', es: 'Resolver ecuaciones y desigualdades de una variable y representar relaciones entre variables dependientes.' },
      ],
      strategy: {
        en: 'Identify what the variable represents, use one inverse operation to isolate it, and substitute the solution into the original equation to check it.',
        es: 'Identifica qué representa la variable, usa una operación inversa para aislarla y sustituye la solución en la ecuación original para comprobarla.',
      },
      workedExample: {
        prompt: { en: 'Solve x/4 = 6.', es: 'Resuelve x/4 = 6.' },
        steps: [
          { en: 'The equation says an unknown number divided by 4 equals 6.', es: 'La ecuación dice que un número desconocido dividido entre 4 es igual a 6.' },
          { en: 'Multiply both sides by 4: x = 24.', es: 'Multiplica ambos lados por 4: x = 24.' },
          { en: 'Check: 24 ÷ 4 = 6.', es: 'Comprueba: 24 ÷ 4 = 6.' },
        ],
        answer: { en: 'x = 24.', es: 'x = 24.' },
      },
    },
    G: {
      description: {
        en: 'Find area, surface area, and volume using shapes, nets, and coordinates.',
        es: 'Halla área, área superficial y volumen usando figuras, redes y coordenadas.',
      },
      overview: {
        en: 'Grade 6 geometry decomposes polygons into triangles and rectangles, represents three-dimensional figures with nets, and uses formulas for area, surface area, and volume—including prisms with fractional edge lengths.',
        es: 'La geometría de 6.º grado descompone polígonos en triángulos y rectángulos, representa sólidos con redes y usa fórmulas de área, área superficial y volumen, incluso en prismas con aristas fraccionarias.',
      },
      learningGoals: [
        { en: 'Find areas of triangles, quadrilaterals, and composite polygons.', es: 'Hallar áreas de triángulos, cuadriláteros y polígonos compuestos.' },
        { en: 'Use coordinates to find side lengths and polygon areas.', es: 'Usar coordenadas para hallar longitudes y áreas de polígonos.' },
        { en: 'Find prism volume and surface area from dimensions or nets.', es: 'Hallar volumen y área superficial de prismas a partir de dimensiones o redes.' },
      ],
      strategy: {
        en: 'Decompose a complex figure into familiar pieces, label every dimension, calculate each piece, and combine only at the end.',
        es: 'Descompón una figura compleja en partes conocidas, marca cada dimensión, calcula cada parte y combínalas solo al final.',
      },
      workedExample: {
        prompt: { en: 'A triangle has base 8 units and perpendicular height 5 units. What is its area?', es: 'Un triángulo tiene base de 8 unidades y altura perpendicular de 5 unidades. ¿Cuál es su área?' },
        steps: [
          { en: 'Use A = 1/2 × base × height.', es: 'Usa A = 1/2 × base × altura.' },
          { en: 'Substitute: A = 1/2 × 8 × 5.', es: 'Sustituye: A = 1/2 × 8 × 5.' },
          { en: 'Half of 40 is 20.', es: 'La mitad de 40 es 20.' },
        ],
        answer: { en: 'The area is 20 square units.', es: 'El área es 20 unidades cuadradas.' },
      },
    },
    SP: {
      description: {
        en: 'Describe data distributions by their center, spread, and overall shape.',
        es: 'Describe distribuciones de datos por su centro, dispersión y forma general.',
      },
      overview: {
        en: 'Grade 6 statistics begins with questions that anticipate variability. Dot plots, histograms, and box plots reveal a distribution’s shape, while measures of center and spread summarize it in context.',
        es: 'La estadística de 6.º grado comienza con preguntas que anticipan variabilidad. Diagramas de puntos, histogramas y cajas muestran la forma de una distribución, y las medidas de centro y dispersión la resumen en contexto.',
      },
      learningGoals: [
        { en: 'Recognize statistical questions and collect appropriate data.', es: 'Reconocer preguntas estadísticas y recopilar datos apropiados.' },
        { en: 'Display numerical data with dot plots, histograms, and box plots.', es: 'Representar datos numéricos con diagramas de puntos, histogramas y cajas.' },
        { en: 'Use mean, median, range, and interquartile range to describe a distribution.', es: 'Usar media, mediana, rango y rango intercuartílico para describir una distribución.' },
      ],
      strategy: {
        en: 'Sort the data first, then choose measures that match the distribution; a strong outlier usually affects the mean more than the median.',
        es: 'Ordena primero los datos y elige medidas adecuadas para la distribución; un valor atípico fuerte suele afectar más a la media que a la mediana.',
      },
      workedExample: {
        prompt: { en: 'For 4, 5, 5, 6, 10, find the mean, median, and range.', es: 'Para 4, 5, 5, 6, 10, halla la media, mediana y rango.' },
        steps: [
          { en: 'Mean: (4 + 5 + 5 + 6 + 10) ÷ 5 = 30 ÷ 5 = 6.', es: 'Media: (4 + 5 + 5 + 6 + 10) ÷ 5 = 30 ÷ 5 = 6.' },
          { en: 'Median: the middle value is 5.', es: 'Mediana: el valor central es 5.' },
          { en: 'Range: 10 − 4 = 6.', es: 'Rango: 10 − 4 = 6.' },
        ],
        answer: { en: 'Mean = 6, median = 5, and range = 6.', es: 'Media = 6, mediana = 5 y rango = 6.' },
      },
    },
  },
  7: {
    RP: {
      description: {
        en: 'Analyze proportional relationships and solve percent and scale problems.',
        es: 'Analiza relaciones proporcionales y resuelve problemas de porcentajes y escalas.',
      },
      overview: {
        en: 'Grade 7 proportional reasoning finds unit rates with rational numbers, identifies the constant of proportionality in tables, graphs, and equations, and applies proportions to percents and scale drawings.',
        es: 'El razonamiento proporcional de 7.º grado halla tasas unitarias con números racionales, identifica la constante de proporcionalidad en tablas, gráficas y ecuaciones y aplica proporciones a porcentajes y dibujos a escala.',
      },
      learningGoals: [
        { en: 'Compute unit rates involving fractions.', es: 'Calcular tasas unitarias que incluyan fracciones.' },
        { en: 'Identify and represent proportional relationships with y = kx.', es: 'Identificar y representar relaciones proporcionales con y = kx.' },
        { en: 'Solve multi-step percent, markup, discount, tax, and scale problems.', es: 'Resolver problemas de varios pasos con porcentajes, aumentos, descuentos, impuestos y escalas.' },
      ],
      strategy: {
        en: 'Test whether y/x is constant. If it is, name that constant with units and use y = kx to scale or solve.',
        es: 'Comprueba si y/x es constante. Si lo es, nombra esa constante con unidades y usa y = kx para escalar o resolver.',
      },
      workedExample: {
        prompt: { en: 'A proportional relationship follows y = 2.5x. What is y when x = 6?', es: 'Una relación proporcional sigue y = 2.5x. ¿Cuánto vale y cuando x = 6?' },
        steps: [
          { en: 'The constant of proportionality is 2.5.', es: 'La constante de proporcionalidad es 2.5.' },
          { en: 'Substitute x = 6: y = 2.5(6).', es: 'Sustituye x = 6: y = 2.5(6).' },
          { en: '2.5 × 6 = 15.', es: '2.5 × 6 = 15.' },
        ],
        answer: { en: 'y = 15.', es: 'y = 15.' },
      },
    },
    NS: {
      description: {
        en: 'Apply all four operations to positive and negative rational numbers.',
        es: 'Aplica las cuatro operaciones a números racionales positivos y negativos.',
      },
      overview: {
        en: 'Grade 7 extends addition, subtraction, multiplication, and division to all rational numbers. Signed-number rules follow from number-line meaning and operation properties, not from signs alone.',
        es: 'El 7.º grado extiende suma, resta, multiplicación y división a todos los números racionales. Las reglas de signos se basan en la recta numérica y las propiedades, no solo en memorizar signos.',
      },
      learningGoals: [
        { en: 'Add and subtract rational numbers using distance and direction.', es: 'Sumar y restar números racionales usando distancia y dirección.' },
        { en: 'Multiply and divide signed rational numbers.', es: 'Multiplicar y dividir números racionales con signo.' },
        { en: 'Convert rational numbers to terminating or repeating decimals and solve contextual problems.', es: 'Convertir números racionales en decimales finitos o periódicos y resolver problemas contextualizados.' },
      ],
      strategy: {
        en: 'Rewrite subtraction as adding the opposite. For multiplication or division, determine the sign first, then calculate the magnitudes.',
        es: 'Reescribe la resta como suma del opuesto. Para multiplicar o dividir, determina primero el signo y luego calcula las magnitudes.',
      },
      workedExample: {
        prompt: { en: 'Find (−3/4) ÷ (1/2).', es: 'Calcula (−3/4) ÷ (1/2).' },
        steps: [
          { en: 'A negative divided by a positive is negative.', es: 'Un número negativo dividido entre uno positivo es negativo.' },
          { en: 'Multiply by the reciprocal: (−3/4) × (2/1).', es: 'Multiplica por el recíproco: (−3/4) × (2/1).' },
          { en: '−6/4 simplifies to −3/2.', es: '−6/4 se simplifica a −3/2.' },
        ],
        answer: { en: '(−3/4) ÷ (1/2) = −3/2, or −1.5.', es: '(−3/4) ÷ (1/2) = −3/2, o −1.5.' },
      },
    },
    EE: {
      description: {
        en: 'Rewrite rational expressions and solve multi-step equations and inequalities.',
        es: 'Reescribe expresiones racionales y resuelve ecuaciones y desigualdades de varios pasos.',
      },
      overview: {
        en: 'Grade 7 algebra uses properties to expand, factor, and combine expressions with rational coefficients. Multi-step equations and inequalities model quantities, percentages, and geometric relationships.',
        es: 'El álgebra de 7.º grado usa propiedades para desarrollar, factorizar y combinar expresiones con coeficientes racionales. Las ecuaciones y desigualdades de varios pasos modelan cantidades, porcentajes y relaciones geométricas.',
      },
      learningGoals: [
        { en: 'Add, subtract, factor, and expand linear expressions.', es: 'Sumar, restar, factorizar y desarrollar expresiones lineales.' },
        { en: 'Solve multi-step equations with rational coefficients.', es: 'Resolver ecuaciones de varios pasos con coeficientes racionales.' },
        { en: 'Solve, graph, and interpret inequalities in context.', es: 'Resolver, representar e interpretar desigualdades en contexto.' },
      ],
      strategy: {
        en: 'Simplify each side before isolating the variable. Preserve equality by performing the same operation on both sides; reverse an inequality only when multiplying or dividing by a negative.',
        es: 'Simplifica cada lado antes de aislar la variable. Mantén la igualdad haciendo la misma operación en ambos lados; invierte una desigualdad solo al multiplicar o dividir por un número negativo.',
      },
      workedExample: {
        prompt: { en: 'Solve 0.4x + 3 = 11.', es: 'Resuelve 0.4x + 3 = 11.' },
        steps: [
          { en: 'Subtract 3 from both sides: 0.4x = 8.', es: 'Resta 3 de ambos lados: 0.4x = 8.' },
          { en: 'Divide both sides by 0.4: x = 20.', es: 'Divide ambos lados entre 0.4: x = 20.' },
          { en: 'Check: 0.4(20) + 3 = 8 + 3 = 11.', es: 'Comprueba: 0.4(20) + 3 = 8 + 3 = 11.' },
        ],
        answer: { en: 'x = 20.', es: 'x = 20.' },
      },
    },
    G: {
      description: {
        en: 'Use scale, angle relationships, circles, area, surface area, and volume.',
        es: 'Usa escalas, relaciones angulares, círculos, área, área superficial y volumen.',
      },
      overview: {
        en: 'Grade 7 geometry connects scale drawings and constructions to proportional reasoning, uses equations for angle relationships, and solves problems with circles and three-dimensional figures.',
        es: 'La geometría de 7.º grado conecta dibujos a escala y construcciones con el razonamiento proporcional, usa ecuaciones para relaciones angulares y resuelve problemas con círculos y figuras tridimensionales.',
      },
      learningGoals: [
        { en: 'Use scale drawings and geometric constructions.', es: 'Usar dibujos a escala y construcciones geométricas.' },
        { en: 'Solve for unknown angles using complementary, supplementary, vertical, and adjacent relationships.', es: 'Hallar ángulos desconocidos usando relaciones complementarias, suplementarias, verticales y adyacentes.' },
        { en: 'Apply circle, area, surface-area, and volume formulas.', es: 'Aplicar fórmulas de círculos, área, área superficial y volumen.' },
      ],
      strategy: {
        en: 'Write the geometric relationship as an equation before substituting or solving, and keep linear, square, and cubic units distinct.',
        es: 'Escribe la relación geométrica como ecuación antes de sustituir o resolver y distingue unidades lineales, cuadradas y cúbicas.',
      },
      workedExample: {
        prompt: { en: 'Two complementary angles measure 3x + 15 degrees and x − 5 degrees. Find x.', es: 'Dos ángulos complementarios miden 3x + 15 grados y x − 5 grados. Halla x.' },
        steps: [
          { en: 'Complementary angles total 90°.', es: 'Los ángulos complementarios suman 90°.' },
          { en: 'Write and simplify: (3x + 15) + (x − 5) = 90, so 4x + 10 = 90.', es: 'Escribe y simplifica: (3x + 15) + (x − 5) = 90, por lo tanto 4x + 10 = 90.' },
          { en: 'Subtract 10 and divide by 4: x = 20.', es: 'Resta 10 y divide entre 4: x = 20.' },
        ],
        answer: { en: 'x = 20.', es: 'x = 20.' },
      },
    },
    SP: {
      description: {
        en: 'Use samples to draw inferences and probability to model chance.',
        es: 'Usa muestras para hacer inferencias y probabilidad para modelar el azar.',
      },
      overview: {
        en: 'Grade 7 statistics uses random samples to learn about populations and compares distributions informally. Probability models, simulations, and organized lists model simple and compound events.',
        es: 'La estadística de 7.º grado usa muestras aleatorias para estudiar poblaciones y compara distribuciones informalmente. Los modelos de probabilidad, simulaciones y listas organizadas representan eventos simples y compuestos.',
      },
      learningGoals: [
        { en: 'Judge whether a sample can represent a population.', es: 'Juzgar si una muestra puede representar una población.' },
        { en: 'Use sample data to estimate and compare population values.', es: 'Usar datos muestrales para estimar y comparar valores poblacionales.' },
        { en: 'Find probabilities of simple and compound events using models or simulations.', es: 'Hallar probabilidades de eventos simples y compuestos usando modelos o simulaciones.' },
      ],
      strategy: {
        en: 'Check how the sample was selected before making an inference. For probability, count equally likely outcomes systematically and compare favorable outcomes with all outcomes.',
        es: 'Comprueba cómo se eligió la muestra antes de hacer una inferencia. Para probabilidad, cuenta sistemáticamente resultados igualmente probables y compara los favorables con el total.',
      },
      workedExample: {
        prompt: { en: 'In a random sample of 30 students, 18 prefer biking. About how many of 200 students would you predict prefer biking?', es: 'En una muestra aleatoria de 30 estudiantes, 18 prefieren ir en bicicleta. ¿Cuántos de 200 estudiantes se estimaría que la prefieren?' },
        steps: [
          { en: 'The sample proportion is 18/30 = 0.6.', es: 'La proporción muestral es 18/30 = 0.6.' },
          { en: 'Apply the proportion to 200 students: 0.6 × 200.', es: 'Aplica la proporción a 200 estudiantes: 0.6 × 200.' },
          { en: '0.6 × 200 = 120.', es: '0.6 × 200 = 120.' },
        ],
        answer: { en: 'Predict about 120 students.', es: 'Se estiman aproximadamente 120 estudiantes.' },
      },
    },
  },
  8: {
    NS: {
      description: {
        en: 'Distinguish rational and irrational numbers and approximate real-number values.',
        es: 'Distingue números racionales e irracionales y aproxima valores de números reales.',
      },
      overview: {
        en: 'Grade 8 expands the real number system to irrational numbers. Decimal expansions and rational approximations help compare irrational values, including non-perfect square roots, and place them on a number line.',
        es: 'El 8.º grado amplía el sistema de números reales a los irracionales. Las expansiones decimales y aproximaciones racionales ayudan a comparar valores irracionales, incluidas raíces no perfectas, y ubicarlos en una recta numérica.',
      },
      learningGoals: [
        { en: 'Explain why a number is rational or irrational.', es: 'Explicar por qué un número es racional o irracional.' },
        { en: 'Use terminating or repeating decimal expansions to recognize rational numbers.', es: 'Usar expansiones decimales finitas o periódicas para reconocer números racionales.' },
        { en: 'Approximate irrational values and place them on a number line.', es: 'Aproximar valores irracionales y ubicarlos en una recta numérica.' },
      ],
      strategy: {
        en: 'Bracket a square root between nearby perfect squares, then refine its decimal only as far as the question requires.',
        es: 'Encierra una raíz cuadrada entre cuadrados perfectos cercanos y luego refina su decimal solo hasta la precisión que pida la pregunta.',
      },
      workedExample: {
        prompt: { en: 'Between which two integers is √50, and what is a useful decimal estimate?', es: '¿Entre qué dos enteros está √50 y cuál es una aproximación decimal útil?' },
        steps: [
          { en: '49 < 50 < 64, so √49 < √50 < √64.', es: '49 < 50 < 64, por lo tanto √49 < √50 < √64.' },
          { en: 'That gives 7 < √50 < 8.', es: 'Esto da 7 < √50 < 8.' },
          { en: 'Because 7.1² = 50.41, √50 is about 7.1.', es: 'Como 7.1² = 50.41, √50 es aproximadamente 7.1.' },
        ],
        answer: { en: '√50 is between 7 and 8 and is approximately 7.1.', es: '√50 está entre 7 y 8 y es aproximadamente 7.1.' },
      },
    },
    EE: {
      description: {
        en: 'Use exponents and solve linear equations, systems, and slope problems.',
        es: 'Usa exponentes y resuelve ecuaciones lineales, sistemas y problemas de pendiente.',
      },
      overview: {
        en: 'Grade 8 algebra connects exponent rules and scientific notation to linear relationships. Slope measures rate of change, linear equations may have one, no, or infinitely many solutions, and systems locate where two lines agree.',
        es: 'El álgebra de 8.º grado conecta reglas de exponentes y notación científica con relaciones lineales. La pendiente mide la tasa de cambio, una ecuación lineal puede tener una, ninguna o infinitas soluciones y un sistema localiza dónde coinciden dos rectas.',
      },
      learningGoals: [
        { en: 'Apply integer-exponent properties and scientific notation.', es: 'Aplicar propiedades de exponentes enteros y notación científica.' },
        { en: 'Graph proportional relationships and interpret slope.', es: 'Representar relaciones proporcionales e interpretar la pendiente.' },
        { en: 'Solve linear equations and pairs of simultaneous linear equations.', es: 'Resolver ecuaciones lineales y pares de ecuaciones lineales simultáneas.' },
      ],
      strategy: {
        en: 'Simplify both sides and track coefficients carefully. For a system, use substitution or elimination, then check the ordered pair in both equations.',
        es: 'Simplifica ambos lados y controla los coeficientes. Para un sistema, usa sustitución o eliminación y luego comprueba el par ordenado en ambas ecuaciones.',
      },
      workedExample: {
        prompt: { en: 'Solve the system y = 2x + 1 and y = x + 4.', es: 'Resuelve el sistema y = 2x + 1 y y = x + 4.' },
        steps: [
          { en: 'Both expressions equal y, so set them equal: 2x + 1 = x + 4.', es: 'Ambas expresiones son iguales a y, así que iguálalas: 2x + 1 = x + 4.' },
          { en: 'Subtract x and 1: x = 3.', es: 'Resta x y 1: x = 3.' },
          { en: 'Substitute: y = 3 + 4 = 7.', es: 'Sustituye: y = 3 + 4 = 7.' },
        ],
        answer: { en: 'The solution is (3, 7).', es: 'La solución es (3, 7).' },
      },
    },
    F: {
      description: {
        en: 'Define, compare, and model functions in tables, graphs, equations, and words.',
        es: 'Define, compara y modela funciones en tablas, gráficas, ecuaciones y palabras.',
      },
      overview: {
        en: 'In Grade 8, a function assigns exactly one output to each input. Linear functions are compared by rate of change and initial value, and qualitative graphs describe how quantities change together.',
        es: 'En 8.º grado, una función asigna exactamente una salida a cada entrada. Las funciones lineales se comparan por tasa de cambio y valor inicial, y las gráficas cualitativas describen cómo cambian juntas las cantidades.',
      },
      learningGoals: [
        { en: 'Determine whether a relation is a function.', es: 'Determinar si una relación es una función.' },
        { en: 'Compare functions shown in different representations.', es: 'Comparar funciones mostradas en distintas representaciones.' },
        { en: 'Build and interpret linear models and qualitative graphs.', es: 'Construir e interpretar modelos lineales y gráficas cualitativas.' },
      ],
      strategy: {
        en: 'Identify input and output first. For a linear function, compare equal input changes to find slope, then use a point to find the initial value.',
        es: 'Identifica primero entrada y salida. Para una función lineal, compara cambios iguales de entrada para hallar la pendiente y usa un punto para hallar el valor inicial.',
      },
      workedExample: {
        prompt: { en: 'A line passes through (1, 5) and (3, 11). Find its slope and equation.', es: 'Una recta pasa por (1, 5) y (3, 11). Halla su pendiente y ecuación.' },
        steps: [
          { en: 'Slope = (11 − 5)/(3 − 1) = 6/2 = 3.', es: 'Pendiente = (11 − 5)/(3 − 1) = 6/2 = 3.' },
          { en: 'Use y = 3x + b and point (1, 5): 5 = 3(1) + b.', es: 'Usa y = 3x + b y el punto (1, 5): 5 = 3(1) + b.' },
          { en: 'Solve b = 2.', es: 'Resuelve b = 2.' },
        ],
        answer: { en: 'The slope is 3 and the equation is y = 3x + 2.', es: 'La pendiente es 3 y la ecuación es y = 3x + 2.' },
      },
    },
    G: {
      description: {
        en: 'Reason with transformations, similarity, the Pythagorean theorem, and solid volume.',
        es: 'Razona con transformaciones, semejanza, el teorema de Pitágoras y volumen de sólidos.',
      },
      overview: {
        en: 'Grade 8 geometry explains congruence and similarity through transformations, connects angle relationships to parallel lines, applies the Pythagorean theorem in coordinates, and finds volumes of cylinders, cones, and spheres.',
        es: 'La geometría de 8.º grado explica congruencia y semejanza mediante transformaciones, conecta relaciones angulares con rectas paralelas, aplica el teorema de Pitágoras en coordenadas y halla volúmenes de cilindros, conos y esferas.',
      },
      learningGoals: [
        { en: 'Describe rotations, reflections, translations, and dilations.', es: 'Describir rotaciones, reflexiones, traslaciones y dilataciones.' },
        { en: 'Use transformations and angle relationships to reason about congruence and similarity.', es: 'Usar transformaciones y relaciones angulares para razonar sobre congruencia y semejanza.' },
        { en: 'Apply the Pythagorean theorem and formulas for cylinder, cone, and sphere volume.', es: 'Aplicar el teorema de Pitágoras y fórmulas de volumen de cilindros, conos y esferas.' },
      ],
      strategy: {
        en: 'For right triangles, label the side opposite the right angle as c before using a² + b² = c², and check that c is the longest side.',
        es: 'En triángulos rectángulos, nombra c al lado opuesto al ángulo recto antes de usar a² + b² = c² y comprueba que c sea el lado más largo.',
      },
      workedExample: {
        prompt: { en: 'A right triangle has legs 6 and 8. Find the hypotenuse.', es: 'Un triángulo rectángulo tiene catetos de 6 y 8. Halla la hipotenusa.' },
        steps: [
          { en: 'Use a² + b² = c²: 6² + 8² = c².', es: 'Usa a² + b² = c²: 6² + 8² = c².' },
          { en: '36 + 64 = 100, so c² = 100.', es: '36 + 64 = 100, por lo tanto c² = 100.' },
          { en: 'Take the positive square root: c = 10.', es: 'Toma la raíz cuadrada positiva: c = 10.' },
        ],
        answer: { en: 'The hypotenuse is 10 units.', es: 'La hipotenusa mide 10 unidades.' },
      },
    },
    SP: {
      description: {
        en: 'Analyze association with scatter plots, trend lines, and two-way tables.',
        es: 'Analiza asociaciones con diagramas de dispersión, rectas de tendencia y tablas de doble entrada.',
      },
      overview: {
        en: 'Grade 8 statistics studies relationships between two variables. Scatter plots reveal direction, form, strength, and outliers; trend lines model quantitative data; and two-way tables compare categorical frequencies.',
        es: 'La estadística de 8.º grado estudia relaciones entre dos variables. Los diagramas de dispersión muestran dirección, forma, fuerza y valores atípicos; las rectas de tendencia modelan datos cuantitativos y las tablas de doble entrada comparan frecuencias categóricas.',
      },
      learningGoals: [
        { en: 'Describe patterns and outliers in bivariate scatter plots.', es: 'Describir patrones y valores atípicos en diagramas de dispersión bivariados.' },
        { en: 'Fit and interpret a line that models a linear association.', es: 'Ajustar e interpretar una recta que modele una asociación lineal.' },
        { en: 'Use two-way tables and relative frequencies to assess association.', es: 'Usar tablas de doble entrada y frecuencias relativas para evaluar asociaciones.' },
      ],
      strategy: {
        en: 'Name both variables and inspect the pattern before calculating. An association can support prediction, but it does not by itself prove causation.',
        es: 'Nombra ambas variables y examina el patrón antes de calcular. Una asociación puede apoyar una predicción, pero por sí sola no demuestra causalidad.',
      },
      workedExample: {
        prompt: { en: 'A trend line for study time x (hours) and score y is y = 5x + 60. Predict the score for 4 hours.', es: 'Una recta de tendencia para tiempo de estudio x (horas) y puntuación y es y = 5x + 60. Predice la puntuación para 4 horas.' },
        steps: [
          { en: 'Substitute x = 4 into the model.', es: 'Sustituye x = 4 en el modelo.' },
          { en: 'y = 5(4) + 60.', es: 'y = 5(4) + 60.' },
          { en: '20 + 60 = 80.', es: '20 + 60 = 80.' },
        ],
        answer: { en: 'The model predicts a score of 80.', es: 'El modelo predice una puntuación de 80.' },
      },
    },
  },
}

export function buildMathExamSection(
  domain: MathDomainCode,
  grade: GradeLevel,
  questionIds: string[],
): MathExamSectionDefinition {
  const lesson = GRADE_DOMAIN_LESSONS[grade][domain]

  if (!lesson) {
    throw new Error(`No Grade ${grade} lesson is defined for math domain ${domain}`)
  }

  return { ...DOMAIN_META[domain], ...lesson, questionIds }
}
