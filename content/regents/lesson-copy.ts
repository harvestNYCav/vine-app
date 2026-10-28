import type { RegentsCourse } from './types'

export const REGENTS_STUDY_GUIDES: Record<RegentsCourse, {
  heading: string
  steps: string[]
  workedExample: { prompt: string; steps: string[]; answer: string }
}> = {
  'algebra-i': {
    heading: 'Before you answer',
    steps: [
      'Name the quantity or relationship the question is asking about.',
      'Choose a useful representation: equation, table, graph, or verbal rule.',
      'Substitute your result back into the original situation and check units.',
    ],
    workedExample: {
      prompt: 'Solve 3(x − 2) = 2x + 5.',
      steps: ['Distribute: 3x − 6 = 2x + 5.', 'Subtract 2x and add 6: x = 11.', 'Check: 3(11 − 2) = 27 and 2(11) + 5 = 27.'],
      answer: 'x = 11',
    },
  },
  geometry: {
    heading: 'Before you answer',
    steps: [
      'Mark the given lengths, angles, and relationships on the diagram.',
      'Identify the theorem or transformation that connects the givens to the goal.',
      'Check whether the result is a length, area, volume, or angle before selecting a choice.',
    ],
    workedExample: {
      prompt: 'A right triangle has legs of 6 and 8 units. Find its hypotenuse.',
      steps: ['Use the Pythagorean theorem: c² = 6² + 8².', 'Add: c² = 36 + 64 = 100.', 'Take the positive square root because a length is positive.'],
      answer: 'c = 10 units',
    },
  },
  'algebra-ii': {
    heading: 'Before you answer',
    steps: [
      'Identify the function type and any restrictions on its input.',
      'Simplify or transform the expression one step at a time; keep equivalent forms aligned.',
      'Test the proposed result in the original equation or graph when possible.',
    ],
    workedExample: {
      prompt: 'Solve x² − 5x + 6 = 0.',
      steps: ['Find two numbers that multiply to 6 and add to −5: −2 and −3.', 'Factor: (x − 2)(x − 3) = 0.', 'Set each factor to zero and check both values in the original equation.'],
      answer: 'x = 2 or x = 3',
    },
  },
  english: {
    heading: 'Read with evidence',
    steps: [
      'Read the passage once for its main idea and the narrator or author’s point of view.',
      'Return to the cited lines for each question and distinguish what the text says from an inference.',
      'Eliminate choices that are plausible in general but not supported by this passage.',
    ],
    workedExample: {
      prompt: 'Suppose a passage says, “Mara turned back to shelter a classmate as rain began.” Which detail best supports the inference that Mara helps others?',
      steps: ['Identify the inference: Mara helps others.', 'Find an action in the sentence that directly supports it.', 'Choose the detail about sheltering the classmate, not the detail about the rain.'],
      answer: '“Mara turned back to shelter a classmate.”',
    },
  },
}
