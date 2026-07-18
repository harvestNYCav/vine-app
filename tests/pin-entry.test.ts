import test from 'node:test'
import assert from 'node:assert/strict'
import {
  appendPinDigit,
  deleteLastPinDigit,
  getPinKeyboardAction,
} from '../lib/pin-entry'

test('PIN digit transitions accept one ASCII digit and never exceed four digits', () => {
  let pin = ''
  for (const digit of ['1', '2', '3', '4', '5']) {
    pin = appendPinDigit(pin, digit)
  }

  assert.equal(pin, '1234')
  assert.equal(appendPinDigit(pin, 'x'), pin)
  assert.equal(appendPinDigit('', '12'), '')
  assert.equal(appendPinDigit('', '١'), '')
})

test('PIN delete matches the keypad delete behavior at every length', () => {
  assert.equal(deleteLastPinDigit('1234'), '123')
  assert.equal(deleteLastPinDigit('1'), '')
  assert.equal(deleteLastPinDigit(''), '')
})

test('keyboard mapping accepts digit keys and Backspace but ignores invalid or duplicate events', () => {
  assert.deepEqual(getPinKeyboardAction({ key: '7' }), { type: 'digit', digit: '7' })
  assert.deepEqual(getPinKeyboardAction({ key: '0' }), { type: 'digit', digit: '0' })
  assert.deepEqual(getPinKeyboardAction({ key: 'Backspace' }), { type: 'delete' })

  assert.equal(getPinKeyboardAction({ key: 'Delete' }), null)
  assert.equal(getPinKeyboardAction({ key: 'a' }), null)
  assert.equal(getPinKeyboardAction({ key: '7', ctrlKey: true }), null)
  assert.equal(getPinKeyboardAction({ key: '7', altKey: true }), null)
  assert.equal(getPinKeyboardAction({ key: '7', metaKey: true }), null)
  assert.equal(getPinKeyboardAction({ key: '7', shiftKey: true }), null)
  assert.equal(getPinKeyboardAction({ key: '7', repeat: true }), null)
})

test('keyboard actions can delete and replace a digit without duplicating held keys', () => {
  let pin = ''
  for (const input of [
    { key: '1' },
    { key: '1', repeat: true },
    { key: '2' },
    { key: '3' },
    { key: 'Backspace' },
    { key: '4' },
  ]) {
    const action = getPinKeyboardAction(input)
    if (action?.type === 'digit') pin = appendPinDigit(pin, action.digit)
    if (action?.type === 'delete') pin = deleteLastPinDigit(pin)
  }

  assert.equal(pin, '124')
})
