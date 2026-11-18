export const count = (value: number) => value.toLocaleString('en-US')
export const percent = (value: number) => `${Math.round(value * 100)}%`
export const rating = (value: number) => value.toFixed(1)
export const minutes = (value: number) => `${Math.round(value)} min`

export function maybe(value: number | null, format: (value: number) => string): string {
  return value === null ? '—' : format(value)
}

export function formatDay(key: string): string {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', timeZone: 'UTC',
  })
}

// Small pill used for flags. The label carries the meaning; color only reinforces it.
export function flagClass(tone: 'warn' | 'good' | 'muted'): string {
  return {
    warn: 'bg-amber-100 text-amber-800',
    good: 'bg-green-100 text-green-800',
    muted: 'bg-slate-100 text-slate-600',
  }[tone]
}

// "Sat, Nov 14"
export function formatDayLong(key: string): string {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC',
  })
}

export const plural = (n: number, one: string, many = `${one}s`) => `${count(n)} ${n === 1 ? one : many}`
