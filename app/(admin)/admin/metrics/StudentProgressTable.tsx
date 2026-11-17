import type { StudentProgress } from '@/lib/admin-metrics'
import { count, flagClass, formatDay, maybe, percent } from './format'

const LOW_QUIZ = 0.6

function attentionFlags(student: StudentProgress): string[] {
  const flags: string[] = []
  if (student.quizAverage !== null && student.quizAverage < LOW_QUIZ) flags.push('Low quiz scores')
  // Fewer than a third of assigned homework done.
  if (student.homeworkAssigned >= 2 && student.homeworkDone * 3 < student.homeworkAssigned) flags.push('Skipping homework')
  if (student.lessonsAttended >= 2 && student.homePracticeDays === 0) flags.push('No practice at home')
  if (student.placementDue) flags.push('Not placed')
  return flags
}

export default function StudentProgressTable({ students }: { students: StudentProgress[] }) {
  if (students.length === 0) return <p className="text-sm text-slate-500">No students yet.</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs text-slate-500">
            <th className="py-2 pr-3 font-semibold">Student</th>
            <th className="px-2 py-2 font-semibold">ESL level</th>
            <th className="px-2 py-2 text-right font-semibold">Lessons</th>
            <th className="px-2 py-2 text-right font-semibold">Quiz avg</th>
            <th className="px-2 py-2 text-right font-semibold">Homework</th>
            <th className="px-2 py-2 text-right font-semibold">Home practice</th>
            <th className="px-2 py-2 text-right font-semibold">Words</th>
            <th className="px-2 py-2 font-semibold">Last seen</th>
            <th className="py-2 pl-2 font-semibold">Worth a look</th>
          </tr>
        </thead>
        <tbody>
          {students.map(student => {
            const flags = attentionFlags(student)
            return (
              <tr key={student.id} className="border-b border-slate-100 align-top last:border-0">
                <td className="py-2 pr-3">
                  <p className="font-medium text-slate-800">{student.name}</p>
                  <p className="text-xs text-slate-400">
                    {student.tracks.length ? student.tracks.map(track => track.toUpperCase()).join(' · ') : 'No tracks'}
                  </p>
                </td>
                <td className="px-2 py-2 text-slate-700">
                  {student.currentLevel === null ? (
                    <span className="text-slate-400">—</span>
                  ) : student.placements > 1 ? (
                    <span>
                      {student.firstLevel} → <span className="font-semibold">{student.currentLevel}</span>
                      {student.movedUp && <span className={`ml-1 rounded-full px-1.5 py-0.5 text-xs font-semibold ${flagClass('good')}`}>▲ Moved up</span>}
                    </span>
                  ) : (
                    <span>{student.currentLevel} <span className="text-xs text-slate-400">(not re-tested)</span></span>
                  )}
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-slate-700">{count(student.lessonsAttended)}</td>
                <td className="px-2 py-2 text-right tabular-nums text-slate-700">{maybe(student.quizAverage, percent)}</td>
                <td className="px-2 py-2 text-right tabular-nums text-slate-700">
                  {student.homeworkAssigned ? `${student.homeworkDone}/${student.homeworkAssigned}` : '—'}
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-slate-700">
                  {student.homePracticeDays} {student.homePracticeDays === 1 ? 'day' : 'days'}
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-slate-700">{count(student.wordsMastered)}</td>
                <td className="whitespace-nowrap px-2 py-2 text-slate-500">
                  {student.lastSeen ? formatDay(student.lastSeen) : 'Never'}
                </td>
                <td className="py-2 pl-2">
                  <div className="flex flex-wrap gap-1">
                    {flags.map(flag => (
                      <span key={flag} className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${flagClass('warn')}`}>
                        {flag}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
