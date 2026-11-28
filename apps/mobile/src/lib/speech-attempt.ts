// 말하기 문항 한 번의 국면 · 조작 · 마이크 상태를 정하는 순수 규칙입니다. UI를 import하지 않습니다.

import type { SpeechFallback, SpeechKoreanPack, SpeechResult } from "./speech-recognition";
import type { UiCopy } from "./ui-copy.contract";

/** 들을 수 없는 까닭 — 권한 · 인식기(잠김) / iOS 받아쓰기 꺼짐(재시도) / 그 한 번의 실패. */
export type SpeechUnavailableReason = "blocked" | "dictation-off" | "failed";

/**
 * 이 한 번 글자를 얻지 못한 까닭 — 기기 · 권한 문제가 아니라 같은 문항을 곧바로 다시 말할 수 있습니다(ADR-0181).
 * `no-match`(말을 못 알아들음 · 말이 없음 · 시간 초과) · `network`(인식 서버에 닿지 못함).
 */
export type SpeechMissReason = "no-match" | "network";

/** 인식기가 결과를 올린 시도의 진단 — 측정 이벤트가 싣습니다(오류 코드 · 네트워크로 되돌아감 · 한국어 팩). */
export type SpeechDiagnostic = {
  readonly errorCode: number;
  readonly fallback: SpeechFallback;
  readonly koreanPack: SpeechKoreanPack;
};

/** 인식 한 번(또는 시작하지 못함)의 결말입니다. 인식기가 결과를 올렸으면 `diagnostic`이 있습니다. */
export type SpeechAttemptOutcome =
  | { readonly kind: "heard"; readonly text: string; readonly diagnostic?: SpeechDiagnostic }
  | {
      readonly kind: "missed";
      readonly reason: SpeechMissReason;
      readonly diagnostic?: SpeechDiagnostic;
    }
  | {
      readonly kind: "unavailable";
      readonly reason: SpeechUnavailableReason;
      readonly diagnostic?: SpeechDiagnostic;
    };

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

// 못 알아들음 · 네트워크 실패의 오류 코드입니다(ADR-0181). 기기 · 권한 문제가 아니라 다시 말하면 풀릴 수 있습니다.
// Android `SpeechRecognizer`: 6 SPEECH_TIMEOUT · 7 NO_MATCH / 1 NETWORK_TIMEOUT · 2 NETWORK · 4 SERVER.
// iOS `kAFAssistantErrorDomain`: 1110 말 없음 · 203 다시 말하기(알아들을 말이 없음).
const androidDomain = "android.speech.SpeechRecognizer";
const assistantDomain = "kAFAssistantErrorDomain";
const androidNoMatchCodes: readonly number[] = [6, 7];
const androidNetworkCodes: readonly number[] = [1, 2, 4];
const assistantNoMatchCodes: readonly number[] = [203, 1110];

/** 인식 실패 하나가 다시 말하기로 풀리는 까닭이면 그 까닭, 아니면 `null`입니다. */
function missReasonOf(result: SpeechResult): SpeechMissReason | null {
  if (result.status !== "recognition-failed") {
    return null;
  }
  if (result.errorDomain === androidDomain) {
    if (androidNoMatchCodes.includes(result.errorCode)) return "no-match";
    return androidNetworkCodes.includes(result.errorCode) ? "network" : null;
  }
  return result.errorDomain === assistantDomain && assistantNoMatchCodes.includes(result.errorCode)
    ? "no-match"
    : null;
}

/**
 * 인식 결과 → 결말. 받아쓰기 꺼짐 판정이 다른 사유보다 먼저입니다(튜토리얼 말하기와 같은 조건).
 * 못 알아들음 · 네트워크 실패는 `missed`(다시 말하기)이고 나머지 실패만 `unavailable`입니다(ADR-0181).
 * `recognized`는 빈 글자도 `heard`입니다.
 */
