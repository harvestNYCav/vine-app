import ProgressPage from '@/app/(student)/progress/page'

export default function FamilyProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; lang?: string }>
}) {
  return <ProgressPage searchParams={searchParams} />
}
