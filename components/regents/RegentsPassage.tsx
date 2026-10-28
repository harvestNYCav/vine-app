import type { RegentsPassage } from '@/content/regents/types'
import InlineEmphasis from './InlineEmphasis'

export default function RegentsPassage({ passage }: { passage: RegentsPassage }) {
  if (passage.transcriptReviewStatus !== 'reviewed') return null

  // Blank transcript lines preserve source paragraph/stanza boundaries. Use
  // semantic paragraphs so assistive technology can navigate those boundaries.
  const paragraphs: RegentsPassage['lines'][] = []
  let paragraph: RegentsPassage['lines'] = []
  for (const line of passage.lines) {
    if (!line.text.trim()) {
      if (paragraph.length) paragraphs.push(paragraph)
      paragraph = []
    } else {
      if (paragraph.length && (line.number === 1 ||
        (line.number === null && paragraph[paragraph.length - 1].number !== null))) {
        paragraphs.push(paragraph)
        paragraph = []
      }
      paragraph.push(line)
    }
  }
  if (paragraph.length) paragraphs.push(paragraph)

  return (
    <details className="rounded-2xl border border-purple-200 bg-purple-50 open:bg-white">
      <summary className="cursor-pointer px-4 py-3 font-semibold text-purple-900">
        Read passage: {passage.title}
      </summary>
      <div className="max-h-[65vh] overflow-y-auto border-t border-purple-100 px-4 py-4">
        <h3 className="text-lg font-bold text-gray-900">{passage.title}</h3>
        {passage.credit && <p className="mt-1 text-xs text-gray-500">{passage.credit}</p>}
        <div className="mt-4 space-y-4 text-sm leading-7 text-gray-800">
          {paragraphs.map((lines, paragraphIndex) => (
            <p key={paragraphIndex} className="space-y-1" data-passage-paragraph>
              {lines.map((line, index) => (
                <span key={`${line.number ?? 'note'}-${index}`} className="grid grid-cols-[2.5rem_1fr] gap-2">
                  {line.number === null ? (
                    <span aria-hidden="true" />
                  ) : (
                    <span className="text-right tabular-nums text-gray-400" aria-hidden="true">{line.number}</span>
                  )}
                  <span>
                    {line.number !== null && <span className="sr-only">Line {line.number}. </span>}
                    <InlineEmphasis text={line.text} />
                  </span>
                </span>
              ))}
            </p>
          ))}
        </div>
      </div>
    </details>
  )
}
