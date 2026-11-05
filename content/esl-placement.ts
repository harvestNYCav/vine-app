// The ESL placement test: a short, tutor-led check for a student's first session, so the tutor
// knows which lesson to start from. The tutor reads each prompt aloud (and shows the card, if there
// is one), then marks whether the student's answer shows they have the skill.
//
// Stage 1 checks what lessons 1–8 teach and stage 2 checks lessons 9–12. Passing a stage means the
// student can skip those lessons. A student who doesn't pass stage 1 never sees stage 2.
//
// A close call (a core score one below the pass mark, or exactly on it) gets a few tiebreaker
// questions on the same skills, so one nervous answer doesn't decide the level. The stage is then
// decided on core + tiebreakers against `tiebreakPassMark`.
//
// Item ids are stored with each saved placement. Don't reuse an id for a different question; add a
// new one and bump ESL_PLACEMENT_VERSION instead.

export const ESL_PLACEMENT_VERSION = 'v1'

export type EslLevelId = 'beginner' | 'low-intermediate' | 'higher'

export interface EslLevel {
  id: EslLevelId
  label: string
  description: string
  // The first ESL lesson (a module slug) a student at this level should be taught.
  startModuleSlug: string
}

export const ESL_LEVELS: EslLevel[] = [
  {
    id: 'beginner',
    label: 'Beginner',
    description: 'Little or no English yet. Start from the first lesson.',
    startModuleSlug: 'introducing-yourself',
  },
  {
    id: 'low-intermediate',
    label: 'Low-intermediate',
    description: 'Handles greetings, "to be" and "to have". Ready for likes, negatives and questions.',
    startModuleSlug: 'likes-and-dislikes',
  },
  {
    id: 'higher',
    label: 'Higher',
    description: 'Talks about the past, asks questions and reads short texts. Ready for everyday situations.',
    startModuleSlug: 'everyday-essentials',
  },
]

export interface EslPlacementItem {
  id: string
  skill: string
  // What the tutor says out loud.
  say: string
  // Text (or a picture) the tutor shows the student. If the student can't read it, the tutor reads
  // it aloud.
  card?: string
  // What counts as a pass.
  listenFor: string
}

export interface EslPlacementStage {
  id: 'basics' | 'everyday'
  title: string
  coversLessons: string
  passMark: number
  items: EslPlacementItem[]
  tiebreakers: EslPlacementItem[]
  // Out of items + tiebreakers.
  tiebreakPassMark: number
}

export const ESL_PLACEMENT_STAGES: EslPlacementStage[] = [
  {
    id: 'basics',
    title: 'Stage 1 · Basics',
    coversLessons: 'lessons 1–8',
    passMark: 4,
    items: [
      {
        id: 'b1-name',
        skill: 'Introducing yourself',
        say: 'Hi! What\'s your name?',
        listenFor: 'Understands and answers: "My name is Ana" or just "Ana".',
      },
      {
        id: 'b2-greeting',
        skill: 'Greetings',
        say: 'Nice to meet you. How are you today?',
        listenFor: 'A fitting reply: "Good, thank you", "Fine", "I\'m OK".',
      },
      {
        id: 'b3-object',
        skill: 'Naming things',
        say: 'What is this?',
        card: '🍎',
        listenFor: '"An apple", "It\'s an apple" or just "apple".',
      },
      {
        id: 'b4-to-be',
        skill: 'Verb "to be"',
        say: 'Read this. What are the missing words?',
        card: 'She ___ a teacher.\nThey ___ my friends.',
        listenFor: 'Both right: "is", then "are".',
      },
      {
        id: 'b5-to-have',
        skill: 'Verb "to have"',
        say: 'Do you have a phone?',
        listenFor: 'Understands the question: "Yes, I do", "Yes, I have a phone", "No, I don\'t".',
      },
    ],
    tiebreakPassMark: 6,
    tiebreakers: [
      {
        id: 'bt1-to-be-question',
        skill: 'Verb "to be"',
        say: 'Are you tired today?',
        listenFor: 'Understands and answers: "Yes, I am", "No, I\'m not", "A little".',
      },
      {
        id: 'bt2-plural',
        skill: 'Naming things',
        say: 'What are these?',
        card: '📚',
        listenFor: '"Books" or "They\'re books". The plural matters.',
      },
      {
        id: 'bt3-this-that',
        skill: 'This and that',
        say: 'Point to something near you and say "This is…". Then point to something far away and say "That is…".',
        listenFor: 'Both: "This is a cup. That is a door."',
      },
    ],
  },
  {
    id: 'everyday',
    title: 'Stage 2 · Everyday English',
    coversLessons: 'lessons 9–12',
    passMark: 4,
    items: [
      {
        id: 'e1-likes',
        skill: 'Likes and negatives',
        say: 'What food do you like? What food don\'t you like?',
        listenFor: 'A "like" and a "don\'t like": "I like rice. I don\'t like fish."',
      },
      {
        id: 'e2-past',
        skill: 'Past tense',
        say: 'What did you do yesterday?',
        listenFor: 'A past-tense verb, even with small mistakes: "I went to work", "I cooked dinner".',
      },
      {
        id: 'e3-question',
        skill: 'Asking questions',
        say: 'Now you ask me a question. Ask me about my job or my weekend.',
        listenFor: 'A question with the right word order: "Where do you work?", "What did you do on the weekend?"',
      },
      {
        id: 'e4-reading',
        skill: 'Reading and possessives',
        say: 'Read this. Whose keys were they? Where did she lose them?',
        card: 'Ana lost her keys at the park.\nTom found them and gave them back to her.',
        listenFor: 'Both right: "Ana\'s" (or "her keys"), and "at the park".',
      },
      {
        id: 'e5-describe',
        skill: 'Speaking in sentences',
        say: 'Tell me about a place in the city you like. Why do you like it?',
        listenFor: 'Two or three connected sentences that are mostly correct.',
      },
    ],
    tiebreakPassMark: 6,
    tiebreakers: [
      {
        id: 'et1-not-understand',
        skill: 'Negatives',
        say: 'Pretend you didn\'t understand me. What do you say?',
        listenFor: '"I don\'t understand. Can you repeat, please?" or close to it.',
      },
      {
        id: 'et2-past',
        skill: 'Past tense',
        say: 'What did you eat for breakfast today?',
        listenFor: 'A past-tense verb: "I ate eggs", "I had coffee". "I eat eggs" is ✗.',
      },
      {
        id: 'et3-question',
        skill: 'Asking questions',
        say: 'Ask me where the bathroom is.',
        listenFor: '"Where is the bathroom?" with the right word order.',
      },
    ],
  },
]

export function getEslLevel(id: string): EslLevel | undefined {
  return ESL_LEVELS.find(level => level.id === id)
}
