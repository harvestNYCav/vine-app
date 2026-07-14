import type { Module } from '@/types'

export { default as introducingYourself } from './introducing-yourself'
export { default as pronounsAndGreetings } from './pronouns-and-greetings'
export { default as nounsAndArticles } from './nouns-and-articles'
export { default as tenses } from './tenses'
export { default as gerundsAndInfinitives } from './gerunds-and-infinitives'
export { default as verbToBe } from './verb-to-be'
export { default as verbToHave } from './verb-to-have'
export { default as demonstratives } from './demonstratives'
export { default as likesAndDislikes } from './likes-and-dislikes'
export { default as negation } from './negation'
export { default as askingQuestions } from './asking-questions'
export { default as possessivesAndReflexives } from './possessives-and-reflexives'
export { default as everydayEssentials } from './everyday-essentials'
export { default as timeDatesSeasons } from './time-dates-seasons'
export { default as shoppingDiningOut } from './shopping-dining-out'
export { default as navigatingSubway } from './navigating-subway'
export { default as buyingGroceries } from './buying-groceries'
export { default as familyTree } from './family-tree'
export { default as buyingClothes } from './buying-clothes'
export { default as healthEmergencies } from './health-emergencies'
export { default as sentenceStructure } from './sentence-structure'
export { default as mainIdea } from './main-idea'
export { default as partsOfSpeech } from './parts-of-speech'

import introducingYourself from './introducing-yourself'
import pronounsAndGreetings from './pronouns-and-greetings'
import nounsAndArticles from './nouns-and-articles'
import tenses from './tenses'
import gerundsAndInfinitives from './gerunds-and-infinitives'
import verbToBe from './verb-to-be'
import verbToHave from './verb-to-have'
import demonstratives from './demonstratives'
import likesAndDislikes from './likes-and-dislikes'
import negation from './negation'
import askingQuestions from './asking-questions'
import possessivesAndReflexives from './possessives-and-reflexives'
import everydayEssentials from './everyday-essentials'
import timeDatesSeasons from './time-dates-seasons'
import shoppingDiningOut from './shopping-dining-out'
import navigatingSubway from './navigating-subway'
import buyingGroceries from './buying-groceries'
import familyTree from './family-tree'
import buyingClothes from './buying-clothes'
import healthEmergencies from './health-emergencies'
import sentenceStructure from './sentence-structure'
import mainIdea from './main-idea'
import partsOfSpeech from './parts-of-speech'

export const ALL_MODULES: Module[] = [
  introducingYourself,
  pronounsAndGreetings,
  nounsAndArticles,
  tenses,
  gerundsAndInfinitives,
  verbToBe,
  verbToHave,
  demonstratives,
  likesAndDislikes,
  negation,
  askingQuestions,
  possessivesAndReflexives,
  everydayEssentials,
  timeDatesSeasons,
  shoppingDiningOut,
  navigatingSubway,
  buyingGroceries,
  familyTree,
  buyingClothes,
  healthEmergencies,
  sentenceStructure,
  mainIdea,
  partsOfSpeech,
]

export function getModule(slug: string): Module | undefined {
  return ALL_MODULES.find(m => m.slug === slug)
}
