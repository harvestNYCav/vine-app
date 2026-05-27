export interface Skill {
  tag: string
  label: string
  operation: 'addition' | 'subtraction' | 'multiplication' | 'division' | 'mixed'
  digits: number
  carries: number
  borrows: number
  difficulty: number
}

export type ResolvedOperation = 'addition' | 'subtraction' | 'multiplication' | 'division'
export type MistakeType = 'carry_error' | 'borrow_error' | 'arithmetic_fact_error' | 'sign_error'

export interface MathProblem {
  id: string
  operation: ResolvedOperation
  operands: [number, number]
  answer: number
  properties: { num_digits: number; num_carries: number; num_borrows: number }
  skill_tag: string
  difficulty_score: number
}

export const SKILLS: Skill[] = [
  { tag: '1_digit_addition',                label: '1-digit addition',                 operation: 'addition',       digits: 1, carries: 0, borrows: 0, difficulty: 0.05 },
  { tag: '1_digit_subtraction',             label: '1-digit subtraction',              operation: 'subtraction',    digits: 1, carries: 0, borrows: 0, difficulty: 0.08 },
  { tag: '2_digit_addition_no_carry',       label: '2-digit addition (no carry)',       operation: 'addition',       digits: 2, carries: 0, borrows: 0, difficulty: 0.18 },
  { tag: '2_digit_subtraction_no_borrow',   label: '2-digit subtraction (no borrow)',  operation: 'subtraction',    digits: 2, carries: 0, borrows: 0, difficulty: 0.22 },
  { tag: '2_digit_addition_with_carry',     label: '2-digit addition (with carry)',     operation: 'addition',       digits: 2, carries: 1, borrows: 0, difficulty: 0.38 },
  { tag: '2_digit_subtraction_with_borrow', label: '2-digit subtraction (with borrow)', operation: 'subtraction',   digits: 2, carries: 0, borrows: 1, difficulty: 0.45 },
  { tag: '3_digit_addition',                label: '3-digit addition',                 operation: 'addition',       digits: 3, carries: 1, borrows: 0, difficulty: 0.62 },
  { tag: '3_digit_subtraction',             label: '3-digit subtraction',              operation: 'subtraction',    digits: 3, carries: 0, borrows: 1, difficulty: 0.68 },
  { tag: '3_digit_mixed',                   label: '3-digit mixed +/−',                operation: 'mixed',          digits: 3, carries: 1, borrows: 1, difficulty: 0.82 },
  { tag: 'multiplication_basic',            label: 'Multiplication (×2–9)',            operation: 'multiplication', digits: 1, carries: 0, borrows: 0, difficulty: 0.35 },
  { tag: 'multiplication_tables',           label: 'Times tables (×1–12)',             operation: 'multiplication', digits: 1, carries: 0, borrows: 0, difficulty: 0.50 },
  { tag: 'multiplication_2x1',              label: '2-digit × 1-digit',               operation: 'multiplication', digits: 2, carries: 0, borrows: 0, difficulty: 0.62 },
  { tag: 'division_basic',                  label: 'Division (÷2–9)',                  operation: 'division',       digits: 1, carries: 0, borrows: 0, difficulty: 0.42 },
  { tag: 'division_2digit',                 label: '2-digit ÷ 1-digit',               operation: 'division',       digits: 2, carries: 0, borrows: 0, difficulty: 0.65 },
]

export const OP_SYM: Record<ResolvedOperation, string> = {
  addition: '+',
  subtraction: '−',
  multiplication: '×',
  division: '÷',
}

export const MASTERY_INCREMENT = 0.07
export const MASTERY_PENALTY = 0.12
export const MASTERY_THRESHOLD = 0.85
export const MIN_ATTEMPTS = 8

export function getSkillByTag(tag: string): Skill | undefined {
  return SKILLS.find(s => s.tag === tag)
}

export function getSkillIndex(tag: string): number {
  return SKILLS.findIndex(s => s.tag === tag)
}

