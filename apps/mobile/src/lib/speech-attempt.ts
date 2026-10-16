// 말하기 문항 한 번의 국면 · 조작 · 마이크 상태를 정하는 순수 규칙입니다. UI를 import하지 않습니다.

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

// iOS 받아쓰기(Dictation)가 꺼져 있을 때 인식기가 내는 오류입니다 — 다시 켠 뒤 재시도할 수 있습니다.
const dictationOffDomain = "kLSRErrorDomain";
const dictationOffCode = 201;

/**
 * 인식 결과 → 결말. 받아쓰기 꺼짐 판정이 다른 사유보다 먼저입니다(튜토리얼 말하기와 같은 조건).
 * `recognized`는 빈 글자도 `heard`입니다.
 */
export function speechAttemptOutcomeOf(result: SpeechResult): SpeechAttemptOutcome {
  if (result.status === "recognized") {
    return { kind: "heard", text: result.text };
  }
  if (result.errorDomain === dictationOffDomain && result.errorCode === dictationOffCode) {
    return { kind: "unavailable", reason: "dictation-off" };
  }
  if (result.status === "permission-denied" || result.status === "recognizer-unavailable") {
    return speechBlocked;
  }
  return { kind: "unavailable", reason: "failed" };
}

/** blocked 결말이면 blocked, 아니면 그대로(blocked는 open으로 돌아가지 않습니다). */
export function speechAvailabilityAfter(
  availability: SpeechAvailability,
  outcome: SpeechAttemptOutcome,
): SpeechAvailability {
  if (availability === "blocked") {
    return "blocked";
  }
  return outcome.kind === "unavailable" && outcome.reason === "blocked" ? "blocked" : "open";
}

/** 새 문항의 시작 국면 — blocked → unavailable(blocked), open → ready. */
export function speechPhaseFor(availability: SpeechAvailability): SpeechAttemptPhase {
  return availability === "blocked" ? speechBlocked : { kind: "ready" };
}

/** ready → idle, listening → listening, 그 밖 → off. */
export function speechWavesStateOf(phase: SpeechAttemptPhase): SpeechWavesState {
  if (phase.kind === "ready") {
    return "idle";
  }
  return phase.kind === "listening" ? "listening" : "off";
}

/** 조작 → 라벨. next의 이름은 걸음이 정해 `nextLabel`로 받습니다. */
export function speechControlLabel(
  control: SpeechControl,
  nextLabel: string,
  copy: UiCopy,
): string {
  switch (control) {
    case "speak":
      return copy.speaking.speak;
    case "stop":
      return copy.speaking.stopSpeaking;
    case "next":
      return nextLabel;
    case "skip":
      return copy.common.skip;
    case "retry":
      return copy.speaking.tryAgain;
  }
}
