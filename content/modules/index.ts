import type { Module } from '@/types'

export { default as introducingYourself } from './introducing-yourself'
export { default as navigatingSubway } from './navigating-subway'
export { default as buyingGroceries } from './buying-groceries'
export { default as familyTree } from './family-tree'
export { default as buyingClothes } from './buying-clothes'
export { default as sentenceStructure } from './sentence-structure'
export { default as mainIdea } from './main-idea'
export { default as partsOfSpeech } from './parts-of-speech'

import introducingYourself from './introducing-yourself'
import navigatingSubway from './navigating-subway'
import buyingGroceries from './buying-groceries'
import familyTree from './family-tree'
import buyingClothes from './buying-clothes'
import sentenceStructure from './sentence-structure'
import mainIdea from './main-idea'
import partsOfSpeech from './parts-of-speech'

export const ALL_MODULES: Module[] = [
  introducingYourself,
  navigatingSubway,
  buyingGroceries,
  familyTree,
  buyingClothes,
  sentenceStructure,
  mainIdea,
  partsOfSpeech,
]

export function getModule(slug: string): Module | undefined {
  return ALL_MODULES.find(m => m.slug === slug)
}
