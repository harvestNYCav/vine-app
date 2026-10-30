import Image from 'next/image'
import type { ReactNode } from 'react'
import type { TutorExamPreview } from '@/lib/tutor-exam-preview'
import type { ElaExplanationSource } from '@/content/ela-exams/types'
import { getMathExamStudentNotice } from '@/content/math-exams/student-notices'
import CollapsiblePassage from '@/app/(student)/ela/exams/CollapsiblePassage'
import ElaAttribution from '@/app/(student)/ela/exams/NYSEDAttribution'
import MathAttribution from '@/app/(student)/math/exams/NYSEDAttribution'
import MeasurementGuide from '@/app/(student)/math/exams/[examSlug]/[sectionSlug]/practice/MeasurementGuide'

function LessonContent({ overview, goals, strategy, prompt, steps, answer, isSpanish = false }: {
  overview: string
  goals: string[]
  strategy: string
  prompt: string
  steps: string[]
  answer: string
  isSpanish?: boolean
}) {
  return (
    <div className="space-y-5 text-sm leading-relaxed text-gray-700">
      <section>
        <h3 className="font-bold text-gray-900">{isSpanish ? 'Idea principal' : 'Big idea'}</h3>
        <p className="mt-2">{overview}</p>
      </section>
      <section>
        <h3 className="font-bold text-gray-900">{isSpanish ? 'Lo que aprenderás' : 'What you will learn'}</h3>
        <ul className="mt-2 list-disc space-y-2 pl-5">
          {goals.map((goal, index) => <li key={index}>{goal}</li>)}
        </ul>
      </section>
      <section className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-blue-950">
        <h3 className="font-bold">{isSpanish ? 'Estrategia' : 'Strategy'}</h3>
        <p className="mt-2">{strategy}</p>
      </section>
      <section>
        <h3 className="font-bold text-gray-900">{isSpanish ? 'Ejemplo resuelto' : 'Worked example'}</h3>
        <p className="mt-2 rounded-xl bg-gray-50 p-3 font-medium">{prompt}</p>
        <ol className="mt-3 list-decimal space-y-3 pl-5">
          {steps.map((step, index) => <li key={index}>{step}</li>)}
        </ol>
        <p className="mt-3 rounded-xl bg-green-50 p-3 font-semibold text-green-900">{answer}</p>
      </section>
    </div>
  )
}

function explanationSourceLabel(source: ElaExplanationSource, isSpanish: boolean) {
  if (source === 'official-nysed') {
    return isSpanish ? 'Justificación oficial de NYSED' : 'Official NYSED rationale'
  }
  if (source === 'official-nysed-corrected') {
    return isSpanish ? 'Justificación oficial de NYSED, corregida por Vine' : 'Official NYSED rationale, corrected by Vine'
  }
  return isSpanish ? 'Explicación de Vine' : 'Vine explanation'
}

function QuestionCard({ id, index, total, number, standard, image, answer, explanation, explanationSource, isSpanish = false, notice, children }: {
  id: string
  index: number
  total: number
  number: number
  standard: string
  image: { src: string; width: number; height: number; alt: string }
  answer: ReactNode
  explanation: string
  explanationSource: ElaExplanationSource
  isSpanish?: boolean
  notice?: string
  children?: ReactNode
}) {
  return (
    <article aria-labelledby={`${id}-heading`} className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 id={`${id}-heading`} className="font-bold text-gray-900">
          {isSpanish ? 'Pregunta' : 'Question'} {index + 1} {isSpanish ? 'de' : 'of'} {total}
        </h3>
        <p className="text-xs text-gray-500">
          {isSpanish ? 'Pregunta publicada' : 'Release question'} {number} · {standard}
        </p>
      </div>
      {notice && (
        <aside aria-label="Corrección de la traducción" className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-bold">Corrección de Vine — antes de responder</p>
          <p className="mt-2 leading-relaxed">{notice}</p>
        </aside>
      )}
      <Image
        src={image.src}
        alt={image.alt}
        width={image.width}
        height={image.height}
        sizes="(max-width: 768px) 100vw, 768px"
        className="h-auto w-full rounded-xl border border-gray-100"
      />
      {children}
      <details className="mt-4 rounded-xl border border-green-200 bg-green-50">
        <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-green-900">
          {isSpanish ? 'Ver respuesta y explicación' : 'Show answer and explanation'}
        </summary>
        <div className="border-t border-green-200 px-4 py-3 text-sm leading-relaxed text-green-950">
          <div className="font-semibold">{answer}</div>
          <p className="mt-3 text-xs font-semibold text-green-800">{explanationSourceLabel(explanationSource, isSpanish)}</p>
          <p className="mt-1 whitespace-pre-line">{explanation}</p>
        </div>
      </details>
    </article>
  )
}

