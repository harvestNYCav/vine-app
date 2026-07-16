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
          continuous reading view.
        </p>
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
        {passage.pageCount > 1 && (
          <p className="mt-2 text-[11px] leading-relaxed text-gray-500">
            {passage.pageCount} original booklet pages are combined above.
          </p>
        )}
      </div>
    </details>
  )
}
