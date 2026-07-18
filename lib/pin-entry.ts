export const PIN_LENGTH = 4

export type PinKeyboardAction =
  | { type: 'digit'; digit: string }
  | { type: 'delete' }

export type PinKeyboardInput = {
  key: string
  altKey?: boolean
  ctrlKey?: boolean
  metaKey?: boolean
  shiftKey?: boolean
  repeat?: boolean
}

export function appendPinDigit(pin: string, digit: string): string {
  if (!/^\d$/.test(digit) || pin.length >= PIN_LENGTH) return pin
  return `${pin}${digit}`
}

export function deleteLastPinDigit(pin: string): string {
  return pin.slice(0, -1)
}

export function getPinKeyboardAction(input: PinKeyboardInput): PinKeyboardAction | null {
  if (input.altKey || input.ctrlKey || input.metaKey || input.shiftKey || input.repeat) return null
  if (/^\d$/.test(input.key)) return { type: 'digit', digit: input.key }
  if (input.key === 'Backspace') return { type: 'delete' }
  return null
}
