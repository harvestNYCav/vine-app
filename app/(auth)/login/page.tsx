'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const role = (searchParams.get('role') || 'student') as 'student' | 'tutor' | 'admin'

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [emailCode, setEmailCode] = useState('')
  const [devCode, setDevCode] = useState('')
  const [pin, setPin] = useState('')
  const [step, setStep] = useState<'name' | 'email' | 'code' | 'pin'>('name')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleNameSubmit = () => {
    if (name.trim().length < 2) {
      setError('Please enter your name / Por favor ingresa tu nombre')
      return
    }
    setError('')
    setStep(role === 'admin' ? 'email' : 'pin')
  }

  const requestAdminCode = async () => {
    if (!email.includes('@')) {
      setError('Please enter a valid email')
      return
    }
    setLoading(true)
    setError('')
    setDevCode('')
    try {
      const res = await fetch('/vine-app/api/auth/admin-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Could not send verification code')
        setLoading(false)
        return
      }
      setDevCode(data.devCode || '')
      setStep('code')
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCodeSubmit = () => {
    if (!/^\d{6}$/.test(emailCode)) {
      setError('Enter the 6-digit verification code')
      return
    }
    setError('')
    setStep('pin')
  }

  const handlePinDigit = (digit: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + digit)
    }
  }

  const handlePinDelete = () => {
    setPin(prev => prev.slice(0, -1))
  }

  useEffect(() => {
    if (pin.length === 4) {
      handleLogin()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin])

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/vine-app/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), pin, role, email: email.trim(), emailCode }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong')
        setPin('')
        setLoading(false)
        return
      }
      if (data.needsTrackSelection) {
        router.push('/tracks')
      } else if (role === 'tutor') {
        router.push('/tutor')
      } else if (role === 'admin') {
        router.push('/admin')
      } else {
        router.push('/home')
      }
    } catch {
      setError('Connection error. Please try again.')
      setPin('')
      setLoading(false)
    }
  }

  const PAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-amber-50">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-700 rounded-full flex items-center justify-center mx-auto mb-3 shadow">
            <span className="text-3xl">🌿</span>
          </div>
          <h1 className="text-2xl font-bold text-green-800">Vine</h1>
          <p className="text-sm text-gray-500 mt-1">
            {role === 'tutor' ? 'Tutor Login' : role === 'admin' ? 'Admin Login' : 'Student Login / Acceso estudiante'}
          </p>
        </div>

        {step === 'name' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your name / Tu nombre
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleNameSubmit()}
                placeholder="e.g. Maria"
                className="w-full border-2 border-green-200 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-green-500 bg-white"
                autoFocus
              />
            </div>
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <button
              onClick={handleNameSubmit}
              className="w-full bg-green-700 text-white text-lg font-semibold py-4 rounded-xl shadow hover:bg-green-800 active:scale-95 transition-transform"
            >
              Continue / Continuar
            </button>
            <button
              onClick={() => router.back()}
              className="w-full text-gray-500 text-sm py-2"
            >
              ← Go back / Regresar
            </button>
          </div>
        )}

        {step === 'email' && (
          <div className="space-y-4">
            <p className="text-center text-gray-700 font-medium">
              Hello, {name}
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Admin email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && requestAdminCode()}
                placeholder="you@example.com"
                className="w-full border-2 border-green-200 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-green-500 bg-white"
                autoFocus
              />
            </div>
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <button
              onClick={requestAdminCode}
              disabled={loading}
              className="w-full bg-green-700 text-white text-lg font-semibold py-4 rounded-xl shadow hover:bg-green-800 active:scale-95 transition-transform disabled:opacity-60"
            >
              {loading ? 'Sending...' : 'Send verification code'}
            </button>
            <button
              onClick={() => { setStep('name'); setEmail(''); setError('') }}
              className="w-full text-gray-500 text-sm py-2"
            >
              ← Change name
            </button>
          </div>
        )}

        {step === 'code' && (
          <div className="space-y-4">
            <p className="text-center text-gray-700 font-medium">
              Check {email}
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Verification code
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={emailCode}
                onChange={e => setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={e => e.key === 'Enter' && handleCodeSubmit()}
                placeholder="123456"
                className="w-full border-2 border-green-200 rounded-xl px-4 py-3 text-lg text-center tracking-widest focus:outline-none focus:border-green-500 bg-white"
                autoFocus
              />
            </div>
            {devCode && (
              <p className="text-center text-xs text-amber-700 bg-amber-100 rounded-xl px-3 py-2">
                Dev code: {devCode}
              </p>
            )}
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <button
              onClick={handleCodeSubmit}
              className="w-full bg-green-700 text-white text-lg font-semibold py-4 rounded-xl shadow hover:bg-green-800 active:scale-95 transition-transform"
            >
              Continue
            </button>
            <button
              onClick={requestAdminCode}
              disabled={loading}
              className="w-full text-gray-500 text-sm py-2 disabled:opacity-60"
            >
              {loading ? 'Sending...' : 'Send a new code'}
            </button>
          </div>
        )}

        {step === 'pin' && (
          <div className="space-y-4">
            <p className="text-center text-gray-700 font-medium">
              Hello, {name}! 👋
            </p>
            <p className="text-center text-gray-500 text-sm">
              Enter your 4-digit PIN / Ingresa tu PIN de 4 dígitos
            </p>
            <p className="text-center text-xs text-gray-400">
              {role === 'admin'
                ? `Email verified: ${email}`
                : `(New? We'll create your account / ¿Nuevo? Crearemos tu cuenta)`}
            </p>

            {/* PIN Dots */}
            <div className="flex justify-center gap-4 my-4">
              {[0, 1, 2, 3].map(i => (
                <div
                  key={i}
                  className={`w-5 h-5 rounded-full border-2 transition-colors ${
                    i < pin.length
                      ? 'bg-green-700 border-green-700'
                      : 'border-gray-300 bg-white'
                  }`}
                />
              ))}
            </div>

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            {/* PIN Pad */}
            <div className="grid grid-cols-3 gap-3">
              {PAD_KEYS.map((key, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (key === '⌫') handlePinDelete()
                    else if (key !== '') handlePinDigit(key)
                  }}
                  disabled={loading || key === ''}
                  className={`h-16 text-2xl font-semibold rounded-xl transition-all active:scale-95 ${
                    key === ''
                      ? 'invisible'
                      : key === '⌫'
                      ? 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
                      : 'bg-white text-gray-800 shadow hover:bg-green-50 border border-gray-200'
                  }`}
                >
                  {loading && pin.length === 4 ? '...' : key}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setStep(role === 'admin' ? 'code' : 'name')
                setPin('')
                setError('')
              }}
              className="w-full text-gray-500 text-sm py-2"
            >
              {role === 'admin' ? '← Change verification code' : '← Change name / Cambiar nombre'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
