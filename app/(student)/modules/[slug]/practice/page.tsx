import { getModule } from '@/content/modules'
import { notFound } from 'next/navigation'
import QuizClient from './QuizClient'

export default async function PracticePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const mod = getModule(slug)
  if (!mod) notFound()

  return (
    <div className="max-w-lg mx-auto w-full px-4 py-6">
      <QuizClient mod={mod} />
    </div>
  )
}