export function getNextSkill(tag: string): Skill | null {
  const i = getSkillIndex(tag)
  return i >= 0 && i < SKILLS.length - 1 ? SKILLS[i + 1] : null
}

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function countCarries(a: number, b: number): number {
  let carry = 0, count = 0
  while (a > 0 || b > 0) {
    const s = (a % 10) + (b % 10) + carry
    carry = s >= 10 ? 1 : 0
    if (carry) count++
    a = Math.floor(a / 10)
    b = Math.floor(b / 10)
  }
  return count
}

function countBorrows(a: number, b: number): number {
  let borrow = 0, count = 0, aa = a, bb = b
  while (aa > 0 || bb > 0) {
    const d = (aa % 10) - (bb % 10) - borrow
    if (d < 0) { count++; borrow = 1 } else { borrow = 0 }
    aa = Math.floor(aa / 10)
    bb = Math.floor(bb / 10)
  }
  return count
}

export function generateProblem(skill: Skill, recentOperands: string[] = []): MathProblem {
  const { tag, operation, digits, carries: tc, borrows: tb } = skill
  const op: ResolvedOperation = operation === 'mixed'
    ? (Math.random() < 0.5 ? 'addition' : 'subtraction')
    : operation as ResolvedOperation

  let a = 0, b = 0, answer = 0, numCarries = 0, numBorrows = 0, attempts = 0, valid = false

  do {
    attempts++
    if (op === 'addition') {
      if (digits === 1) { a = rand(1, 9); b = rand(1, 9) }
      else if (digits === 2) {
        if (tc === 0) { const u1 = rand(0, 4), u2 = rand(0, 9 - u1), t1 = rand(1, 4), t2 = rand(1, 9 - t1); a = t1 * 10 + u1; b = t2 * 10 + u2 }
        else { const u1 = rand(2, 9), u2 = rand(10 - u1, 9), t1 = rand(1, 8), t2 = rand(1, 9 - t1 + (u1 + u2 >= 10 ? 1 : 0)); a = t1 * 10 + u1; b = Math.min(99, t2 * 10 + u2) }
      } else { a = rand(100, 699); b = Math.max(100, rand(100, 899 - a)) }
      answer = a + b; numCarries = countCarries(a, b); numBorrows = 0

    } else if (op === 'subtraction') {
      if (digits === 1) { a = rand(2, 9); b = rand(1, a) }
      else if (digits === 2) {
        if (tb === 0) { const u1 = rand(1, 9), u2 = rand(0, u1), t1 = rand(2, 9), t2 = rand(1, t1); a = t1 * 10 + u1; b = t2 * 10 + u2 }
        else { const u2 = rand(2, 9), u1 = rand(0, u2 - 1), t1 = rand(2, 9), t2 = rand(1, t1); a = t1 * 10 + u1; b = t2 * 10 + u2; if (a < b) { const tmp = a; a = b; b = tmp }; if (a === b) a += 10 }
      } else { a = rand(200, 999); b = rand(100, a - 1) }
      answer = a - b; numCarries = 0; numBorrows = countBorrows(a, b)

    } else if (op === 'multiplication') {
      if (tag === 'multiplication_tables') { a = rand(2, 12); b = rand(2, 12) }
      else if (digits === 2) { a = rand(11, 25); b = rand(2, 9) }
      else { a = rand(2, 9); b = rand(2, 9) }
      answer = a * b; numCarries = 0; numBorrows = 0

    } else {
      b = rand(2, 9)
      if (digits === 2) {
        const maxQ = Math.floor(99 / b), minQ = Math.ceil(10 / b)
        answer = rand(Math.max(2, minQ), Math.min(maxQ, 12))
      } else {
        answer = rand(2, 9)
      }
      a = b * answer; numCarries = 0; numBorrows = 0
    }

    if (answer <= 0) continue
    if ((op === 'addition' || op === 'subtraction') && digits >= 2 && answer < 10) continue
    if (digits >= 3 && op === 'addition' && tc > 0 && numCarries < 1) continue
    if (digits >= 3 && op === 'subtraction' && tb > 0 && numBorrows < 1) continue
    valid = true
    if (recentOperands.includes(`${a},${b}`)) continue
    break
  } while (attempts < 30)

  if (!valid) {
    if (op === 'multiplication') { a = 3; b = 4; answer = 12 }
    else if (op === 'division') { a = 12; b = 3; answer = 4 }
    else if (op === 'addition') { a = digits === 1 ? 4 : digits === 2 ? 47 : 314; b = digits === 1 ? 3 : 26; answer = a + b }
    else { a = digits === 1 ? 7 : digits === 2 ? 53 : 421; b = digits === 1 ? 3 : 21; answer = a - b }
    numCarries = countCarries(a, b); numBorrows = countBorrows(a, b)
  }

  return {
    id: crypto.randomUUID(),
    operation: op,
    operands: [a, b],
    answer,
    properties: { num_digits: digits, num_carries: numCarries, num_borrows: numBorrows },
    skill_tag: tag,
    difficulty_score: Math.min(1,
      ({ addition: 0.02, subtraction: 0.05, multiplication: 0.10, division: 0.12 }[op] || 0.05)
      + 0.08 * digits + 0.12 * numCarries + 0.14 * numBorrows
    ),
  }
}

