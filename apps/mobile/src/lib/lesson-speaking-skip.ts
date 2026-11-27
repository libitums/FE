// 「이 레슨의 말하기를 건너뜀」 기억입니다(ADR-0206 D4) — 사전 안내의 Not now · 거부 시트의 Continue without speaking을 고르면
// 같은 레슨의 뒤 말하기 활동도 문항을 건너뜁니다. 레슨이 새로 시작되면(`clearSession`) 비웁니다. 실행 동안만 삽니다(저장하지 않음).

import type { SpeakingSkipReason } from "./mic-permission";

let skipped: { readonly lessonKey: string; readonly reason: SpeakingSkipReason } | null = null;

/** 레슨 하나를 가르는 열쇠 — 에피소드 · 유닛입니다. */
export function lessonSpeakingKey(episodeId: string, unitKey: string): string {
  return `${episodeId}:${unitKey}`;
}

export function skipLessonSpeaking(lessonKey: string, reason: SpeakingSkipReason): void {
  skipped = { lessonKey, reason };
}

/** 이 레슨에서 말하기를 건너뛰기로 했으면 그 까닭, 아니면 `null`입니다. */
export function lessonSpeakingSkipOf(lessonKey: string): SpeakingSkipReason | null {
  return skipped !== null && skipped.lessonKey === lessonKey ? skipped.reason : null;
}

/** 레슨이 새로 시작될 때 비웁니다. */
export function clearLessonSpeakingSkip(): void {
  skipped = null;
}
