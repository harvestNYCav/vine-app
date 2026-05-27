export interface SkillLesson {
  tag: string
  emoji: string
  description: string
  descriptionEs: string
  tip: string
  tipEs: string
  exampleA: number
  exampleB: number
  exampleOp: '+' | '−' | '×' | '÷'
  exampleAnswer: number
}

export const SKILL_LESSONS: Record<string, SkillLesson> = {
  '1_digit_addition': {
    tag: '1_digit_addition',
    emoji: '➕',
    description: 'Add two single-digit numbers together. These basic facts (1+1 through 9+9) are the foundation of all arithmetic — aim to recall them instantly.',
    descriptionEs: 'Suma dos números de un solo dígito. Estos datos básicos (1+1 hasta 9+9) son la base de toda la aritmética — intenta recordarlos al instante.',
    tip: 'Count up from the bigger number. For 3 + 7, start at 7 and count up 3 more: 8, 9, 10.',
    tipEs: 'Cuenta desde el número más grande. Para 3 + 7, empieza en 7 y cuenta 3 más: 8, 9, 10.',
    exampleA: 6, exampleB: 7, exampleOp: '+', exampleAnswer: 13,
  },
  '1_digit_subtraction': {
    tag: '1_digit_subtraction',
    emoji: '➖',
    description: 'Subtract one single-digit number from another. Practice until you can recall the difference without counting on your fingers.',
    descriptionEs: 'Resta un número de un solo dígito de otro. Practica hasta que puedas recordar la diferencia sin contar con los dedos.',
    tip: 'Think of it as addition in reverse. 8 − 5 = ? Ask: what plus 5 makes 8? Answer: 3.',
    tipEs: 'Piénsalo como suma al revés. 8 − 5 = ? Pregúntate: ¿qué más 5 da 8? Respuesta: 3.',
    exampleA: 9, exampleB: 4, exampleOp: '−', exampleAnswer: 5,
  },
  '2_digit_addition_no_carry': {
    tag: '2_digit_addition_no_carry',
    emoji: '➕',
    description: 'Add two 2-digit numbers where no column sums to 10 or more, so there\'s nothing to carry. Work column by column: ones, then tens.',
    descriptionEs: 'Suma dos números de 2 dígitos donde ninguna columna llega a 10 o más, así que no hay que llevarse nada. Trabaja columna por columna: unidades, luego decenas.',
    tip: 'Add the ones digits first, then the tens digits separately. 32 + 46 = (2+6) + (30+40) = 8 + 70 = 78.',
    tipEs: 'Suma primero los dígitos de las unidades, luego las decenas por separado. 32 + 46 = (2+6) + (30+40) = 8 + 70 = 78.',
    exampleA: 34, exampleB: 53, exampleOp: '+', exampleAnswer: 87,
  },
  '2_digit_subtraction_no_borrow': {
    tag: '2_digit_subtraction_no_borrow',
    emoji: '➖',
    description: 'Subtract two 2-digit numbers where each digit on top is larger than the one below — no borrowing needed.',
    descriptionEs: 'Resta dos números de 2 dígitos donde cada dígito de arriba es mayor que el de abajo — no hay que pedir prestado.',
    tip: 'Subtract the ones digits first, then the tens digits. 78 − 35 = (8−5) + (70−30) = 3 + 40 = 43.',
    tipEs: 'Resta primero los dígitos de las unidades, luego las decenas. 78 − 35 = (8−5) + (70−30) = 3 + 40 = 43.',
    exampleA: 76, exampleB: 32, exampleOp: '−', exampleAnswer: 44,
  },
  '2_digit_addition_with_carry': {
    tag: '2_digit_addition_with_carry',
    emoji: '➕',
    description: 'Add 2-digit numbers where the ones column sums to 10 or more. You carry the extra ten over to the tens column.',
    descriptionEs: 'Suma números de 2 dígitos donde la columna de unidades da 10 o más. Te llevas la decena extra a la columna de las decenas.',
    tip: 'When ones sum to ≥10, write the ones digit and carry 1 to the tens. 47 + 36: ones are 7+6=13, write 3 carry 1; tens are 4+3+1=8. Answer: 83.',
    tipEs: 'Cuando las unidades suman ≥10, escribe el dígito de las unidades y lleva 1 a las decenas. 47 + 36: unidades 7+6=13, escribe 3 lleva 1; decenas 4+3+1=8. Respuesta: 83.',
    exampleA: 47, exampleB: 36, exampleOp: '+', exampleAnswer: 83,
  },
  '2_digit_subtraction_with_borrow': {
    tag: '2_digit_subtraction_with_borrow',
    emoji: '➖',
    description: 'Subtract when the top ones digit is smaller than the bottom — you\'ll need to borrow a ten from the tens column.',
    descriptionEs: 'Resta cuando el dígito de las unidades de arriba es menor que el de abajo — tendrás que pedir prestado una decena de la columna de las decenas.',
    tip: 'Borrow 10 from the tens place. 53 − 28: ones 3 < 8, so borrow: 13−8=5, tens become 4−2=2. Answer: 25.',
    tipEs: 'Pide prestado 10 de las decenas. 53 − 28: unidades 3 < 8, así que pides prestado: 13−8=5, decenas quedan 4−2=2. Respuesta: 25.',
    exampleA: 53, exampleB: 28, exampleOp: '−', exampleAnswer: 25,
  },
  '3_digit_addition': {
    tag: '3_digit_addition',
    emoji: '➕',
    description: 'Add 3-digit numbers, carrying when needed. Work right to left: ones, tens, then hundreds.',
    descriptionEs: 'Suma números de 3 dígitos, llevando cuando sea necesario. Trabaja de derecha a izquierda: unidades, decenas, luego centenas.',
    tip: 'Line the numbers up and carry just like with 2-digit addition — just one more column. 365 + 248: ones 5+8=13, carry 1; tens 6+4+1=11, carry 1; hundreds 3+2+1=6. Answer: 613.',
    tipEs: 'Alinea los números y lleva igual que en la suma de 2 dígitos — solo una columna más. 365 + 248: unidades 5+8=13, lleva 1; decenas 6+4+1=11, lleva 1; centenas 3+2+1=6. Respuesta: 613.',
    exampleA: 365, exampleB: 248, exampleOp: '+', exampleAnswer: 613,
  },
  '3_digit_subtraction': {
    tag: '3_digit_subtraction',
    emoji: '➖',
    description: 'Subtract 3-digit numbers, borrowing across columns when needed. This is the trickiest arithmetic operation — take it one column at a time.',
    descriptionEs: 'Resta números de 3 dígitos, pidiendo prestado entre columnas cuando sea necesario. Es la operación aritmética más difícil — trabaja una columna a la vez.',
    tip: 'Work right to left. If a digit on top is too small, borrow from the next column to the left. 742 − 358: ones 2 < 8, borrow → 12−8=4; tens now 3 < 5, borrow → 13−5=8; hundreds 6−3=3. Answer: 384.',
    tipEs: 'Trabaja de derecha a izquierda. Si el dígito de arriba es muy pequeño, pide prestado de la columna a la izquierda. 742 − 358: unidades 2 < 8, pide → 12−8=4; decenas 3 < 5, pide → 13−5=8; centenas 6−3=3. Respuesta: 384.',
    exampleA: 742, exampleB: 358, exampleOp: '−', exampleAnswer: 384,
  },
  '3_digit_mixed': {
    tag: '3_digit_mixed',
    emoji: '🔢',
    description: 'A mix of 3-digit addition and subtraction in the same session. You won\'t know the operation in advance — stay sharp!',
    descriptionEs: 'Una mezcla de suma y resta de 3 dígitos en la misma sesión. No sabrás la operación de antemano — ¡mantente alerta!',
    tip: 'Read the operation sign carefully before calculating. Carry for addition, borrow for subtraction.',
    tipEs: 'Lee el signo de la operación con cuidado antes de calcular. Lleva para la suma, pide prestado para la resta.',
    exampleA: 512, exampleB: 279, exampleOp: '+', exampleAnswer: 791,
  },
  'multiplication_basic': {
    tag: 'multiplication_basic',
    emoji: '✖️',
    description: 'Multiply single-digit numbers from ×2 through ×9. These are the core times-table facts you need to memorize cold.',
    descriptionEs: 'Multiplica números de un solo dígito del ×2 al ×9. Estos son los datos básicos de la tabla de multiplicar que debes memorizar.',
    tip: 'If you forget a fact, think of a nearby one you know. 7×8: if you know 7×7=49, just add 7 more → 56.',
    tipEs: 'Si olvidas un dato, piensa en uno cercano que conozcas. 7×8: si sabes que 7×7=49, solo suma 7 más → 56.',
    exampleA: 7, exampleB: 8, exampleOp: '×', exampleAnswer: 56,
  },
  'multiplication_tables': {
    tag: 'multiplication_tables',
    emoji: '✖️',
    description: 'The full times tables from 1×1 through 12×12. Includes the trickier ×11 and ×12 facts.',
    descriptionEs: 'Las tablas de multiplicar completas del 1×1 al 12×12. Incluye los datos más difíciles del ×11 y ×12.',
    tip: 'For ×11: up to 9×11, the answer has both digits the same (4×11=44). For ×12: multiply by 10 then add ×2. 8×12 = 80+16 = 96.',
    tipEs: 'Para ×11: hasta 9×11, la respuesta tiene ambos dígitos iguales (4×11=44). Para ×12: multiplica por 10 y suma ×2. 8×12 = 80+16 = 96.',
    exampleA: 9, exampleB: 12, exampleOp: '×', exampleAnswer: 108,
  },
  'multiplication_2x1': {
    tag: 'multiplication_2x1',
    emoji: '✖️',
    description: 'Multiply a 2-digit number by a single-digit number. Use the distributive property: split the tens and ones, multiply each, add together.',
    descriptionEs: 'Multiplica un número de 2 dígitos por un número de un solo dígito. Usa la propiedad distributiva: separa las decenas y unidades, multiplica cada una, suma los resultados.',
    tip: '14 × 6 = (10 × 6) + (4 × 6) = 60 + 24 = 84. Breaking it apart makes it manageable.',
    tipEs: '14 × 6 = (10 × 6) + (4 × 6) = 60 + 24 = 84. Dividirlo en partes lo hace más manejable.',
    exampleA: 14, exampleB: 6, exampleOp: '×', exampleAnswer: 84,
  },
  'division_basic': {
    tag: 'division_basic',
    emoji: '➗',
    description: 'Divide by single-digit numbers (2–9) with no remainder. Think of each problem as a multiplication fact in reverse.',
    descriptionEs: 'Divide entre números de un solo dígito (2–9) sin residuo. Piensa en cada problema como una multiplicación al revés.',
    tip: '36 ÷ 4 = ? Ask: 4 × ? = 36. The answer is 9. Knowing your times tables is the key to fast division.',
    tipEs: '36 ÷ 4 = ? Pregúntate: 4 × ? = 36. La respuesta es 9. Saber las tablas de multiplicar es la clave para dividir rápido.',
    exampleA: 36, exampleB: 4, exampleOp: '÷', exampleAnswer: 9,
  },
  'division_2digit': {
    tag: 'division_2digit',
    emoji: '➗',
    description: 'Divide a 2-digit number by a single-digit number, giving a quotient between 2 and 12 with no remainder.',
    descriptionEs: 'Divide un número de 2 dígitos entre un número de un solo dígito, dando un cociente entre 2 y 12 sin residuo.',
    tip: '72 ÷ 8 = ? You need to know 8 × 9 = 72. Build your times tables first, then division becomes easy.',
    tipEs: '72 ÷ 8 = ? Necesitas saber que 8 × 9 = 72. Aprende primero las tablas de multiplicar y la división se vuelve fácil.',
    exampleA: 72, exampleB: 8, exampleOp: '÷', exampleAnswer: 9,
  },
}
