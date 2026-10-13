// 학습자 프로필의 순수 규칙입니다 — 이름 검증 · 기록 디코드 · 같음 판정 · 이벤트 만들기. 어느 스레드든
// 안전하고 한글 리터럴이 없습니다.

import type {
  LearnerNameResult,
  LearnerProfileEntry,
  LearnerProfilePort,
  LearnerProfileRecord,
  LearnerProfileSavedEvent,
  LearnerProfileSkippedEvent,
} from "./learner-profile.contract";

export const LEARNER_NAME_MAX_LENGTH = 30;

/** 자산이 아직 닫히지 않았을 때의 포트입니다 — 검색은 빈 목록, 조회는 `null`, 미리보기는 줄 없는 `example`. */
export const noLearnerProfilePort: LearnerProfilePort = {
  search: () => [],
  byCode: () => null,
  previewOf: () => ({ kind: "example", lines: [] }),
};

export function learnerNameFrom(_input: string): LearnerNameResult {
  return { ok: false, issue: "empty" };
}

/** 대문자 라틴 두 글자인가입니다(표에 있는가는 보지 않습니다). */
export function isLearnerCountryCode(_value: unknown): _value is string {
  return false;
}

/** `{ name, countryCode }` 모양이고 두 칸 모두 규칙을 지키면 정규화된 기록, 아니면 `null`. 던지지 않습니다. */
export function learnerProfileRecordFrom(_raw: unknown): LearnerProfileRecord | null {
  return null;
}

export function sameLearnerProfile(
  _a: LearnerProfileRecord | null,
  _b: LearnerProfileRecord | null,
): boolean {
  return false;
}

/** `previous`가 없으면 `created`, 있으면 `updated`. */
export function learnerProfileSavedEvent(
  entry: LearnerProfileEntry,
  _previous: LearnerProfileRecord | null,
): LearnerProfileSavedEvent {
  return { name: "learner_profile_saved", entry, change: "created" };
}

export function learnerProfileSkippedEvent(
  entry: Exclude<LearnerProfileEntry, "settings">,
): LearnerProfileSkippedEvent {
  return { name: "learner_profile_skipped", entry };
}
