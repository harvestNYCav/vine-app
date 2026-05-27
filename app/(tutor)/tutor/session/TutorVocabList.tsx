import type { VocabItem } from '@/types'

export default function TutorVocabList({ vocab }: { vocab: VocabItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {vocab.map(item => (
        <div key={item.id} className="bg-white rounded-xl p-3 border border-amber-100">
          <p className="font-semibold text-gray-800 text-sm">{item.en}</p>
          <p className="text-amber-700 text-sm">{item.es}</p>
          <p className="text-gray-400 text-xs mt-0.5">{item.pronunciation}</p>
        </div>
      ))}
    </div>
  )
}
