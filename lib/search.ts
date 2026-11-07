// Type-to-filter matching for long pick lists (lessons, students, accounts). Case and accents are
// ignored, so "jose" finds "José", and every word of the query must appear in one of the fields, so
// "ana lo" finds "Ana Lopez".

// A roster this short fits on screen; past this, tutor lists get a search box.
export const SEARCHABLE_LIST_SIZE = 8

function normalizeSearchText(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function matchesSearch(query: string, ...fields: Array<string | undefined>): boolean {
  const words = normalizeSearchText(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return true
  const haystack = normalizeSearchText(fields.filter(Boolean).join(' '))
  return words.every(word => haystack.includes(word))
}
