// 학습자 프로필의 순수 판정입니다 — 치환용 프로필 만들기 · 「필요한 에피소드」 판정 · 시작 가드 판정.

import type {
  LearnerProfilePort,
  LearnerProfilePrompt,
  LearnerProfileRecord,
} from "../lib/learner-profile.contract";
import { learnerCountryTextOf } from "../lib/learner-profile";
import type { LearnerProfile } from "../lib/placeholder-fill";
import type { CatalogEntry } from "../lib/episode-catalog";
import { noLearnerProfile } from "./catalog-cover-wiring";
import type { EpisodeContent } from "./episode-content";

/** 기록이 없으면 `noLearnerProfile` 그 참조입니다. 나라가 표에 없으면 나라 키가 빠집니다. */
export function learnerFillOf(
  record: LearnerProfileRecord | null,
  port: LearnerProfilePort,
): LearnerProfile {
  if (record === null) return noLearnerProfile;
  const country = port.byCode(record.countryCode);
  return country === null
    ? { name: record.name }
    : { name: record.name, country: learnerCountryTextOf(country) };
}

/** 치환할 자리표시자가 든 문자열이 하나라도 있는가입니다 - 값마다 기본 프로필 치환이 글자를 바꾸는지 봅니다. */
function hasFillableText(content: EpisodeContent, value: unknown): boolean {
  if (typeof value === "string") {
    return value.includes("{") && content.fillText(value, noLearnerProfile, "ko") !== value;
  }
  if (Array.isArray(value)) {
    return value.some((item) => hasFillableText(content, item));
  }
  if (typeof value === "object" && value !== null) {
    return Object.values(value).some((item) => hasFillableText(content, item));
  }
  return false;
}

// 같은 ready 항목 참조면 같은 판정입니다. `content.fillText`는 한 실행 안에서 상수 함수입니다.
const needsMemo = new WeakMap<object, boolean>();

/** 표지 · 유닛 · 최종 테스트 · 통과 뒤 컷의 문자열에 채울 자리가 있는가입니다(항목 참조로 메모). */
export function catalogEntryNeedsLearnerProfile(
  content: EpisodeContent,
  entry: Extract<CatalogEntry, { status: "ready" }>,
): boolean {
  const known = needsMemo.get(entry);
  if (known !== undefined) return known;
  const { prologue, units, finalTest, epilogue } = entry.episode;
  const needs = [prologue, units, finalTest, epilogue].some((part) =>
    hasFillableText(content, part),
  );
  needsMemo.set(entry, needs);
  return needs;
}

export type LearnerProfileGate = "ask" | "pass";

export function learnerProfileGateOf(input: {
  readonly needsProfile: boolean;
  readonly record: LearnerProfileRecord | null;
  readonly prompt: LearnerProfilePrompt;
}): LearnerProfileGate {
  return input.needsProfile && input.record === null && input.prompt === "open" ? "ask" : "pass";
}
