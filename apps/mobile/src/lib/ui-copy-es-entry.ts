// 스페인어 문구표 구획 — 진입 흐름(onboarding · languageSelect · journeyEntry · login · verificationCode · 로그인 실패).
// 번역 초안 — 원어민 검수 필요(ADR-0097).

import type { AuthFailureCopy } from "./auth-failure";
import type { JourneyEntryCopy } from "../screens/journey-entry/journey-entry.contract";
import type { LanguageSelectCopy } from "../screens/language-select/language-select.contract";
import type { LoginCopy } from "../screens/login/login.contract";
import type { OnboardingScreenCopy } from "../screens/onboarding/onboarding.contract";
import type { VerificationCodeCopy } from "../screens/verification-code/verification-code.contract";

// 본문의 `\n`은 읽기 좋게 의미 단위로 끊은 줄바꿈입니다(임시 문구).
export const onboardingEs: OnboardingScreenCopy = {
  steps: {
    0: {
      title: "con",
      titleEmphasis: "Historias",
      body: "Sigue momentos cotidianos en una historia\ny aprende coreano por el camino.",
    },
    1: {
      title: "Practica",
      titleEmphasis: "coreano",
      body: "Practica conversaciones reales y\nrepasa lo aprendido con quizzes rápidos.",
    },
    2: {
      title: "Solo",
      titleEmphasis: "5 minutos",
      body: "Unidades diarias cortas que caben en tu día.\nCompleta una en solo cinco minutos.",
    },
  },
  next: "Siguiente",
  getStarted: "Empezar",
  progress: (ordinal, total) => `Paso ${ordinal} de ${total}`,
  storyChat: {
    staff: "Personal",
    welcome: "¡Bienvenido! ¿Buscas algo?",
    sunscreen: "¿Tienen protector solar?",
    thisWay: "Sí, por aquí.",
  },
  quiz: { replay: "Repetir", stop: "Detener", play: "Reproducir" },
  unit: {
    title: "De compras en una tienda de belleza",
    meta: "Unidad 1 · 5 min",
    status: { active: "Aprendiendo", clear: "Completada" },
  },
};

export const languageSelectEs: LanguageSelectCopy = {
  title: "Elige un idioma",
  caption: "Elige el idioma con el que quieres continuar",
  preview: {
    question: "¿Qué escuchaste?",
    meaning: "Gracias",
  },
};

// 제목 · 안내 · 큰 제목은 자리표입니다(디자인 문구 확정 전).
export const journeyEntryEs: JourneyEntryCopy = {
  title: "Tu viaje te espera",
  display: "Empieza tu historia",
  caption: "Explora Seúl, conoce gente nueva y aprende coreano por el camino.",
  notice: "Algunas imágenes de este servicio se generaron con tecnología de IA",
  start: "Empezar",
};

export const loginEs: LoginCopy = {
  method: {
    phone: "Continuar",
    google: "Continuar con Google",
    apple: "Iniciar sesión con Apple",
    facebook: "Continuar con Facebook",
  },
  heading: {
    visible: {
      title: "Inicia sesión o regístrate con tu número de teléfono",
      caption: "Ingresa tu número de teléfono para continuar",
    },
    hidden: { title: "Inicia sesión o regístrate", caption: "Elige cómo quieres continuar" },
  },
  countryCode: (name, dialCode) => `Código de país, ${name} ${dialCode}`,
  phoneNumber: "Número de teléfono",
  or: "o",
  countrySheetTitle: "Elige un país",
  legal: {
    lead: "Al registrarte, aceptas los",
    termsOfUse: "Términos de uso",
    and: "y la",
    privacyPolicy: "Política de privacidad",
  },
};

export const verificationCodeEs: VerificationCodeCopy = {
  title: "Código de verificación OTP",
  sentTo: "Enviamos un código de verificación a",
  digit: (ordinal, total) => `Dígito ${ordinal} de ${total}`,
  resendHint: "¿No recibiste el código?",
  resend: "Reenviar",
  submit: "Continuar",
};

export const authFailureEs: AuthFailureCopy = {
  network: "No pudimos conectarnos. Revisa tu conexión e inténtalo de nuevo.",
  unavailable: "Algo salió mal. Inténtalo de nuevo.",
  unconfigured: "El inicio de sesión no está disponible ahora.",
  "rate-limited": "Demasiados intentos. Espera un momento e inténtalo de nuevo.",
  rejected: "No pudimos enviar un código a este número. Revísalo e inténtalo de nuevo.",
  "invalid-code": "El código es incorrecto o ya venció.",
  "sign-in-incomplete": "No se completó el inicio de sesión. Inténtalo de nuevo.",
  unsupported: "Esta opción de inicio de sesión no está disponible en este dispositivo.",
};
