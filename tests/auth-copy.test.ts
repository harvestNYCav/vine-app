import test from 'node:test'
import assert from 'node:assert/strict'
import {
  isAuthRole,
  LANDING_COPY,
  loginErrorMessage,
  LOGIN_COPY,
  normalizeAuthLang,
} from '../lib/auth-copy'

test('the pre-auth pages stay in English unless Spanish is asked for', () => {
  assert.equal(normalizeAuthLang('es'), 'es')
  assert.equal(normalizeAuthLang('en'), 'en')
  assert.equal(normalizeAuthLang(undefined), 'en')
  assert.equal(normalizeAuthLang('fr'), 'en')
})

test('an unknown role on the login URL falls back to student rather than crashing', () => {
  assert.equal(isAuthRole('parent'), true)
  assert.equal(isAuthRole('wizard'), false)
  assert.equal(isAuthRole(null), false)
})

test('every role and landing string is actually translated', () => {
  for (const role of ['student', 'parent', 'tutor', 'admin'] as const) {
    assert.notEqual(LOGIN_COPY.es.title[role], LOGIN_COPY.en.title[role], role)
  }
  for (const key of ['tagline', 'prompt', 'student', 'parent', 'tutor', 'adminSubtitle'] as const) {
    assert.notEqual(LANDING_COPY.es[key], LANDING_COPY.en[key], key)
  }
})

test('a sign-in failure is shown in the reader\'s language when the server names it', () => {
  assert.equal(loginErrorMessage('es', 'wrong_pin', 'Wrong PIN'), 'PIN incorrecto')
  assert.equal(loginErrorMessage('en', 'wrong_pin', 'Wrong PIN'), 'Wrong PIN')
  assert.match(loginErrorMessage('es', 'parent_not_found', 'Parent account not found.'), /cuenta de familia/)
})

test('an unrecognized failure still says something instead of going blank', () => {
  assert.equal(loginErrorMessage('es', undefined, 'Verification code expired'), 'Verification code expired')
  assert.equal(loginErrorMessage('es', 'never_seen_before', 'Server said this'), 'Server said this')
  assert.equal(loginErrorMessage('es', undefined, undefined), LOGIN_COPY.es.genericError)
})
