// 말하기 화면들의 문구표 구획 타입입니다(타입만). 값은 `ui-copy-<언어>-learning.ts`가 집니다.

export type SpeakingCopy = {
  readonly instruction: string;
  readonly speak: string;
  readonly stopSpeaking: string;
  readonly tryAgain: string;
  readonly dictationDisabled: string;
  readonly tapToContinue: string;
  readonly recognitionUnavailable: string;
  /** 못 알아들음(말이 없음 · 시간 초과 포함) — 다시 말하기 안내입니다(ADR-0181). */
  readonly notCaught: string;
  /** 인식 서버에 닿지 못함 — 연결 확인 뒤 다시 말하기 안내입니다(ADR-0181). */
  readonly networkRetry: string;
};
