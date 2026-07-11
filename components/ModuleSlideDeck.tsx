'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { Module, VocabItem, TeachingScenario } from '@/types'

type Slide =
  | { type: 'title' }
  | { type: 'vocab'; items: VocabItem[]; part: number; total: number }
  | { type: 'scenario'; scenario: TeachingScenario; index: number; total: number }
  | { type: 'wrapup' }

function buildSlides(mod: Module): Slide[] {
  const slides: Slide[] = [{ type: 'title' }]
  const chunkSize = 4
  const chunks: VocabItem[][] = []
  for (let i = 0; i < mod.vocab.length; i += chunkSize) {
    chunks.push(mod.vocab.slice(i, i + chunkSize))
  }
  chunks.forEach((items, i) => slides.push({ type: 'vocab', items, part: i + 1, total: chunks.length }))
  mod.teachingScenarios.forEach((scenario, i) =>
    slides.push({ type: 'scenario', scenario, index: i + 1, total: mod.teachingScenarios.length })
  )
  slides.push({ type: 'wrapup' })
  return slides
}

interface Props {
  mod: Module
  variant: 'tutor' | 'student'
  onFinish?: () => void
}

export default function ModuleSlideDeck({ mod, variant, onFinish }: Props) {
  const slides = useMemo(() => buildSlides(mod), [mod])
  const [index, setIndex] = useState(0)
  const firedFinish = useRef(false)
  const slide = slides[index]
  const isLast = index === slides.length - 1

  useEffect(() => {
    if (isLast && variant === 'student' && !firedFinish.current) {
      firedFinish.current = true
      onFinish?.()
    }
  }, [isLast, variant, onFinish])

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 text-sm text-gray-400">
        <a href={variant === 'tutor' ? '/vine-app/tutor/lessons' : `/vine-app/modules/${mod.slug}`} className="hover:text-white">
          ← Back
        </a>
        <span>{mod.titleEn}</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 text-center">
        {slide.type === 'title' && (
          <>
            <p className="text-2xl md:text-3xl text-amber-300 mb-3">{mod.titleEs}</p>
            <h1 className="text-5xl md:text-7xl font-bold mb-6">{mod.titleEn}</h1>
            <p className="text-xl md:text-2xl text-gray-300 max-w-2xl">{mod.descriptionEn}</p>
            <p className="text-lg md:text-xl text-gray-400 max-w-2xl mt-2">{mod.descriptionEs}</p>
          </>
        )}

        {slide.type === 'vocab' && (
          <div className="w-full max-w-3xl">
            <p className="text-amber-300 text-lg mb-6">Vocabulary {slide.part}/{slide.total}</p>
            <div className="space-y-6">
              {slide.items.map(item => (
                <div key={item.id} className="border-b border-gray-700 pb-4">
                  <p className="text-3xl md:text-4xl font-bold">{item.en}</p>
                  <p className="text-2xl md:text-3xl text-amber-300 mt-1">{item.es}</p>
                  <p className="text-base md:text-lg text-gray-400 mt-2 italic">{item.exampleEn}</p>
                  <p className="text-base md:text-lg text-gray-500 italic">{item.exampleEs}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {slide.type === 'scenario' && (
          <div className="w-full max-w-2xl">
            <p className="text-amber-300 text-lg mb-6">Role-Play {slide.index}/{slide.total}</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">{slide.scenario.label}</h2>
            <p className="text-xl md:text-2xl text-gray-200 leading-relaxed">{slide.scenario.text}</p>
          </div>
        )}

        {slide.type === 'wrapup' && (
          <div className="w-full max-w-xl">
            <div className="text-6xl mb-6">🎉</div>
            <h2 className="text-4xl font-bold mb-4">
              {variant === 'tutor' ? "That's the lesson!" : 'Great review!'}
            </h2>
            {variant === 'tutor' ? (
              <>
                <p className="text-xl text-gray-300 mb-8">Assign this week&apos;s homework worksheet before wrapping up.</p>
                <a href="/vine-app/tutor/lessons">
                  <button className="bg-amber-500 text-gray-900 text-lg font-semibold px-8 py-4 rounded-2xl hover:bg-amber-400">
                    End Presentation
                  </button>
                </a>
              </>
            ) : (
              <>
                <p className="text-xl text-gray-300 mb-8">Now complete your homework worksheet.</p>
                <a href={`/vine-app/modules/${mod.slug}/homework`}>
                  <button className="bg-amber-500 text-gray-900 text-lg font-semibold px-8 py-4 rounded-2xl hover:bg-amber-400">
                    Go to Homework 📓
                  </button>
                </a>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-6 py-5 border-t border-gray-800">
        <button
          onClick={() => setIndex(i => Math.max(0, i - 1))}
          disabled={index === 0}
          className="text-lg px-5 py-2 rounded-xl bg-gray-800 disabled:opacity-30"
        >
          ← Back
        </button>
        <span className="text-gray-400">{index + 1} / {slides.length}</span>
        <button
          onClick={() => setIndex(i => Math.min(slides.length - 1, i + 1))}
          disabled={isLast}
          className="text-lg px-5 py-2 rounded-xl bg-amber-500 text-gray-900 disabled:opacity-30"
        >
          Next →
        </button>
      </div>
    </div>
  )
}