export function ElaPreview({ preview }: { preview: Extract<TutorExamPreview, { subject: 'ela' }> }) {
  const { exam, section, questions } = preview
  return (
    <>
      <section id="lesson" className="mb-8 scroll-mt-4">
        <h2 className="mb-3 text-lg font-bold text-gray-900">Passage and lesson</h2>
        <CollapsiblePassage passage={section.passage} passageLabel={section.passageLabel} />
        <h2 className="mb-3 mt-6 text-lg font-bold text-gray-900">Skills in this passage</h2>
        <div className="space-y-3">
          {section.skillLessons.map(lesson => (
            <details key={lesson.skill} open={lesson.skill === section.focusSkill} className="rounded-2xl border border-gray-200 bg-white shadow-sm">
              <summary className="cursor-pointer p-4 sm:p-5">
                <span className="font-bold text-gray-900">{lesson.emoji} {lesson.title}</span>
                <span className="mt-2 block text-sm leading-relaxed text-gray-600">{lesson.description}</span>
              </summary>
              <div className="border-t border-gray-100 p-4 sm:p-5">
                <LessonContent overview={lesson.overview} goals={lesson.learningGoals} strategy={lesson.strategy}
                  prompt={lesson.workedExample.prompt} steps={lesson.workedExample.steps} answer={lesson.workedExample.takeaway} />
              </div>
            </details>
          ))}
        </div>
      </section>
      <section id="questions" className="mb-6 scroll-mt-4">
        <h2 className="mb-3 text-lg font-bold text-gray-900">Released questions ({questions.length})</h2>
        <div className="space-y-5">
          {questions.map((question, index) => (
            <QuestionCard key={question.id} id={question.id} index={index} total={questions.length}
              number={question.number} standard={question.primaryStandard} image={question.image}
              answer={`Correct answer: ${question.grading.correct}`} explanation={question.grading.explanation}
              explanationSource={question.grading.explanationSource} />
          ))}
        </div>
      </section>
      <ElaAttribution exam={exam} />
    </>
  )
}

export function MathPreview({ preview }: { preview: Extract<TutorExamPreview, { subject: 'math' }> }) {
  const { exam, section, questions, language } = preview
  const isSpanish = language === 'es'
  return (
    <>
      <section id="lesson" className="mb-8 scroll-mt-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="mb-4 text-lg font-bold text-gray-900">{isSpanish ? 'Lección' : 'Lesson'}</h2>
        <LessonContent overview={section.overview[language]} goals={section.learningGoals.map(goal => goal[language])}
          strategy={section.strategy[language]} prompt={section.workedExample.prompt[language]}
          steps={section.workedExample.steps.map(step => step[language])} answer={section.workedExample.answer[language]} isSpanish={isSpanish} />
      </section>
      <section id="questions" className="mb-6 scroll-mt-4">
        <h2 className="mb-3 text-lg font-bold text-gray-900">{isSpanish ? 'Preguntas publicadas' : 'Released questions'} ({questions.length})</h2>
        {questions.length === 0 && (
          <p className="rounded-xl border border-gray-200 bg-white p-4 text-sm leading-relaxed text-gray-600">
            {isSpanish
              ? 'No hay preguntas de opción múltiple publicadas para esta lección en este examen. Puedes usar la lección y el ejemplo resuelto de arriba.'
              : 'This release has no multiple-choice questions for this lesson. You can still use the lesson and worked example above.'}
          </p>
        )}
        <div className="space-y-5">
          {questions.map((question, index) => {
            const image = language === 'es' ? (question.image.es ?? question.image.en) : question.image.en
            const grading = question.grading
            const answer = grading.mode === 'choice'
              ? `${isSpanish ? 'Respuesta correcta' : 'Correct answer'}: ${grading.correct}`
              : grading.mode === 'exact'
                ? `${isSpanish ? 'Respuestas aceptadas' : 'Accepted answers'}: ${grading.acceptedAnswers.join(', ')}`
                : <ul className="list-disc space-y-2 pl-5">{grading.criteria.map((criterion, i) => <li key={i}>{criterion[language]}</li>)}</ul>
            return (
              <QuestionCard key={question.id} id={question.id} index={index} total={questions.length}
                number={question.number} standard={question.primaryStandard} image={{ ...image, alt: question.image.alt[language] }}
                answer={answer} explanation={grading.explanation[language]} explanationSource={grading.explanationSource}
                isSpanish={isSpanish} notice={getMathExamStudentNotice(question.id, language)}>
                <MeasurementGuide questionId={question.id} isSpanish={isSpanish} />
              </QuestionCard>
            )
          })}
        </div>
      </section>
      <MathAttribution exam={exam} isSpanish={isSpanish} />
    </>
  )
}
