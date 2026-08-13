import SkillPage from '@/app/(student)/skills/[tag]/page'

export default function FamilySkillPage({
  params,
  searchParams,
}: {
  params: Promise<{ tag: string }>
  searchParams: Promise<{ lang?: string }>
}) {
  return <SkillPage params={params} searchParams={searchParams} />
}
