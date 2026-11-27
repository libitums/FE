// 마이크 권한 안내의 순수 규칙입니다(ADR-0206) — 사전 안내(P1) · 거부(P2) 시트를 언제 띄우는가. UI를 import하지 않습니다.
//
// 권한 상태는 `speech-recognition.ts`가 있는 그대로 올립니다(마이크 · 음성 인식 둘). 조합을 「무엇을 띄울까」로 접는 자리가 여기입니다.

import type { SpeechPermissionState, SpeechStatus } from "./speech-recognition";

/**
 * 지금 들을 수 있는가를 한 낱말로 — `ready` 들을 수 있음 · `ask` 아직 묻지 않은 권한이 있음 · `denied` 사용자가 거부함(설정에서
 * 되돌릴 수 있음) · `unavailable` 되돌릴 수 없음(기기 정책 `restricted` · 모름 · 인식기 없음).
 */
export type MicGate = "ready" | "ask" | "denied" | "unavailable";

/** 띄울 시트 — 사전 안내(P1) · 거부(P2). */
export type MicSheet = "prime" | "denied";

/** 마이크를 쓰는 화면 — 이벤트의 `surface` 값입니다. */
export type MicSurface = "speak-word" | "read-aloud" | "roleplay";

/** 이 레슨의 말하기를 건너뛴 까닭 — 사전 안내의 Not now · 거부 시트의 Continue without speaking. */
export type SpeakingSkipReason = "mic:not-now" | "unavailable:blocked";

/** 사전 안내를 한 번 보였는가(기기 단위 — 시스템 권한도 기기 단위입니다). 값은 `"1"`. */
export const micPrimerSeenKey = "libitum.mic-primer-seen";

const permissionsOf = (status: SpeechStatus): readonly SpeechPermissionState[] => [
  status.microphone,
  status.speechRecognition,
];

/** 묻지 않은 권한이 먼저(묻기), 그다음 거부(설정), 그다음 되돌릴 수 없는 제한 · 인식기 없음입니다. */
export function micGateOf(status: SpeechStatus): MicGate {
  const permissions = permissionsOf(status);
  if (permissions.includes("not-determined")) return "ask";
  if (permissions.includes("denied")) return "denied";
  if (permissions.some((state) => state !== "granted")) return "unavailable";
  return status.recognizerAvailable ? "ready" : "unavailable";
}

/**
 * 말하기 화면이 열릴 때 띄울 시트입니다 — 아직 묻지 않았고 사전 안내를 본 적 없으면 사전 안내, 거부면 거부 시트, 그 밖에는 없음.
 * 사전 안내를 한 번 본 뒤에는 다시 띄우지 않습니다 — 그 뒤에는 마이크를 누를 때 시스템 창이 바로 뜹니다.
 */
export function micSheetOnOpen(gate: MicGate, primerSeen: boolean): MicSheet | null {
  if (gate === "ask") return primerSeen ? null : "prime";
  return gate === "denied" ? "denied" : null;
}

/** 시스템 창에 답한 뒤의 결과 — 둘 다 허용이면 `allowed`, 하나라도 거부 · 제한이면 `denied`, 아직 모르면 `null`. */
export function micAnswerOf(status: SpeechStatus): "allowed" | "denied" | null {
  const permissions = permissionsOf(status);
  if (permissions.every((state) => state === "granted")) return "allowed";
  if (permissions.includes("not-determined") || permissions.includes("unknown")) return null;
  return "denied";
}
