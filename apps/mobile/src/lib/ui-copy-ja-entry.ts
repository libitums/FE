// 일본어 문구표 구획 — 진입 흐름(onboarding · languageSelect · journeyEntry · login · verificationCode · 로그인 실패).
// 번역 초안 — 원어민 검수 필요(ADR-0098).

import type { AuthFailureCopy } from "./auth-failure";
import type { JourneyEntryCopy } from "../screens/journey-entry/journey-entry.contract";
import type { LanguageSelectCopy } from "../screens/language-select/language-select.contract";
import type { LoginCopy } from "../screens/login/login.contract";
import type { OnboardingScreenCopy } from "../screens/onboarding/onboarding.contract";
import type { VerificationCodeCopy } from "../screens/verification-code/verification-code.contract";

// 본문의 `\n`은 읽기 좋게 의미 단위로 끊은 줄바꿈입니다(임시 문구).
// 제목은 title 뒤에 titleEmphasis가 붙는 순서라, 일본어 어순에 맞게 강조 낱말을 뒤에 둡니다.
export const onboardingJa: OnboardingScreenCopy = {
  steps: {
    0: {
      title: "毎日を",
      titleEmphasis: "ストーリーで",
      body: "物語の中の日常をたどりながら、\n自然と韓国語が身につきます。",
    },
    1: {
      title: "話して学ぶ",
      titleEmphasis: "韓国語",
      body: "リアルな会話を練習して、\n短いクイズで学んだことを確認しましょう。",
    },
    2: {
      title: "1日たった",
      titleEmphasis: "5分",
      body: "毎日の短いユニットで、すきま時間に学習。\n1つたった5分でクリアできます。",
    },
  },
  next: "次へ",
  getStarted: "はじめる",
  progress: (ordinal, total) => `ステップ ${ordinal} / ${total}`,
  storyChat: {
    staff: "店員",
    welcome: "いらっしゃいませ！何かお探しですか？",
    sunscreen: "日焼け止めはありますか？",
    thisWay: "はい、こちらへどうぞ。",
  },
  quiz: { replay: "もう一度再生", stop: "停止", play: "再生" },
  unit: {
    title: "コスメショップで買い物",
    meta: "ユニット1 · 5分",
    status: { active: "学習中", clear: "クリア" },
  },
};

export const languageSelectJa: LanguageSelectCopy = {
  title: "言語を選択",
  caption: "使用する言語を選んでください",
  preview: {
    question: "何と言っていましたか？",
    meaning: "ありがとう",
  },
};

// 제목 · 안내 · 큰 제목은 자리표입니다(디자인 문구 확정 전).
export const journeyEntryJa: JourneyEntryCopy = {
  title: "旅が待っています",
  display: "ストーリーを始めよう",
  caption: "ソウルを探検し、新しい人と出会いながら、韓国語を学びましょう。",
  notice: "本サービスの一部の画像はAI技術で生成されています",
  start: "スタート",
};

export const loginJa: LoginCopy = {
  method: {
    phone: "続ける",
    google: "Googleで続ける",
    apple: "Appleでサインイン",
    facebook: "Facebookで続ける",
  },
  heading: {
    visible: {
      title: "電話番号でログインまたは登録",
      caption: "続けるには電話番号を入力してください",
    },
    hidden: { title: "ログインまたは登録", caption: "続ける方法を選んでください" },
  },
  countryCode: (name, dialCode) => `国番号、${name} ${dialCode}`,
  phoneNumber: "電話番号",
  or: "または",
  countrySheetTitle: "国を選択",
  // 문서 이름 두 개가 앞 문장 뒤에 붙는 순서라, 앞 문장을 "다음에 동의" 꼴로 둡니다.
  legal: {
    lead: "登録すると、次の内容に同意したものとみなされます：",
    termsOfUse: "利用規約",
    and: "・",
    privacyPolicy: "プライバシーポリシー",
  },
};

export const verificationCodeJa: VerificationCodeCopy = {
  title: "認証コード（OTP）",
  sentTo: "認証コードを次の番号に送信しました：",
  digit: (ordinal, total) => `${total}桁中${ordinal}桁目`,
  resendHint: "コードが届きませんか？",
  resend: "再送信",
  submit: "続ける",
};

export const authFailureJa: AuthFailureCopy = {
  network: "接続できませんでした。接続を確認して、もう一度お試しください。",
  unavailable: "問題が発生しました。もう一度お試しください。",
  unconfigured: "現在ログインはご利用いただけません。",
  "rate-limited": "試行回数が多すぎます。しばらく待ってから、もう一度お試しください。",
  rejected: "この番号にコードを送信できませんでした。番号を確認して、もう一度お試しください。",
  "invalid-code": "コードが正しくないか、有効期限が切れています。",
  "sign-in-incomplete": "ログインが完了しませんでした。もう一度お試しください。",
  unsupported: "このログイン方法はこのデバイスではご利用いただけません。",
};
