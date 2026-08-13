import ModulesPage from '@/app/(student)/modules/page'

export default function FamilyLessonsPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; lang?: string }>
}) {
  return <ModulesPage searchParams={searchParams} />
}
