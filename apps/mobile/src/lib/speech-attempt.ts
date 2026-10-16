// 말하기 문항 한 번의 국면 · 조작 · 마이크 상태를 정하는 순수 규칙입니다. UI를 import하지 않습니다.
//
// 스캐폴드: 타입은 실물이고 함수는 import만 가능한 자리표시자입니다.

import type { SpeechResult } from "./speech-recognition";
import type { UiCopy } from "./ui-copy.contract";

/** 들을 수 없는 까닭 — 권한 · 인식기(잠김) / iOS 받아쓰기 꺼짐(재시도) / 그 한 번의 실패. */
export type SpeechUnavailableReason = "blocked" | "dictation-off" | "failed";

/** 인식 한 번(또는 시작하지 못함)의 결말입니다. */
export type SpeechAttemptOutcome =
  | { readonly kind: "heard"; readonly text: string }
  | { readonly kind: "unavailable"; readonly reason: SpeechUnavailableReason };

/** 말하기 문항 하나의 국면입니다. */
export type SpeechAttemptPhase =
  | { readonly kind: "ready" }
  | { readonly kind: "listening" }
  | SpeechAttemptOutcome;

/** 활동 안에서 듣기가 막혔는가 — 한 번 blocked면 그 활동 동안 되돌아가지 않습니다. */
export type SpeechAvailability = "open" | "blocked";

/** 마이크(파형) 아이콘의 상태 — 대기(누름) · 듣는 중(누름) · 꺼짐(누를 수 없음). */
export type SpeechWavesState = "idle" | "listening" | "off";

/** 말하기 활동의 버튼이 하는 일입니다. 라벨은 `speechControlLabel`이 냅니다. */
export type SpeechControl = "speak" | "stop" | "next" | "skip" | "retry";

export type SpeechControls = {
  readonly primary: SpeechControl | null;
  readonly secondary: SpeechControl | null;
};

/** 접점 없음 · 권한 · 인식기 때문에 들을 수 없는 결말입니다. */
export const speechBlocked: SpeechAttemptOutcome = { kind: "unavailable", reason: "blocked" };

export function speechAttemptOutcomeOf(_result: SpeechResult): SpeechAttemptOutcome {
  return speechBlocked;
}

export function speechAvailabilityAfter(
  availability: SpeechAvailability,
  _outcome: SpeechAttemptOutcome,
): SpeechAvailability {
  return availability;
}

export function speechPhaseFor(_availability: SpeechAvailability): SpeechAttemptPhase {
  return { kind: "ready" };
}

export function speechWavesStateOf(_phase: SpeechAttemptPhase): SpeechWavesState {
  return "off";
}

export function speechControlLabel(
  _control: SpeechControl,
  _nextLabel: string,
  _copy: UiCopy,
): string {
  return "";
}
