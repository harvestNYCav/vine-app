import test from 'node:test'
import assert from 'node:assert/strict'
import {
  advanceCurrentSkill,
  MIN_ATTEMPTS,
  reviewSkillTags,
  selectNextProblem,
  SKILLS,
  updateMastery,
} from '../lib/math'

const [first, second, third, fourth] = SKILLS.map(skill => skill.tag)
const last = SKILLS[SKILLS.length - 1].tag

// Math.random returns each value in turn, then 0.5 for the problem generator.
function withRandom<T>(values: number[], run: () => T): T {
  const originalRandom = Math.random
  let call = 0
  Math.random = () => (call < values.length ? values[call++] : 0.5)
  try {
    return run()
  } finally {
    Math.random = originalRandom
  }
}

test('the level stays put until the current skill is mastered over enough problems', () => {
  assert.equal(advanceCurrentSkill(first, { [first]: 0.84 }, { [first]: 20 }), first)
  assert.equal(advanceCurrentSkill(first, { [first]: 0.9 }, { [first]: MIN_ATTEMPTS - 1 }), first)
  assert.equal(advanceCurrentSkill(first, { [first]: 0.85 }, { [first]: MIN_ATTEMPTS }), second)
})

test('the level moves past every mastered skill in a row and stops at the top of the ladder', () => {
  const mastery = { [first]: 0.9, [second]: 0.95, [third]: 0.5 }
  const counts = { [first]: 10, [second]: 10, [third]: 10 }
  assert.equal(advanceCurrentSkill(first, mastery, counts), third)

  const allMastery = Object.fromEntries(SKILLS.map(skill => [skill.tag, 1]))
  const allCounts = Object.fromEntries(SKILLS.map(skill => [skill.tag, 50]))
  assert.equal(advanceCurrentSkill(first, allMastery, allCounts), last)
})

test('an unknown saved skill starts from the bottom of the ladder', () => {
  assert.equal(advanceCurrentSkill('not_a_skill', {}, {}), first)
})

test('review falls back to the skill just below the current one', () => {
  assert.deepEqual(reviewSkillTags(first, {}, {}), [])
  // The diagnostic passes a student through lower skills with only 3 problems each.
  assert.deepEqual(reviewSkillTags(fourth, { [first]: 0.21, [second]: 0.21, [third]: 0.21 }, { [first]: 3, [second]: 3, [third]: 3 }), [third])
})

test('review prefers earlier skills the student mastered and has since slipped on', () => {
  const mastery = { [first]: 0.95, [second]: 0.78, [third]: 0.9 }
  const counts = { [first]: 20, [second]: 20, [third]: 20 }
  assert.deepEqual(reviewSkillTags(fourth, mastery, counts), [second])
})

test('adaptive sessions split problems 10% review, 20% next skill, 70% current skill', () => {
  const pick = (r: number, current = second, review = [first]) =>
    withRandom([r, 0], () => selectNextProblem(current, review, [], null)).skill_tag

  assert.equal(pick(0), first)
  assert.equal(pick(0.099), first)
  assert.equal(pick(0.1), third)
  assert.equal(pick(0.29), third)
  assert.equal(pick(0.31), second)
  assert.equal(pick(0.999), second)

  // With nothing to review or nothing above, those problems come from the current skill.
  assert.equal(pick(0.05, first, []), first)
  assert.equal(pick(0.2, last, [first]), last)
})

test('selected-skills sessions only draw from the picked skills', () => {
  const pick = (r: number) => withRandom([r], () => selectNextProblem(first, [first], [], [third, fourth])).skill_tag
  assert.equal(pick(0), third)
  assert.equal(pick(0.999), fourth)
})

test('a student who keeps answering correctly climbs past two skills above their placement', () => {
  // Saved progress after a diagnostic that placed the student at the first skill.
  let currentSkill = first
  let mastery: Record<string, number> = { [first]: 0.21 }
  const counts: Record<string, number> = { [first]: 3 }

  for (let session = 0; session < 30; session++) {
    // Mirrors the attempt route: build ten problems from saved progress, grade them, save the level.
    currentSkill = advanceCurrentSkill(currentSkill, mastery, counts)
    const review = reviewSkillTags(currentSkill, mastery, counts)
    for (let i = 0; i < 10; i++) {
      const problem = selectNextProblem(currentSkill, review, [], null)
      mastery = updateMastery(mastery, problem.skill_tag, true)
      counts[problem.skill_tag] = (counts[problem.skill_tag] ?? 0) + 1
    }
    currentSkill = advanceCurrentSkill(currentSkill, mastery, counts)
  }

  const reached = SKILLS.findIndex(skill => skill.tag === currentSkill)
  assert.ok(reached > 3, `expected to pass the fourth skill, reached ${currentSkill}`)
})
