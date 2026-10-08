import assert from 'node:assert/strict'
import test from 'node:test'
import { ALL_MODULES } from '../content/modules'
import { getLessonAgenda, totalAgendaMinutes } from '../lib/lesson-agenda'

const eslModules = ALL_MODULES.filter(mod => mod.track === 'esl')

test('every ESL lesson has in-class worksheet, listening, and in-person quiz content', () => {
  assert.ok(eslModules.length > 0)
  for (const mod of eslModules) {
    assert.ok(mod.classWorksheet?.length, `${mod.slug} is missing classWorksheet`)
    assert.ok(mod.listening?.length, `${mod.slug} is missing listening`)
    assert.ok(mod.inPersonQuiz?.length, `${mod.slug} is missing inPersonQuiz`)

    for (const activity of mod.listening) {
      assert.ok(activity.script.length > 0, `${mod.slug} listening "${activity.titleEn}" has no script`)
      assert.ok(activity.questions.length > 0, `${mod.slug} listening "${activity.titleEn}" has no questions`)
    }

    const answered = [
      ...mod.classWorksheet,
      ...mod.listening.flatMap(activity => activity.questions),
      ...mod.inPersonQuiz,
    ]
    for (const item of answered) {
      assert.ok(item.promptEn.trim(), `${mod.slug} ${item.id} has an empty prompt`)
      assert.ok(item.answer.trim(), `${mod.slug} ${item.id} has an empty answer`)
    }

    const ids = answered.map(item => item.id)
    assert.equal(new Set(ids).size, ids.length, `${mod.slug} has duplicate in-class item ids`)
  }
})

test('the in-class worksheet does not repeat the homework worksheet', () => {
  for (const mod of eslModules) {
    const homework = new Set(mod.worksheet.map(item => item.promptEn))
    for (const item of mod.classWorksheet ?? []) {
      assert.ok(!homework.has(item.promptEn), `${mod.slug} ${item.id} duplicates a homework prompt`)
    }
  }
})

test('ESL lesson agendas fill the 2-hour session', () => {
  for (const mod of eslModules) {
    assert.equal(totalAgendaMinutes(getLessonAgenda(mod)), 120, mod.slug)
  }
})
