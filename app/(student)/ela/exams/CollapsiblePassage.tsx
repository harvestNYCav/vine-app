import Image from 'next/image'
import type { ElaExamSectionDefinition } from '@/content/ela-exams/types'

export default function CollapsiblePassage({
  passage,
  passageLabel,
  compact = false,
}: {
  passage: ElaExamSectionDefinition['passage']
  passageLabel: string
  compact?: boolean
}) {
  if (!passage.src.startsWith('/') || passage.src.startsWith('//')) {
    throw new Error('CollapsiblePassage requires an app-local image source')
  }

  return (
    <details className="group overflow-hidden rounded-2xl border border-blue-200 bg-blue-50">
      <summary
        className={`flex cursor-pointer list-none items-center justify-between gap-3 text-blue-950 [&::-webkit-details-marker]:hidden ${
          compact ? 'px-3 py-2.5' : 'p-4'
        }`}
      >
        <span className="min-w-0">
          <span className="block text-xs font-bold uppercase tracking-wide text-blue-700">
            Reading passage
          </span>
          <span className={`block truncate font-semibold ${compact ? 'text-sm' : 'mt-0.5 text-base'}`}>
            {passageLabel}
          </span>
        </span>
        <span className="flex flex-shrink-0 items-center gap-2 text-xs font-bold text-blue-700">
          <span className="group-open:hidden">Show passage</span>
          <span className="hidden group-open:inline">Hide passage</span>
          <span className="text-base transition-transform group-open:rotate-180" aria-hidden="true">⌄</span>
        </span>
      </summary>

      <div className={`border-t border-blue-200 bg-white ${compact ? 'p-2.5' : 'p-3'}`}>
        <p className="mb-2 text-xs leading-relaxed text-gray-600">
          Original line and paragraph numbers are preserved. PDF page breaks have been removed for a
          continuous reading view. Every passage includes a reviewed text transcript.
        </p>
        {passage.transcript ? (
          <>
            <section aria-label={`${passageLabel} accessible transcript`}>
              <h3 className="mb-2 text-sm font-bold text-gray-900">Accessible text transcript</h3>
              <div
                role="document"
                tabIndex={0}
                aria-label={`${passageLabel} transcript`}
                className={`overflow-auto whitespace-pre-wrap rounded-xl border border-gray-200 bg-white p-4 font-serif text-[15px] leading-7 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  compact ? 'max-h-[55vh]' : 'max-h-[70vh]'
                }`}
              >
                {passage.transcript.text}
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-gray-500">
                Transcript checked against the released booklet. Bracketed descriptions explain
                question-relevant visuals and text features.
              </p>
            </section>

            <details className="mt-3 rounded-xl border border-gray-200 bg-gray-50">
              <summary className="cursor-pointer px-3 py-2 text-xs font-bold text-gray-700">
                View original passage facsimile
              </summary>
              <div
                className={`overflow-auto border-t border-gray-200 bg-white ${
                  compact ? 'max-h-[55vh]' : 'max-h-[70vh]'
                }`}
              >
                <Image
                  src={passage.src}
                  alt=""
                  aria-hidden="true"
                  width={passage.width}
                  height={passage.height}
                  sizes="(max-width: 640px) 100vw, 512px"
                  className="h-auto w-full"
                />
              </div>
            </details>
          </>
        ) : (
          <div
            className={`overflow-auto rounded-xl border border-gray-200 bg-white ${
              compact ? 'max-h-[55vh]' : 'max-h-[70vh]'
            }`}
          >
            <Image
              src={passage.src}
              alt={passage.alt}
              width={passage.width}
              height={passage.height}
              sizes="(max-width: 640px) 100vw, 512px"
              className="h-auto w-full"
            />
          </div>
        )}
        {passage.pageCount > 1 && (
          <p className="mt-2 text-[11px] leading-relaxed text-gray-500">
            {passage.pageCount} original booklet pages are combined above.
          </p>
        )}
      </div>
    </details>
  )
}
