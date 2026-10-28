import type { RegentsPassage } from '@/content/regents/types'
import InlineEmphasis from './InlineEmphasis'

export default function RegentsPassage({ passage }: { passage: RegentsPassage }) {
  if (passage.transcriptReviewStatus !== 'reviewed') return null

  return (
    <details className="rounded-2xl border border-purple-200 bg-purple-50 open:bg-white">
      <summary className="cursor-pointer px-4 py-3 font-semibold text-purple-900">
        Read passage: {passage.title}
      </summary>
      <div className="max-h-[65vh] overflow-y-auto border-t border-purple-100 px-4 py-4">
        <h3 className="text-lg font-bold text-gray-900">{passage.title}</h3>
        {passage.credit && <p className="mt-1 text-xs text-gray-500">{passage.credit}</p>}
        <div className="mt-4 space-y-1 text-sm leading-7 text-gray-800">
          {passage.lines.map((line, index) => (
            <div key={`${line.number ?? 'break'}-${index}`} className="grid grid-cols-[2.5rem_1fr] gap-2">
              {line.number === null ? (
                <span aria-hidden="true" />
              ) : (
                <span className="text-right tabular-nums text-gray-400" aria-hidden="true">{line.number}</span>
              )}
              <span>
                {line.number !== null && <span className="sr-only">Line {line.number}. </span>}
                <InlineEmphasis text={line.text || '\u00a0'} />
              </span>
            </div>
          ))}
        </div>
      </div>
    </details>
  )
}
