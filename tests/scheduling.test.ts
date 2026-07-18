import test from 'node:test'
import assert from 'node:assert/strict'
import { localDateKey } from '../lib/dates'
import { nextSaturday, todayString } from '../lib/scheduling'

test('program dates stay on New York Friday after a UTC host has crossed midnight', () => {
  const fridayEveningInNewYork = new Date('2026-07-18T02:30:00.000Z')

  assert.equal(localDateKey(fridayEveningInNewYork, 'America/New_York'), '2026-07-17')
  assert.equal(todayString(fridayEveningInNewYork, 'America/New_York'), '2026-07-17')
  assert.equal(nextSaturday(fridayEveningInNewYork, 'America/New_York'), '2026-07-18')
})

test('next session means the following Saturday when today is already Saturday', () => {
  const saturdayMorningInNewYork = new Date('2026-07-18T14:00:00.000Z')

  assert.equal(todayString(saturdayMorningInNewYork, 'America/New_York'), '2026-07-18')
  assert.equal(nextSaturday(saturdayMorningInNewYork, 'America/New_York'), '2026-07-25')
})

test('program date helpers accept a different configured IANA time zone', () => {
  const instant = new Date('2026-07-18T02:30:00.000Z')

  assert.equal(todayString(instant, 'UTC'), '2026-07-18')
  assert.equal(nextSaturday(instant, 'UTC'), '2026-07-25')
})

test('PROGRAM_TIME_ZONE config controls the default program calendar', () => {
  const previousTimeZone = process.env.PROGRAM_TIME_ZONE
  process.env.PROGRAM_TIME_ZONE = 'UTC'
  try {
    const instant = new Date('2026-07-18T02:30:00.000Z')
    assert.equal(todayString(instant), '2026-07-18')
    assert.equal(nextSaturday(instant), '2026-07-25')
  } finally {
    if (previousTimeZone === undefined) delete process.env.PROGRAM_TIME_ZONE
    else process.env.PROGRAM_TIME_ZONE = previousTimeZone
  }
})
