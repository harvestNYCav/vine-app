'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  SKILLS, MathProblem, MistakeType, OP_SYM,
  generateProblem, classifyMistake, updateMastery,
  getSkillByTag, getNextSkill, selectNextProblem,
  MASTERY_THRESHOLD, MIN_ATTEMPTS,
} from '@/lib/math'

type Screen = 'home' | 'diag-intro' | 'problem' | 'results' | 'skill-selector' | 'history' | 'leaderboard'
type SessionType = 'diagnostic' | 'practice_5' | 'practice_10' | 'flat_10' | 'flat_25' | 'custom'

interface Attempt {
  isCorrect: boolean
  skill_tag: string
  mistakeType: MistakeType | null
}

export interface MathSessionRecord {
  id: string
  session_type: string
  started_at: number
  ended_at: number
  total_problems: number
  correct: number
  accuracy: number
  current_skill: string
}

export interface InitialProgress {
  skill_mastery: Record<string, number>
  current_skill: string | null
  diagnostic_done: boolean
  total_problems: number
  total_correct: number
  mistake_profile: Record<string, number>
  skill_attempt_counts: Record<string, number>
}

interface Props {
  initialProgress: InitialProgress
  initialHistory: MathSessionRecord[]
  initialSkillFocus?: string | null
}

interface LeaderboardRow {
  user_id: string
  name: string
  correct: number
  accuracy: number
  total_problems: number
  duration_ms?: number
}

interface LeaderboardData {
  type: string
  isTimed: boolean
  currentUserId: string
  rows: LeaderboardRow[]
}

const DIAG_TIER_TOTAL = 3

function isCountMode(type: SessionType | null): boolean {
  return type === 'flat_10' || type === 'flat_25' || type === 'custom'
}

function fmtTime(ms: number): string {
  const s = Math.round(ms / 1000)
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
}

function masteryColor(v: number): string {
  if (v >= 0.75) return 'bg-green-500'
  if (v >= 0.4) return 'bg-yellow-400'
  return 'bg-red-400'
}

const SESSION_LABELS: Record<string, string> = {
  practice_5: '5 min', practice_10: '10 min',
  flat_10: '10 Q', flat_25: '25 Q',
  custom: 'Custom', diagnostic: 'Diagnostic',
}

const LB_TABS: Array<{ key: SessionType; label: string }> = [
  { key: 'practice_5', label: '5 min' },
  { key: 'practice_10', label: '10 min' },
  { key: 'flat_10', label: '10 Q' },
  { key: 'flat_25', label: '25 Q' },
]

