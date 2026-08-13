import HomePage from '@/app/(student)/home/page'

// The parent surface is the learner surface: same components, same data, read
// only. Anything that renders differently for a parent is decided by the
// student view's readOnly flag inside the page itself.
export default function FamilyHomePage() {
  return <HomePage />
}
