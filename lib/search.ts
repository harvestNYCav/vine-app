// Lowercase and strip accents so "familia" finds "Familia" and "cafe" finds "café".
export function normalizeSearchText(value: string) {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

// True when every word of the query appears somewhere in the given fields.
export function matchesSearch(query: string, fields: Array<string | number | undefined>) {
  const terms = normalizeSearchText(query).split(/\s+/).filter(Boolean)
  if (terms.length === 0) return true
  const haystack = normalizeSearchText(fields.filter(field => field !== undefined).join(' '))
  return terms.every(term => haystack.includes(term))
}
