import { getModule } from '@/content/modules'
import { notFound } from 'next/navigation'
import TeachingChat from './TeachingChat'

export default async function TeachPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const mod = getModule(slug)
  if (!mod) notFound()

  return <TeachingChat mod={mod} />
}
