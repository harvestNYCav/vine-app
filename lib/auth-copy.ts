import type { Role } from '@/types'

/**
 * Copy for the screens shown before anyone is signed in. Everywhere else the
 * Spanish toggle is a per-account setting an admin grants, but nobody has an
 * account yet here, so the landing and login pages carry their own translation
 * through a `lang` query parameter.
 */
export type AuthLang = 'en' | 'es'

export function normalizeAuthLang(value: unknown): AuthLang {
  return value === 'es' ? 'es' : 'en'
}

export function isAuthRole(value: unknown): value is Role {
  return value === 'student' || value === 'parent' || value === 'tutor' || value === 'admin'
}

interface LandingCopy {
  tagline: string
  prompt: string
  student: string
  parent: string
  tutor: string
  admin: string
  adminSubtitle: string
  footer: string
}

export const LANDING_COPY: Record<AuthLang, LandingCopy> = {
  en: {
    tagline: 'Community Tutoring Program',
    prompt: 'Who are you?',
    student: "I'm a Student",
    parent: "I'm a Parent",
    tutor: "I'm a Tutor",
    admin: 'Admin',
    adminSubtitle: 'Program dashboard',
    footer: 'Vine Tutoring · Kips Bay, New York',
  },
  es: {
    tagline: 'Programa de Tutoría Comunitaria',
    prompt: '¿Quién eres?',
    student: 'Soy estudiante',
    parent: 'Soy madre o padre',
    tutor: 'Soy tutor o tutora',
    admin: 'Administración',
    adminSubtitle: 'Panel del programa',
    footer: 'Vine Tutoring · Kips Bay, Nueva York',
  },
}

interface LoginCopy {
  title: Record<'student' | 'parent' | 'tutor' | 'admin', string>
  nameLabel: string
  namePlaceholder: string
  nameRequired: string
  continueButton: string
  goBack: string
  changeName: string
  greeting: (name: string) => string
  emailLabel: string
  emailInvalid: string
  sendCode: string
  sending: string
  sendCodeFailed: string
  checkEmail: (email: string) => string
  codeLabel: string
  codeInvalid: string
  devCode: string
  sendNewCode: string
  changeCode: string
  pinGreeting: (name: string) => string
  pinPrompt: string
  pinHint: string
  emailVerified: (email: string) => string
  adminCreatesStudents: string
  adminCreatesParents: string
  tutorSelfSignup: string
  noPinDigits: string
  pinDigitsEntered: (entered: number, total: number) => string
  deleteDigit: string
  enterDigit: (digit: string) => string
  connectionError: string
  genericError: string
}

