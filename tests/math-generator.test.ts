import test from 'node:test'
import assert from 'node:assert/strict'
import { generateProblem, getSkillByTag } from '../lib/math'

test('the ×1–12 times-table generator includes both endpoint factors', () => {
  const skill = getSkillByTag('multiplication_tables')!
  const originalRandom = Math.random

  try {
    Math.random = () => 0
    const lowerEndpoint = generateProblem(skill)
    assert.deepEqual(lowerEndpoint.operands, [1, 1])
    assert.equal(lowerEndpoint.answer, 1)

    Math.random = () => 1 - Number.EPSILON
    const upperEndpoint = generateProblem(skill)
    assert.deepEqual(upperEndpoint.operands, [12, 12])
    assert.equal(upperEndpoint.answer, 144)
  } finally {
    Math.random = originalRandom
  }
})
