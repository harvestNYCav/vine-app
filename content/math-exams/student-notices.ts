import type { MathExamLanguage } from './types'

// Keep the official images unchanged. These source-verified translation
// corrections must be visible BEFORE a student chooses an answer; the keys
// continue to correspond to the original English question.
const SPANISH_CORRECTIONS: Readonly<Record<string, string>> = {
  'nysed-2017-g3-mc-q23': 'La referencia de la imagen dice «1 pie cuadrado», pero la versión en inglés y las opciones usan unidades cuadradas. Para esta práctica, cada cuadrado pequeño representa 1 unidad cuadrada.',
  'nysed-2017-g3-mc-q27': 'La referencia de la imagen dice «1 pie cuadrado», pero la versión en inglés usa unidades cuadradas. Para esta práctica, cada cuadrado pequeño representa 1 unidad cuadrada.',
  'nysed-2026-g4-mc-q1': 'La imagen original dice «en letras», pero las opciones y la pregunta en inglés piden la forma desarrollada. Para esta práctica, lee: ¿Cuál es el número 860,327 escrito en forma desarrollada?',
  'nysed-2025-g5-mc-q5': 'La imagen original dice «décimos», pero la pregunta en inglés dice «tens» (decenas). Para esta práctica, lee la pregunta corregida: ¿Qué número tiene un 2 en el lugar de las decenas?',
  'nysed-2023-g6-mc-q12': 'La traducción de la imagen cambia el orden de la resta. Para esta práctica, lee la pregunta corregida: ¿Qué expresión equivale a restar 14 al producto de 8 por y?',
}

export function getMathExamStudentNotice(questionId: string, language: MathExamLanguage) {
  return language === 'es' ? SPANISH_CORRECTIONS[questionId] : undefined
}
