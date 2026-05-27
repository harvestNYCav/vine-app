'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Module, ChatMessage } from '@/types'

interface Props {
  mod: Module
}

interface SessionSummary {
  phrases: string[]
  encouragement: string
}

export default function TeachingChat({ mod }: Props) {
  const router = useRouter()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [started, setStarted] = useState(false)
  const [ended, setEnded] = useState(false)
  const [summary, setSummary] = useState<SessionSummary | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [sessionId] = useState(() => Math.random().toString(36).slice(2) + Date.now().toString(36))
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const startSession = async () => {
    setStarted(true)
    const initialMessage: ChatMessage = {
      role: 'user',
      content: `Hello! I am here to teach you about "${mod.titleEn}". Are you ready to learn?`,
    }
    await sendMessage([initialMessage])
  }

  const sendMessage = async (messageHistory: ChatMessage[]) => {
    setStreaming(true)
    const newMessages = messageHistory.length > messages.length ? messageHistory : [...messages, messageHistory[messageHistory.length - 1]]

    if (messageHistory.length > messages.length) {
      setMessages(messageHistory)
    }

    try {
      const res = await fetch('/api/teach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          moduleSlug: mod.slug,
          sessionId,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to get response')
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let assistantText = ''

      // Add empty assistant message
      setMessages(prev => [...prev, { role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        assistantText += decoder.decode(value, { stream: true })
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: assistantText }
          return updated
        })
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "Lo siento, I have a connection problem. Can you try again?" }])
    } finally {
      setStreaming(false)
    }
  }

  const handleSend = async () => {
    if (!input.trim() || streaming) return
    const userMessage: ChatMessage = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    await sendMessage(newMessages)
  }

  const handleEnd = async () => {
    setLoadingSummary(true)
    try {
      const res = await fetch('/api/teach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          moduleSlug: mod.slug,
          sessionId,
          action: 'summarize',
        }),
      })
      const data = await res.json()
      setSummary(data)
      setEnded(true)
    } catch {
      setSummary({ phrases: ['Great teaching session!'], encouragement: 'You did a wonderful job today!' })
      setEnded(true)
    } finally {
      setLoadingSummary(false)
    }
  }

  // End screen
  if (ended && summary) {
    return (
      <div className="min-h-screen bg-amber-50 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-green-800 mb-1">Amazing Teacher!</h2>
          <p className="text-gray-500 mb-6">¡Qué buen maestro/maestra!</p>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-5 text-left">
            <p className="font-bold text-gray-700 mb-3">Phrases you taught today / Frases que enseñaste:</p>
            <ul className="space-y-2">
              {summary.phrases.map((phrase, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-green-500 font-bold mt-0.5">✓</span>
                  <span className="text-gray-700">{phrase}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6">
            <p className="text-green-700 text-sm font-medium">{summary.encouragement}</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => {
                setMessages([])
                setStarted(false)
                setEnded(false)
                setSummary(null)
              }}
              className="w-full bg-purple-600 text-white text-lg font-semibold py-4 rounded-2xl shadow hover:bg-purple-700 active:scale-95 transition-transform"
            >
              Teach again! / ¡Enseña de nuevo!
            </button>
            <button
              onClick={() => router.push(`/modules/${mod.slug}`)}
              className="w-full bg-gray-100 text-gray-700 font-medium py-3 rounded-2xl"
            >
              ← Back to lesson
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Start screen
  if (!started) {
    return (
      <div className="min-h-screen bg-amber-50 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm text-center">
          <div className="text-6xl mb-4">🎓</div>
          <h2 className="text-2xl font-bold text-green-800 mb-2">You are the Teacher!</h2>
          <p className="text-gray-500 mb-6">¡Tú eres el maestro!</p>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6 text-left">
            <p className="font-bold text-gray-700 mb-2">Meet Carlos 👋</p>
            <p className="text-gray-600 text-sm leading-relaxed">
              Carlos is a Spanish speaker who just moved to New York. He wants to learn English and YOU are going to help him!
            </p>
            <p className="text-gray-500 text-sm mt-2 italic">
              Carlos es hispanohablante y quiere aprender inglés. ¡Tú vas a enseñarle sobre {mod.titleEs}!
            </p>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 mb-6">
            <p className="text-purple-700 text-sm font-medium">Today&apos;s topic / Tema de hoy:</p>
            <p className="text-purple-800 font-bold">{mod.titleEn} — {mod.titleEs}</p>
            <p className="text-purple-600 text-xs mt-1">{mod.teachingScenario}</p>
          </div>

          <button
            onClick={startSession}
            disabled={streaming}
            className="w-full bg-purple-600 text-white text-xl font-semibold py-5 rounded-2xl shadow-md hover:bg-purple-700 active:scale-95 transition-transform"
          >
            Start Teaching! 🚀
            <span className="block text-sm font-normal opacity-80 mt-0.5">¡Empezar a enseñar!</span>
          </button>

          <button onClick={() => router.back()} className="mt-4 text-gray-400 text-sm">
            ← Go back
          </button>
        </div>
      </div>
    )
  }

  // Chat interface
  return (
    <div className="flex flex-col" style={{ height: '100dvh' }}>
      {/* Header */}
      <div className="bg-purple-700 text-white px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <button onClick={() => router.back()} className="text-purple-200 text-xl">←</button>
        <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-xl">👨</div>
        <div className="flex-1">
          <p className="font-bold">Carlos</p>
          <p className="text-purple-200 text-xs">Learning: {mod.titleEn}</p>
        </div>
        <button
          onClick={handleEnd}
          disabled={loadingSummary || messages.length < 4}
          className={`text-sm px-3 py-1.5 rounded-full font-medium transition-colors ${
            messages.length >= 4
              ? 'bg-purple-500 hover:bg-purple-400 text-white'
              : 'bg-purple-800 text-purple-400'
          }`}
        >
          {loadingSummary ? '...' : 'End'}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 bg-purple-200 rounded-full flex items-center justify-center text-sm mr-2 mt-1 flex-shrink-0">👨</div>
            )}
            <div className={`max-w-xs rounded-2xl px-4 py-3 ${
              msg.role === 'user'
                ? 'bg-green-700 text-white rounded-br-sm'
                : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-sm'
            }`}>
              <p className="text-sm leading-relaxed">{msg.content}</p>
            </div>
          </div>
        ))}
        {streaming && messages.length > 0 && messages[messages.length - 1].role === 'assistant' && messages[messages.length - 1].content === '' && (
          <div className="flex justify-start">
            <div className="w-8 h-8 bg-purple-200 rounded-full flex items-center justify-center text-sm mr-2 flex-shrink-0">👨</div>
            <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 px-4 py-3 flex gap-3 items-center flex-shrink-0">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="Teach Carlos in English..."
          disabled={streaming}
          className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-400 bg-gray-50 disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={streaming || !input.trim()}
          className="w-12 h-12 bg-purple-600 text-white rounded-xl flex items-center justify-center font-bold text-lg disabled:opacity-40 active:scale-95 transition-transform"
        >
          →
        </button>
      </div>
    </div>
  )
}
