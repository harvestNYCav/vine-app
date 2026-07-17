import type { ElaExamDefinition } from '@/content/ela-exams/types'

const NYSED_ELA_ARCHIVE_URL = 'https://www.nysedregents.org/ei/ei-ela.html'

export default function NYSEDAttribution({ exam }: { exam: ElaExamDefinition }) {
  const accessDate = /^\d{4}-\d{2}-\d{2}$/.test(exam.accessedAt)
    ? new Date(`${exam.accessedAt}T00:00:00Z`)
    : new Date(exam.accessedAt)
  const accessedAt = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(accessDate)

  return (
    <aside className="rounded-2xl border border-gray-200 bg-white/70 p-4 text-xs leading-relaxed text-gray-500">
      <p className="font-semibold text-gray-700">Source and educational-use notice</p>
      <p className="mt-1">
        Released ELA questions from the New York State Education Department (NYSED) are presented here
        for noncommercial educational use. Vine is independent and is not affiliated with or endorsed by
        NYSED.
      </p>
      <p className="mt-2">
        Reading passages and other third-party works retain their own rights. Vine provides accessible
        text transcripts alongside facsimiles of the released passage pages for noncommercial educational
        practice. Source and permission credits remain available in the official NYSED booklet linked below.
      </p>
      <p className="mt-2">
        Source:{' '}
        <a
          href={exam.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-green-700 underline decoration-green-300 underline-offset-2"
        >
          {exam.sourceTitle}
        </a>
        . Internet. Accessed {accessedAt}. Browse the{' '}
        <a
          href={NYSED_ELA_ARCHIVE_URL}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-green-700 underline decoration-green-300 underline-offset-2"
        >
          NYSED ELA release archive
        </a>
        .
      </p>
    </aside>
  )
}
