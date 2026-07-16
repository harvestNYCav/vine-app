import type { ElaPassageReference } from '@/content/ela-exams/types'

function sourceUrlAtPage(sourceUrl: string, page: number) {
  return `${sourceUrl.split('#')[0]}#page=${page}`
}

export function formatPdfPageRange(reference: ElaPassageReference) {
  return reference.pageStart === reference.pageEnd
    ? `PDF page ${reference.pageStart}`
    : `PDF pages ${reference.pageStart}–${reference.pageEnd}`
}

export default function OfficialPassageLinks({
  references,
  compact = false,
}: {
  references: ElaPassageReference[]
  compact?: boolean
}) {
  return (
    <aside className={`rounded-2xl border border-blue-200 bg-blue-50 ${compact ? 'p-3' : 'p-4'}`}>
      <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
        Read in the official PDF first
      </p>
      <p className="mt-1 text-sm leading-relaxed text-blue-950">
        Open the passage in the NYSED booklet and keep it available while you answer. Vine displays only
        the question and answer choices.
      </p>
      <div className="mt-3 space-y-2">
        {references.map((reference, index) => (
          <a
            key={`${reference.sourceUrl}-${reference.pageStart}-${reference.pageEnd}-${index}`}
            href={sourceUrlAtPage(reference.sourceUrl, reference.pageStart)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between gap-3 rounded-xl border border-blue-200 bg-white px-3 py-2.5 font-semibold text-blue-800 shadow-sm transition-colors hover:bg-blue-100"
          >
            <span className="min-w-0 text-sm underline decoration-blue-300 underline-offset-2">
              {reference.label}
            </span>
            <span className="flex-shrink-0 text-xs font-bold text-blue-700">
              {formatPdfPageRange(reference)} <span aria-hidden="true">↗</span>
            </span>
          </a>
        ))}
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-blue-800">
        Page numbers refer to physical PDF pages. Your browser should open the first listed page; if it
        does not, use the displayed page range.
      </p>
    </aside>
  )
}
