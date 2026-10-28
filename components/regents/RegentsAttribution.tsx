import type { RegentsExam } from '@/content/regents/types'

export default function RegentsAttribution({ exam }: { exam: Pick<RegentsExam, 'course' | 'sourceUrl' | 'answerKeyUrl'> }) {
  return (
    <aside className="rounded-2xl border border-gray-200 bg-white/70 p-4 text-xs leading-relaxed text-gray-600">
      <p className="font-semibold text-gray-800">Source and educational-use notice</p>
      <p className="mt-1">
        These released Regents questions are from the New York State Education Department (NYSED)
        and are presented for noncommercial educational practice. Vine is independent and is not
        affiliated with or endorsed by NYSED.
      </p>
      {exam.course === 'english' && (
        <p className="mt-2">
          Reading passages may contain third-party works whose rights remain with their owners.
          Original author and publication credits are retained with the passage and in the official booklet.
        </p>
      )}
      <p className="mt-2">
        <a className="font-medium text-green-700 underline" href={exam.sourceUrl} target="_blank" rel="noreferrer">Official exam booklet</a>
        {' · '}
        <a className="font-medium text-green-700 underline" href={exam.answerKeyUrl} target="_blank" rel="noreferrer">Official scoring key</a>
      </p>
    </aside>
  )
}