export default function MathClient({ initialProgress, initialHistory, initialSkillFocus }: Props) {
  // ── display state ──────────────────────────────────────────────────────
  const [screen, setScreen] = useState<Screen>('home')
  const [currentProblem, setCurrentProblem] = useState<MathProblem | null>(null)
  const [answerState, setAnswerState] = useState<'idle' | 'correct' | 'incorrect'>('idle')
  const [feedbackMsg, setFeedbackMsg] = useState('')
  const [timerWidth, setTimerWidth] = useState(100)
  const [statsDisplay, setStatsDisplay] = useState({ total: 0, correct: 0, rightLabel: '' })
  const [resultData, setResultData] = useState<{
    total: number; correct: number; accuracy: number
    isDiagnostic: boolean; sessionType: SessionType
    currentSkill: string | null; mastery: number
  } | null>(null)
  const [historyList, setHistoryList] = useState<MathSessionRecord[]>(initialHistory)
  const [customQCount, setCustomQCount] = useState(10)
  const [selectedSkills, setSelectedSkills] = useState<string[]>(
    initialSkillFocus ? [initialSkillFocus] : SKILLS.map(s => s.tag)
  )
  const [homeTick, setHomeTick] = useState(0)
  const [lbType, setLbType] = useState<SessionType>('practice_5')
  const [lbData, setLbData] = useState<LeaderboardData | null>(null)
  const [lbLoading, setLbLoading] = useState(false)

  // ── engine state (refs) ───────────────────────────────────────────────
  const masteryRef = useRef<Record<string, number>>(initialProgress.skill_mastery)
  const currentSkillRef = useRef<string | null>(initialProgress.current_skill)
  const diagDoneRef = useRef(initialProgress.diagnostic_done)
  const totalProblemsRef = useRef(initialProgress.total_problems)
  const totalCorrectRef = useRef(initialProgress.total_correct)
  const mistakeProfileRef = useRef<Record<string, number>>(initialProgress.mistake_profile)
  const skillCountsRef = useRef<Record<string, number>>(initialProgress.skill_attempt_counts)

  const sessionTypeRef = useRef<SessionType | null>(null)
  const lastSessionTypeRef = useRef<SessionType | null>(null)
  const sessionProblemsRef = useRef<Attempt[]>([])
  const sessionStartRef = useRef(0)
  const sessionDurationRef = useRef(0)
  const questionTargetRef = useRef(0)
  const mistakeQueueRef = useRef<Array<{ skill_tag: string }>>([])
  const recentOperandsRef = useRef<string[]>([])
  const pinnedTagsRef = useRef<string[] | null>(null)
  const customQCountRef = useRef(10)

  const diagSkillIndexRef = useRef(0)
  const diagTierRef = useRef<boolean[]>([])
  const diagTierCorrectRef = useRef(0)

  const awaitingNextRef = useRef(false)
  const currentProblemRef = useRef<MathProblem | null>(null)

  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const endSessionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const answerInputRef = useRef<HTMLInputElement>(null)

  // Auto-start focused session if arriving from a skill lesson page
  const didAutoStart = useRef(false)
  useEffect(() => {
    if (initialSkillFocus && diagDoneRef.current && !didAutoStart.current) {
      didAutoStart.current = true
      pinnedTagsRef.current = [initialSkillFocus]
      setSelectedSkills([initialSkillFocus])
      startPractice('custom')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── helpers ────────────────────────────────────────────────────────────
  function clearTimers() {
    if (timerIntervalRef.current) { clearInterval(timerIntervalRef.current); timerIntervalRef.current = null }
    if (feedbackTimeoutRef.current) { clearTimeout(feedbackTimeoutRef.current); feedbackTimeoutRef.current = null }
    if (endSessionTimeoutRef.current) { clearTimeout(endSessionTimeoutRef.current); endSessionTimeoutRef.current = null }
  }

  function updateStatsDisplay(problems: Attempt[], type: SessionType | null) {
    const total = problems.length
    const correct = problems.filter(p => p.isCorrect).length
    let rightLabel = ''
    if (type === 'diagnostic') {
      rightLabel = `Tier ${diagSkillIndexRef.current + 1}`
    } else if (isCountMode(type)) {
      rightLabel = `${total} / ${questionTargetRef.current}`
    } else {
      const rem = Math.max(0, Math.round((sessionDurationRef.current - (Date.now() - sessionStartRef.current)) / 1000))
      rightLabel = `${Math.floor(rem / 60)}:${(rem % 60).toString().padStart(2, '0')} left`
    }
    setStatsDisplay({ total, correct, rightLabel })
  }

  async function persistProgress() {
    await fetch('/api/math/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        skill_mastery: masteryRef.current,
        current_skill: currentSkillRef.current,
        diagnostic_done: diagDoneRef.current,
        total_problems: totalProblemsRef.current,
        total_correct: totalCorrectRef.current,
        mistake_profile: mistakeProfileRef.current,
        skill_attempt_counts: skillCountsRef.current,
      }),
    }).catch(err => console.warn('Failed to save math progress:', err))
  }

  async function persistSession(record: MathSessionRecord) {
    await fetch('/api/math/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    }).catch(err => console.warn('Failed to save math session:', err))
  }

  async function loadLeaderboard(type: SessionType) {
    setLbLoading(true)
    setLbData(null)
    try {
      const res = await fetch(`/api/math/leaderboard?type=${type}`)
      if (res.ok) setLbData(await res.json())
    } finally {
      setLbLoading(false)
    }
  }

  // ── session end ────────────────────────────────────────────────────────
  function endSession() {
    clearTimers()
    const problems = sessionProblemsRef.current
    const total = problems.length
    const correct = problems.filter(p => p.isCorrect).length
    const accuracy = total ? Math.round(correct / total * 100) : 0
    const type = sessionTypeRef.current!
    const currentSkill = currentSkillRef.current
    const mastery = currentSkill ? (masteryRef.current[currentSkill] ?? 0) : 0

    const record: MathSessionRecord = {
      id: sessionStartRef.current.toString(),
      session_type: type,
      started_at: sessionStartRef.current,
      ended_at: Date.now(),
      total_problems: total,
      correct,
      accuracy,
      current_skill: currentSkill || '',
    }

    setHistoryList(prev => [record, ...prev])
    setResultData({ total, correct, accuracy, isDiagnostic: type === 'diagnostic', sessionType: type, currentSkill, mastery })
    setScreen('results')

    persistSession(record)
    persistProgress()
  }

  // ── problem loading ────────────────────────────────────────────────────
  function loadNextProblem() {
    awaitingNextRef.current = false
    setAnswerState('idle')
    setFeedbackMsg('')
    if (answerInputRef.current) answerInputRef.current.value = ''

    const type = sessionTypeRef.current
    let problem: MathProblem
    if (type === 'diagnostic') {
      problem = generateProblem(SKILLS[diagSkillIndexRef.current], recentOperandsRef.current)
    } else {
      problem = selectNextProblem(
        currentSkillRef.current || SKILLS[0].tag,
        masteryRef.current,
        mistakeQueueRef.current,
        recentOperandsRef.current,
        pinnedTagsRef.current,
      )
    }

    recentOperandsRef.current = [
      ...recentOperandsRef.current.slice(-19),
      `${problem.operands[0]},${problem.operands[1]}`,
    ]
    currentProblemRef.current = problem
    setCurrentProblem(problem)
    updateStatsDisplay(sessionProblemsRef.current, type)

    if (isCountMode(type)) {
      setTimerWidth((sessionProblemsRef.current.length / questionTargetRef.current) * 100)
    }

    setTimeout(() => answerInputRef.current?.focus(), 30)
  }

  function startTimer() {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
    const type = sessionTypeRef.current
    if (type === 'diagnostic' || isCountMode(type)) return

    timerIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - sessionStartRef.current
      setTimerWidth(Math.max(0, (1 - elapsed / sessionDurationRef.current) * 100))
      if (elapsed >= sessionDurationRef.current) {
        clearInterval(timerIntervalRef.current!)
        timerIntervalRef.current = null
        if (!awaitingNextRef.current) {
          endSession()
        } else {
          endSessionTimeoutRef.current = setTimeout(endSession, 1200)
        }
      }
    }, 100)
  }

  function advanceToNextProblem() {
    loadNextProblem()
    startTimer()
  }

  // ── submit answer ──────────────────────────────────────────────────────
  function submitAnswer() {
    if (awaitingNextRef.current || !currentProblemRef.current) return
    const raw = answerInputRef.current?.value.trim() || ''
    if (!raw) return
    const userAnswer = parseInt(raw, 10)
    if (isNaN(userAnswer)) return

    awaitingNextRef.current = true
    const problem = currentProblemRef.current
    const isCorrect = userAnswer === problem.answer
    const mistakeType = isCorrect ? null : classifyMistake(problem, userAnswer)

    sessionProblemsRef.current = [...sessionProblemsRef.current, { isCorrect, skill_tag: problem.skill_tag, mistakeType }]
    totalProblemsRef.current++
    if (isCorrect) totalCorrectRef.current++

    masteryRef.current = updateMastery(masteryRef.current, problem.skill_tag, isCorrect)
    skillCountsRef.current = {
      ...skillCountsRef.current,
      [problem.skill_tag]: (skillCountsRef.current[problem.skill_tag] || 0) + 1,
    }

    if (!isCorrect && mistakeType) {
      mistakeProfileRef.current = {
        ...mistakeProfileRef.current,
        [mistakeType]: (mistakeProfileRef.current[mistakeType] || 0) + 1,
      }
      const q = [...mistakeQueueRef.current, { skill_tag: problem.skill_tag }]
      mistakeQueueRef.current = q.length > 10 ? q.slice(-10) : q
    }

    setAnswerState(isCorrect ? 'correct' : 'incorrect')
    setFeedbackMsg(isCorrect ? '✓ Correct!' : `✗ Answer: ${problem.answer}`)
    updateStatsDisplay(sessionProblemsRef.current, sessionTypeRef.current)

    const type = sessionTypeRef.current

    if (type === 'diagnostic') {
      const tier = [...diagTierRef.current, isCorrect]
      diagTierRef.current = tier
      if (isCorrect) diagTierCorrectRef.current++

      if (tier.length >= DIAG_TIER_TOTAL) {
        feedbackTimeoutRef.current = setTimeout(() => {
          if (diagTierCorrectRef.current / tier.length >= 0.8) {
            masteryRef.current = {
              ...masteryRef.current,
              [SKILLS[diagSkillIndexRef.current].tag]: Math.min(1, diagTierCorrectRef.current / tier.length),
            }
            diagSkillIndexRef.current++
            if (diagSkillIndexRef.current >= SKILLS.length) {
              finishDiagnostic(SKILLS.length - 1)
            } else {
              diagTierRef.current = []
              diagTierCorrectRef.current = 0
              advanceToNextProblem()
            }
          } else {
            finishDiagnostic(Math.max(0, diagSkillIndexRef.current - 1))
          }
        }, 1000)
      } else {
        feedbackTimeoutRef.current = setTimeout(advanceToNextProblem, 900)
      }
    } else if (isCountMode(type)) {
      if (sessionProblemsRef.current.length >= questionTargetRef.current) {
        feedbackTimeoutRef.current = setTimeout(endSession, 1000)
      } else {
        feedbackTimeoutRef.current = setTimeout(advanceToNextProblem, 900)
      }
    } else {
      if (Date.now() - sessionStartRef.current >= sessionDurationRef.current) {
        feedbackTimeoutRef.current = setTimeout(endSession, 1000)
      } else {
        feedbackTimeoutRef.current = setTimeout(advanceToNextProblem, 900)
      }
    }
  }

  function finishDiagnostic(idx: number) {
    const skill = SKILLS[Math.max(0, idx)]
    currentSkillRef.current = skill.tag
    if (!masteryRef.current[skill.tag]) {
      masteryRef.current = { ...masteryRef.current, [skill.tag]: 0.3 }
    }
    diagDoneRef.current = true
    endSession()
  }

  // ── session starters ──────────────────────────────────────────────────
  function startDiagnostic() {
    clearTimers()
    sessionTypeRef.current = 'diagnostic'
    lastSessionTypeRef.current = 'diagnostic'
    diagSkillIndexRef.current = 0
    diagTierRef.current = []
    diagTierCorrectRef.current = 0
    sessionProblemsRef.current = []
    sessionStartRef.current = Date.now()
    sessionDurationRef.current = 15 * 60 * 1000
    questionTargetRef.current = 0
    mistakeQueueRef.current = []
    recentOperandsRef.current = []
    pinnedTagsRef.current = null
    setTimerWidth(0)
    setScreen('problem')
    advanceToNextProblem()
  }

  function startPractice(type: SessionType) {
    clearTimers()
    sessionTypeRef.current = type
    lastSessionTypeRef.current = type
    sessionProblemsRef.current = []
    sessionStartRef.current = Date.now()
    sessionDurationRef.current =
      type === 'practice_5' ? 5 * 60 * 1000 :
      type === 'practice_10' ? 10 * 60 * 1000 : 0
    questionTargetRef.current =
      type === 'flat_10' ? 10 :
      type === 'flat_25' ? 25 :
      type === 'custom' ? customQCountRef.current : 0
    mistakeQueueRef.current = []
    recentOperandsRef.current = []
    if (type !== 'custom') pinnedTagsRef.current = null

    const tag = currentSkillRef.current
    if (tag) {
      const count = skillCountsRef.current[tag] || 0
      if ((masteryRef.current[tag] ?? 0) >= MASTERY_THRESHOLD && count >= MIN_ATTEMPTS) {
        const next = getNextSkill(tag)
        if (next) {
          currentSkillRef.current = next.tag
          if (!masteryRef.current[next.tag]) {
            masteryRef.current = { ...masteryRef.current, [next.tag]: 0.1 }
          }
        }
      }
    }

    setTimerWidth(type === 'diagnostic' || isCountMode(type) ? 0 : 100)
    setScreen('problem')
    advanceToNextProblem()
  }

  function startCustomSession() {
    if (selectedSkills.length === 0) return
    pinnedTagsRef.current = selectedSkills
    startPractice('custom')
  }

  function goHome() {
    clearTimers()
    setHomeTick(t => t + 1)
    setScreen('home')
  }

  // ── keyboard ──────────────────────────────────────────────────────────
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Enter') submitAnswer()
    }
    if (screen === 'problem') {
      window.addEventListener('keydown', handleKey)
      return () => window.removeEventListener('keydown', handleKey)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen])

  // ── screens ──────────────────────────────────────────────────────────

  if (screen === 'diag-intro') return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h2 className="text-xl font-bold text-green-800">Diagnostic Assessment</h2>
      <p className="text-gray-400 text-sm mt-1">~2 minutes · Finds your starting point</p>
      <p className="text-gray-600 text-sm mt-4">
        You'll work through problems at increasing difficulty. We stop when you miss more than 20% in a tier.
      </p>
      <ul className="mt-4 space-y-1">
        {['1-digit addition & subtraction', '2-digit (no carry/borrow)', '2-digit (with carry/borrow)', '3-digit problems'].map(t => (
          <li key={t} className="text-sm text-gray-500 flex items-center gap-2">
            <span className="text-green-600 font-bold">→</span> {t}
          </li>
        ))}
      </ul>
      <div className="flex gap-3 mt-8">
        <button onClick={goHome} className="flex-1 bg-gray-100 text-gray-700 font-medium py-3 rounded-2xl">Back</button>
        <button onClick={startDiagnostic} className="flex-1 bg-green-700 text-white font-semibold py-3 rounded-2xl">Begin</button>
      </div>
    </div>
  )

  if (screen === 'problem' && currentProblem) {
    const [a, b] = currentProblem.operands
    const skillLabel = getSkillByTag(currentProblem.skill_tag)?.label ?? currentProblem.skill_tag
    const skillMastery = masteryRef.current[currentProblem.skill_tag]
    const type = sessionTypeRef.current
    const showTimer = type !== 'diagnostic'
    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        {showTimer && (
          <div className="w-full bg-gray-200 rounded-full h-2 mb-5">
            <div className="h-2 rounded-full transition-all bg-green-500" style={{ width: `${timerWidth}%` }} />
          </div>
        )}
        <div className="flex flex-wrap gap-2 mb-5">
          <span className="bg-gray-100 text-gray-500 text-xs font-semibold px-3 py-1 rounded-full">{skillLabel}</span>
          {skillMastery !== undefined && (
            <span className="bg-green-50 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">
              {Math.round(skillMastery * 100)}%
            </span>
          )}
          {type === 'diagnostic' && (
            <span className="bg-gray-100 text-gray-500 text-xs font-semibold px-3 py-1 rounded-full ml-auto">
              Diagnostic {diagSkillIndexRef.current + 1}/{SKILLS.length}
            </span>
          )}
        </div>
        <div className="text-center py-6 mb-5">
          <p className="text-5xl font-bold text-gray-800 leading-tight">{a}</p>
          <p className="text-5xl font-bold text-gray-800 leading-tight">
            <span className="text-gray-400 font-normal">{OP_SYM[currentProblem.operation]}</span> {b}
          </p>
        </div>
        <div className="flex gap-3 mb-4">
          <input
            ref={answerInputRef}
            type="number"
            inputMode="numeric"
            placeholder="?"
            autoComplete="off"
            className={`flex-1 text-center text-2xl font-bold py-3 px-4 border-2 rounded-2xl outline-none transition-colors ${
              answerState === 'correct' ? 'border-green-500 bg-green-50 text-green-800' :
              answerState === 'incorrect' ? 'border-red-400 bg-red-50 text-red-700' :
              'border-gray-200 bg-gray-50 focus:border-green-500 focus:bg-white'
            }`}
          />
          <button
            onClick={submitAnswer}
            className="bg-green-700 text-white text-xl font-bold px-5 rounded-2xl active:scale-95 transition-transform"
          >
            →
          </button>
        </div>
        <div className={`min-h-7 text-center text-sm font-semibold mb-3 ${
          answerState === 'correct' ? 'text-green-700' :
          answerState === 'incorrect' ? 'text-red-600' : ''
        }`}>
          {feedbackMsg}
        </div>
        <div className="flex justify-between text-xs text-gray-400">
          <span>{statsDisplay.total > 0 ? `${statsDisplay.correct}/${statsDisplay.total} correct` : 'Answer to begin'}</span>
          <span>{statsDisplay.rightLabel}</span>
        </div>
      </div>
    )
  }

  if (screen === 'results' && resultData) {
    const { total, correct, accuracy, isDiagnostic, sessionType, currentSkill: sk, mastery: m } = resultData
    const skillObj = sk ? getSkillByTag(sk) : null
    const lastType = lastSessionTypeRef.current
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-green-800">
          {isDiagnostic ? 'Diagnostic Complete!' : 'Session Complete'}
        </h2>
        <div className="grid grid-cols-3 gap-3 mt-5">
          {[{ val: total, lbl: 'Problems' }, { val: `${accuracy}%`, lbl: 'Accuracy' }, { val: correct, lbl: 'Correct' }].map(({ val, lbl }) => (
            <div key={lbl} className="bg-gray-50 rounded-2xl p-3 text-center">
              <p className="text-2xl font-bold text-green-700">{val}</p>
              <p className="text-xs text-gray-500 mt-0.5">{lbl}</p>
            </div>
          ))}
        </div>
        {skillObj && (
          <div className="bg-green-50 rounded-2xl p-4 mt-5 border border-green-100">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-green-800">{skillObj.label}</span>
              <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full">
                {Math.round(m * 100)}% mastery
              </span>
            </div>
            <div className="w-full bg-green-200 rounded-full h-2 mt-3">
              <div className="bg-green-600 h-2 rounded-full transition-all" style={{ width: `${m * 100}%` }} />
            </div>
            {isDiagnostic && (
              <p className="text-xs text-green-700 mt-2">Placement complete — start practicing when ready.</p>
            )}
          </div>
        )}
        <div className="flex gap-3 mt-6">
          <button onClick={goHome} className="flex-1 bg-gray-100 text-gray-700 font-medium py-3 rounded-2xl">Home</button>
          <button
            onClick={() => {
              if (isDiagnostic) startPractice('practice_5')
              else if (sessionType === 'custom') startPractice('custom')
              else startPractice(lastType || 'practice_5')
            }}
            className="flex-1 bg-green-700 text-white font-semibold py-3 rounded-2xl active:scale-95 transition-transform"
          >
            {isDiagnostic ? 'Start Practice' : sessionType === 'custom' ? 'Same Skills Again' : 'Again'}
          </button>
        </div>
      </div>
    )
  }

  if (screen === 'skill-selector') return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-lg font-bold text-green-800">Review Skills</h2>
        <button onClick={goHome} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
      </div>
      <div className="divide-y divide-gray-100">
        {SKILLS.map(s => (
          <label key={s.tag} className="flex items-center gap-3 py-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedSkills.includes(s.tag)}
              onChange={e => {
                if (e.target.checked) setSelectedSkills(prev => [...prev, s.tag])
                else setSelectedSkills(prev => prev.filter(t => t !== s.tag))
              }}
              className="w-4 h-4 accent-green-700"
            />
            <span className="text-sm text-gray-700">{s.label}</span>
          </label>
        ))}
      </div>
      <div className="mt-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Questions</p>
        <div className="flex gap-2">
          {[10, 25].map(n => (
            <button
              key={n}
              onClick={() => { setCustomQCount(n); customQCountRef.current = n }}
              className={`flex-1 py-2.5 rounded-2xl font-semibold text-sm ${
                customQCount === n ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      <button
        onClick={startCustomSession}
        disabled={selectedSkills.length === 0}
        className="w-full bg-green-700 text-white font-semibold py-4 rounded-2xl mt-5 disabled:opacity-40 active:scale-95 transition-transform"
      >
        Start Practice
      </button>
    </div>
  )

  if (screen === 'history') return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-lg font-bold text-green-800">Session History</h2>
        <button onClick={goHome} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
      </div>
      {historyList.length === 0 ? (
        <p className="text-sm text-gray-400">No sessions yet.</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {historyList.slice(0, 30).map(s => {
            const d = new Date(s.started_at)
            const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
            const duration = s.ended_at && s.started_at ? s.ended_at - s.started_at : 0
            return (
              <div key={s.id} className="flex justify-between items-center py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-700">{SESSION_LABELS[s.session_type] || s.session_type}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.total_problems} problems · {fmtTime(duration)} · {dateStr}</p>
                </div>
                <div className="text-right">
                  <p className="text-base font-bold text-green-700">{s.accuracy}%</p>
                  <p className="text-xs text-gray-400">{s.correct}/{s.total_problems}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  if (screen === 'leaderboard') return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-green-800">Leaderboard</h2>
        <button onClick={goHome} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 mb-4">
        {LB_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => {
              setLbType(t.key)
              loadLeaderboard(t.key)
            }}
            className={`px-3 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              lbType === t.key ? 'border-green-600 text-green-700' : 'border-transparent text-gray-400'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {lbLoading && <p className="text-sm text-gray-400">Loading...</p>}
      {lbData && !lbLoading && (
        lbData.rows.length === 0 ? (
          <p className="text-sm text-gray-400">No sessions yet for this mode. Be the first!</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="pb-2 text-xs text-gray-400 font-semibold w-8">#</th>
                  <th className="pb-2 text-xs text-gray-400 font-semibold">Player</th>
                  <th className="pb-2 text-xs text-gray-400 font-semibold text-right">
                    {lbData.isTimed ? 'Score' : 'Time'}
                  </th>
                  <th className="pb-2 text-xs text-gray-400 font-semibold text-right">Acc.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {lbData.rows.map((row, i) => {
                  const isMe = row.user_id === lbData.currentUserId
                  return (
                    <tr key={i} className={isMe ? 'bg-green-50' : ''}>
                      <td className="py-2 text-gray-400 font-bold">{i + 1}</td>
                      <td className="py-2 text-gray-700">
                        {row.name}
                        {isMe && <span className="ml-1.5 bg-green-100 text-green-700 text-xs font-semibold px-1.5 py-0.5 rounded-full">you</span>}
                      </td>
                      <td className="py-2 text-right font-semibold text-gray-700">
                        {lbData.isTimed ? row.correct : fmtTime(row.duration_ms ?? 0)}
                      </td>
                      <td className="py-2 text-right text-gray-500">{row.accuracy}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  )

  // ── HOME ─────────────────────────────────────────────────────────────
  void homeTick

  const skill = currentSkillRef.current ? getSkillByTag(currentSkillRef.current) : null
  const mastery = currentSkillRef.current ? (masteryRef.current[currentSkillRef.current] ?? 0) : 0

  return (
    <div>
      {!diagDoneRef.current ? (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-600 mb-4">
            Start with a quick diagnostic (~2 min) to find your current level.
          </p>
          <button
            onClick={() => setScreen('diag-intro')}
            className="w-full bg-green-700 text-white font-semibold py-4 rounded-2xl active:scale-95 transition-transform"
          >
            Start Diagnostic
          </button>
          <p className="text-center text-xs text-gray-400 mt-2">Sets your starting level</p>
        </div>
      ) : (
        <>
          {/* Current skill */}
          {skill && (
            <div className="bg-green-50 rounded-2xl p-4 border border-green-100 mb-5">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-green-800">{skill.label}</span>
                <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full">
                  {Math.round(mastery * 100)}%
                </span>
              </div>
              <div className="w-full bg-green-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full transition-all" style={{ width: `${mastery * 100}%` }} />
              </div>
            </div>
          )}

          {/* Timed */}
          <div className="mb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Timed</p>
            <div className="flex gap-2">
              {(['practice_5', 'practice_10'] as SessionType[]).map(t => (
                <button key={t} onClick={() => startPractice(t)} className="flex-1 bg-green-700 text-white font-semibold py-3.5 rounded-2xl active:scale-95 transition-transform">
                  {SESSION_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Question count */}
          <div className="mb-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Questions</p>
            <div className="flex gap-2">
              {(['flat_10', 'flat_25'] as SessionType[]).map(t => (
                <button key={t} onClick={() => startPractice(t)} className="flex-1 bg-green-700 text-white font-semibold py-3.5 rounded-2xl active:scale-95 transition-transform">
                  {SESSION_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          <button onClick={() => setScreen('skill-selector')} className="w-full bg-gray-100 text-gray-700 font-medium py-3 rounded-2xl mb-3">
            Review specific skills →
          </button>

          <div className="flex gap-2 mb-3">
            <Link href="/progress?mode=math" className="flex-1">
              <span className="block text-center bg-gray-100 text-gray-700 text-sm font-medium py-2.5 rounded-2xl">Progress</span>
            </Link>
            <button onClick={() => setScreen('history')} className="flex-1 bg-gray-100 text-gray-700 text-sm font-medium py-2.5 rounded-2xl">
              History
            </button>
            <button
              onClick={() => {
                setScreen('leaderboard')
                loadLeaderboard(lbType)
              }}
              className="flex-1 bg-gray-100 text-gray-700 text-sm font-medium py-2.5 rounded-2xl"
            >
              Rankings
            </button>
          </div>
          <button
            onClick={() => setScreen('diag-intro')}
            className="w-full text-center text-xs text-gray-400 hover:text-gray-600 py-1 mb-4"
          >
            Retake diagnostic →
          </button>

          {/* Skill overview */}
          {(() => {
            const topSkills = SKILLS.filter(s => (masteryRef.current[s.tag] ?? 0) > 0).slice(-4)
            if (!topSkills.length) return null
            return (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Skills Overview</p>
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
                  {topSkills.map(s => {
                    const pct = Math.round((masteryRef.current[s.tag] ?? 0) * 100)
                    return (
                      <div key={s.tag}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-gray-700">{s.label}</span>
                          <span className="text-sm font-bold text-green-700">{pct}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full ${masteryColor(masteryRef.current[s.tag] ?? 0)}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}
        </>
      )}
    </div>
  )
}