export function speechAttemptOutcomeOf(result: SpeechResult): SpeechAttemptOutcome {
  const diagnostic: SpeechDiagnostic = {
    errorCode: result.errorCode,
    fallback: result.fallback,
    koreanPack: result.koreanPack,
  };
  if (result.status === "recognized") {
    return { kind: "heard", text: result.text, diagnostic };
  }
  if (result.errorDomain === dictationOffDomain && result.errorCode === dictationOffCode) {
    return { kind: "unavailable", reason: "dictation-off", diagnostic };
  }
  const missReason = missReasonOf(result);
  if (missReason !== null) {
    return { kind: "missed", reason: missReason, diagnostic };
  }
  const reason =
    result.status === "permission-denied" || result.status === "recognizer-unavailable"
      ? "blocked"
      : "failed";
  return { kind: "unavailable", reason, diagnostic };
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

/** ready · 다시 말할 수 있는 실패(missed · failed) → idle, listening → listening, 그 밖 → off. */
export function speechWavesStateOf(phase: SpeechAttemptPhase): SpeechWavesState {
  if (phase.kind === "ready" || speechRetryable(phase)) {
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

/** 못 알아들은 까닭 → 안내 줄입니다 — 말을 못 알아들음은 다시 말하기, 네트워크는 연결 확인 뒤 다시입니다. */
export function speechMissedHintOf(reason: SpeechMissReason, copy: UiCopy): string {
  return reason === "network" ? copy.speaking.networkRetry : copy.speaking.notCaught;
}

/** 같은 문항을 곧바로 다시 말할 수 있는 실패인가 — 못 알아들음 · 인식 실패(ADR-0206 D5). 권한 · 인식기(blocked)는 아닙니다. */
export function speechRetryable(phase: SpeechAttemptPhase): boolean {
  if (phase.kind === "missed") return true;
  return phase.kind === "unavailable" && phase.reason === "failed" && !languageMissing(phase);
}

// Android 인식기의 언어 없음(12 LANGUAGE_NOT_SUPPORTED · 13 LANGUAGE_UNAVAILABLE) — 한국어 팩 안내(#555)를 그대로 둡니다.
// 진단에는 도메인이 없어(옛 Android 호스트는 한국어 팩도 싣지 않음) 코드만 봅니다 — 다른 도메인의 같은 코드도 지금 안내 그대로입니다.
const androidLanguageCodes: readonly number[] = [12, 13];

function languageMissing(phase: { readonly diagnostic?: SpeechDiagnostic }): boolean {
  const diagnostic = phase.diagnostic;
  return diagnostic !== undefined && androidLanguageCodes.includes(diagnostic.errorCode);
}

/** 같은 문항에서 연달아 실패한 수가 이만큼이면 「정답 듣기」를 함께 보입니다(ADR-0206 D5). */
export const hearAnswerAfterFailures = 2;

/** 실패가 하나 더 쌓인 수 — 다시 말할 수 있는 실패면 +1, 들음이면 0으로, 그 밖(준비 · 듣는 중 · 불가)은 그대로입니다. */
export function speechFailuresAfter(failures: number, phase: SpeechAttemptPhase): number {
  if (phase.kind === "heard") return 0;
  return speechRetryable(phase) ? failures + 1 : failures;
}

/**
 * 권한이 다시 열렸다(설정에서 돌아옴 · 사전 안내 허용) — 활동 잠금을 풀고, 불가(blocked) 국면이면 준비로 돌립니다(ADR-0206 D3).
 * 바뀔 것이 없으면 같은 참조입니다.
 */
export function speechReopened<
  State extends { readonly phase: SpeechAttemptPhase; readonly availability: SpeechAvailability },
>(state: State): State {
  const blockedPhase = state.phase.kind === "unavailable" && state.phase.reason === "blocked";
  if (state.availability === "open" && !blockedPhase) return state;
  return {
    ...state,
    availability: "open",
    phase: blockedPhase ? { kind: "ready" } : state.phase,
  };
}
