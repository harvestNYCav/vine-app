import type { TutorUsage } from '@/lib/admin-metrics'
import { count, flagClass, formatDay, maybe, minutes, percent, rating } from './format'

// A rate below this is worth a conversation with the tutor.
const LOW_RATE = 0.5

function RateCell({ value }: { value: number | null }) {
  return (
    <td className="px-2 py-2 text-right tabular-nums text-slate-700">
      {value === null ? '—' : value < LOW_RATE ? (
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${flagClass('warn')}`}>Low · {percent(value)}</span>
      ) : percent(value)}
    </td>
  )
}

export default function TutorUsageTable({ tutors }: { tutors: TutorUsage[] }) {
  const teaching = tutors.filter(tutor => tutor.lessonsTaught > 0 || tutor.sessionDays > 0)
  const idle = tutors.filter(tutor => !teaching.includes(tutor))
  if (tutors.length === 0) return <p className="text-sm text-slate-500">No tutors yet.</p>
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs text-slate-500">
              <th className="py-2 pr-3 font-semibold">Tutor</th>
              <th className="px-2 py-2 text-right font-semibold">Days here</th>
              <th className="px-2 py-2 text-right font-semibold">Lessons</th>
              <th className="px-2 py-2 text-right font-semibold">Used slides</th>
              <th className="px-2 py-2 text-right font-semibold">Slide time</th>
              <th className="px-2 py-2 text-right font-semibold">Wrap-ups</th>
              <th className="px-2 py-2 text-right font-semibold">Gave homework</th>
              <th className="px-2 py-2 text-right font-semibold">Avg rating</th>
              <th className="px-2 py-2 text-right font-semibold">Placements</th>
              <th className="py-2 pl-2 font-semibold">Last taught</th>
            </tr>
          </thead>
          <tbody>
            {teaching.map(tutor => (
              <tr key={tutor.id} className="border-b border-slate-100 align-top last:border-0">
                <td className="py-2 pr-3 font-medium text-slate-800">{tutor.name}</td>
                <td className="px-2 py-2 text-right tabular-nums text-slate-700">{count(tutor.sessionDays)}</td>
                <td className="px-2 py-2 text-right tabular-nums text-slate-700">
                  {tutor.studentsTaught === 0 ? count(tutor.lessonsTaught) : (
                    // The students are a click away rather than a long cell in every row.
                    <details className="group inline-block text-right">
                      <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                        {count(tutor.lessonsTaught)}
                        <span className="text-xs text-blue-700 group-hover:underline">
                          {' '}· {tutor.studentsTaught} {tutor.studentsTaught === 1 ? 'student' : 'students'} ▾
                        </span>
                      </summary>
                      <p className="mt-1 max-w-[14rem] text-left text-xs leading-relaxed text-slate-600">{tutor.studentNames.join(', ')}</p>
                    </details>
                  )}
                </td>
                <RateCell value={tutor.deckUseRate} />
                <td className="px-2 py-2 text-right tabular-nums text-slate-700">{maybe(tutor.averageDeckMinutes, minutes)}</td>
                <RateCell value={tutor.wrapUpRate} />
                <RateCell value={tutor.homeworkAssignedRate} />
                <td className="px-2 py-2 text-right tabular-nums text-slate-700">{maybe(tutor.averageRatingGiven, rating)}</td>
                <td className="px-2 py-2 text-right tabular-nums text-slate-700">{count(tutor.placementsGiven)}</td>
                <td className="whitespace-nowrap py-2 pl-2 text-slate-500">{tutor.lastTaught ? formatDay(tutor.lastTaught) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {idle.length > 0 && (
        <p className="mt-3 text-xs text-slate-500">
          No lessons or check-ins:{idle.map(tutor => tutor.name).join(', ')}
        </p>
      )}
    </div>
  )
}
