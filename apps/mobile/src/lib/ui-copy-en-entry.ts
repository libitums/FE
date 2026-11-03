// 영어 문구표 구획 — 진입 흐름(onboarding · languageSelect · journeyEntry · login · verificationCode).

import type { JourneyEntryCopy } from "../screens/journey-entry/journey-entry.contract";
import type { LanguageSelectCopy } from "../screens/language-select/language-select.contract";
import type { LoginCopy } from "../screens/login/login.contract";
import type { OnboardingScreenCopy } from "../screens/onboarding/onboarding.contract";
import type { VerificationCodeCopy } from "../screens/verification-code/verification-code.contract";

// 본문의 `\n`은 읽기 좋게 의미 단위로 끊은 줄바꿈입니다(2026-09-21 디자인 반영 — 임시 문구).
export const onboardingEn: OnboardingScreenCopy = {
  steps: {
    0: {
      title: "with",
      titleEmphasis: "Story",
      body: "Follow everyday moments in a story\nand pick up Korean along the way.",
    },
    1: {
      title: "Practice",
      titleEmphasis: "Korean",
      body: "Practice real conversations and\ncheck what you learned with quick quizzes.",
    },
    2: {
      title: "Just",
      titleEmphasis: "5 minutes",
      body: "Short daily units fit into your day.\nClear one in just five minutes.",
    },
  },
  next: "Next",
  getStarted: "Get started",
  progress: (ordinal, total) => `Step ${ordinal} of ${total}`,
  storyChat: {
    staff: "Staff",
    welcome: "Welcome! Are you looking for anything?",
    sunscreen: "Do you have sunscreen?",
    thisWay: "Yes, come this way.",
  },
  quiz: { replay: "Replay", stop: "Stop", play: "Play" },
  unit: {
    title: "Shopping at a beauty store",
    meta: "Unit 1 · 5 min",
    status: { active: "Learning", clear: "Clear" },
  },
};

export const languageSelectEn: LanguageSelectCopy = {
  title: "Select Language",
  caption: "Choose the language you want to proceed with",
  preview: {
    question: "What did you hear?",
    meaning: "Thank you",
  },
};

// 제목 · 안내 · 큰 제목은 자리표입니다(디자인 문구 확정 전).
export const journeyEntryEn: JourneyEntryCopy = {
  title: "Your journey awaits",
  display: "Start your story",
  caption: "Explore Seoul, meet new people, and learn Korean along the way.",
  notice: "Some images in this service are generated using AI technology",
  start: "Start",
};

export const loginEn: LoginCopy = {
  method: {
    phone: "Continue",
    google: "Connect with Google",
    apple: "Sign in with Apple",
    facebook: "Connect with Facebook",
  },
  heading: {
    visible: {
      title: "Log in or Sign up with your phone number",
      caption: "Please enter your phone number to continue",
    },
    hidden: { title: "Log in or Sign up", caption: "Choose how you'd like to continue" },
  },
  countryCode: (name, dialCode) => `Country code, ${name} ${dialCode}`,
  phoneNumber: "Phone number",
  or: "or",
  countrySheetTitle: "Select country",
  legal: {
    lead: "By signing up, you agree to the",
    termsOfUse: "Terms of Use",
    and: "&",
    privacyPolicy: "Privacy Policy",
  },
};

export const verificationCodeEn: VerificationCodeCopy = {
  title: "Verification code OTP",
  sentTo: "A verification code has been sent to",
  digit: (ordinal, total) => `Digit ${ordinal} of ${total}`,
  resendHint: "Didn't receive the code?",
  resend: "Resend",
  submit: "Continue",
};