export const LOGIN_COPY: Record<AuthLang, LoginCopy> = {
  en: {
    title: {
      student: 'Student Login',
      parent: 'Parent Login',
      tutor: 'Tutor Login',
      admin: 'Admin Login',
    },
    nameLabel: 'Your name',
    namePlaceholder: 'e.g. Maria',
    nameRequired: 'Please enter your name',
    continueButton: 'Continue',
    goBack: '← Go back',
    changeName: '← Change name',
    greeting: name => `Hello, ${name}`,
    emailLabel: 'Admin email',
    emailInvalid: 'Please enter a valid email',
    sendCode: 'Send verification code',
    sending: 'Sending...',
    sendCodeFailed: 'Could not send verification code',
    checkEmail: email => `Check ${email}`,
    codeLabel: 'Verification code',
    codeInvalid: 'Enter the 6-digit verification code',
    devCode: 'Dev code',
    sendNewCode: 'Send a new code',
    changeCode: '← Change verification code',
    pinGreeting: name => `Hello, ${name}! 👋`,
    pinPrompt: 'Enter your 4-digit PIN',
    pinHint: 'Use the number keys or keypad',
    emailVerified: email => `Email verified: ${email}`,
    adminCreatesStudents: 'Your program admin creates student accounts',
    adminCreatesParents: 'Your program admin creates parent accounts',
    tutorSelfSignup: "(New? We'll create your account)",
    noPinDigits: 'No PIN digits entered',
    pinDigitsEntered: (entered, total) => `${entered} of ${total} PIN digits entered`,
    deleteDigit: 'Delete last PIN digit',
    enterDigit: digit => `Enter ${digit}`,
    connectionError: 'Connection error. Please try again.',
    genericError: 'Something went wrong',
  },
  es: {
    title: {
      student: 'Acceso para estudiantes',
      parent: 'Acceso para familias',
      tutor: 'Acceso para tutores',
      admin: 'Acceso para administradores',
    },
    nameLabel: 'Tu nombre',
    namePlaceholder: 'ej. María',
    nameRequired: 'Por favor escribe tu nombre',
    continueButton: 'Continuar',
    goBack: '← Volver',
    changeName: '← Cambiar nombre',
    greeting: name => `Hola, ${name}`,
    emailLabel: 'Correo del administrador',
    emailInvalid: 'Escribe un correo electrónico válido',
    sendCode: 'Enviar código de verificación',
    sending: 'Enviando...',
    sendCodeFailed: 'No se pudo enviar el código de verificación',
    checkEmail: email => `Revisa ${email}`,
    codeLabel: 'Código de verificación',
    codeInvalid: 'Escribe el código de verificación de 6 dígitos',
    devCode: 'Código de prueba',
    sendNewCode: 'Enviar un código nuevo',
    changeCode: '← Cambiar el código de verificación',
    pinGreeting: name => `¡Hola, ${name}! 👋`,
    pinPrompt: 'Escribe tu PIN de 4 dígitos',
    pinHint: 'Usa el teclado numérico',
    emailVerified: email => `Correo verificado: ${email}`,
    adminCreatesStudents: 'El administrador del programa crea las cuentas de estudiante',
    adminCreatesParents: 'El administrador del programa crea las cuentas de familia',
    tutorSelfSignup: '(¿Eres nuevo? Crearemos tu cuenta)',
    noPinDigits: 'No has escrito ningún dígito del PIN',
    pinDigitsEntered: (entered, total) => `${entered} de ${total} dígitos del PIN escritos`,
    deleteDigit: 'Borrar el último dígito del PIN',
    enterDigit: digit => `Escribir ${digit}`,
    connectionError: 'Error de conexión. Inténtalo de nuevo.',
    genericError: 'Algo salió mal',
  },
}

/**
 * Sign-in failures a student or parent can actually hit. The server sends a
 * stable code alongside its English message so the translated page does not have
 * to match on prose; anything without a known code falls back to that message.
 */
export const LOGIN_ERROR_COPY: Record<AuthLang, Record<string, string>> = {
  en: {
    invalid_request: 'Check your name and PIN, then try again.',
    student_not_found: 'Student account not found. Ask an admin to create it before signing in.',
    parent_not_found: 'Parent account not found. Ask an admin to create it before signing in.',
    wrong_pin: 'Wrong PIN',
    server_error: 'Could not sign in. Please try again or contact an admin.',
  },
  es: {
    invalid_request: 'Revisa tu nombre y tu PIN, luego inténtalo de nuevo.',
    student_not_found: 'No encontramos esa cuenta de estudiante. Pide a un administrador que la cree antes de entrar.',
    parent_not_found: 'No encontramos esa cuenta de familia. Pide a un administrador que la cree antes de entrar.',
    wrong_pin: 'PIN incorrecto',
    server_error: 'No se pudo iniciar sesión. Inténtalo de nuevo o contacta a un administrador.',
  },
}

export function loginErrorMessage(lang: AuthLang, code: unknown, fallback: unknown): string {
  if (typeof code === 'string' && LOGIN_ERROR_COPY[lang][code]) return LOGIN_ERROR_COPY[lang][code]
  if (typeof fallback === 'string' && fallback.length > 0) return fallback
  return LOGIN_COPY[lang].genericError
}
