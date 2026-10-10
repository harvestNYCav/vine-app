// Source-verified geometry for items that originally required physical tools.
// Diagram and scale share SVG coordinates, keeping measurements stable at any zoom.
export type MathMeasurementGuide =
  | { kind: 'ruler'; lengths: readonly number[] }
  | { kind: 'protractor'; degrees: number; zeroSide: 'left' | 'right' }

export const MATH_MEASUREMENT_GUIDES: Readonly<Record<string, MathMeasurementGuide>> = {
  'nysed-2015-g4-mc-q2': { kind: 'ruler', lengths: [3.5] },
  'nysed-2018-g4-mc-q4': { kind: 'ruler', lengths: [2.25] },
  'nysed-2023-g4-mc-q9': { kind: 'ruler', lengths: [4.25] },
  'nysed-2019-g4-mc-q38': { kind: 'ruler', lengths: [2.25, 2.75, 1.5, 2.25] },
  'nysed-2015-g4-mc-q4': { kind: 'protractor', degrees: 40, zeroSide: 'right' },
  'nysed-2016-g4-mc-q28': { kind: 'protractor', degrees: 42, zeroSide: 'right' },
  'nysed-2019-g4-mc-q36': { kind: 'protractor', degrees: 55, zeroSide: 'right' },
  'nysed-2022-g4-mc-q22': { kind: 'protractor', degrees: 161, zeroSide: 'left' },
}