export function classifyMistake(problem: MathProblem, userAnswer: number): MistakeType {
  const { operation, operands: [a, b], answer } = problem
  const diff = Math.abs(userAnswer - answer)
  if (operation === 'addition') {
    if (diff === 10 || diff === 100 || diff === 1000) return 'carry_error'
    if (diff <= 2) return 'arithmetic_fact_error'
    if (userAnswer === Math.abs(a - b)) return 'sign_error'
    return 'carry_error'
  } else if (operation === 'subtraction') {
    if (diff === 10 || diff === 100) return 'borrow_error'
    if (diff <= 2) return 'arithmetic_fact_error'
    if (userAnswer === a + b) return 'sign_error'
    return 'borrow_error'
  } else if (operation === 'multiplication') {
    if (userAnswer === a + b || userAnswer === a - b) return 'sign_error'
    return 'arithmetic_fact_error'
  } else {
    if (userAnswer === a * b) return 'sign_error'
    return 'arithmetic_fact_error'
  }
}

export function updateMastery(
  skillMastery: Record<string, number>,
  tag: string,
  isCorrect: boolean,
): Record<string, number> {
  const cur = skillMastery[tag] ?? 0
  return {
    ...skillMastery,
    [tag]: Math.max(0, Math.min(1, isCorrect ? cur + MASTERY_INCREMENT : cur - MASTERY_PENALTY)),
  }
}

export function selectNextProblem(
  currentSkillTag: string,
  skillMastery: Record<string, number>,
  mistakeQueue: Array<{ skill_tag: string }>,
  recentOperands: string[],
  pinnedTags: string[] | null,
): MathProblem {
  if (pinnedTags && pinnedTags.length > 0) {
    const tag = pinnedTags[Math.floor(Math.random() * pinnedTags.length)]
    return generateProblem(getSkillByTag(tag) || SKILLS[0], recentOperands)
  }
  const r = Math.random()
  let skill: Skill
  if (r < 0.20) {
    const n = getNextSkill(currentSkillTag)
    skill = n || getSkillByTag(currentSkillTag) || SKILLS[0]
  } else if (r < 0.40 && mistakeQueue.length > 0) {
    const item = mistakeQueue[Math.floor(Math.random() * mistakeQueue.length)]
    skill = getSkillByTag(item.skill_tag) || getSkillByTag(currentSkillTag) || SKILLS[0]
  } else {
    skill = getSkillByTag(currentSkillTag) || SKILLS[0]
  }
  return generateProblem(skill, recentOperands)
}
