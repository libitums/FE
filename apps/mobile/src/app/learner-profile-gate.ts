// 학습자 프로필의 순수 판정입니다 — 치환용 프로필 만들기 · 「필요한 에피소드」 판정 · 시작 가드 판정.

import type {
  LearnerProfilePort,
  LearnerProfilePrompt,
  LearnerProfileRecord,
} from "../lib/learner-profile.contract";
import type { LearnerProfile } from "../lib/placeholder-fill";
import type { CatalogEntry } from "../lib/episode-catalog";
import { noLearnerProfile } from "./catalog-cover-wiring";
import type { EpisodeContent } from "./episode-content";

/** 기록이 없으면 `noLearnerProfile` 그 참조입니다. 나라가 표에 없으면 나라 키가 빠집니다. */
export function learnerFillOf(
  _record: LearnerProfileRecord | null,
  _port: LearnerProfilePort,
): LearnerProfile {
  return noLearnerProfile;
}

/** 표지 · 유닛 · 최종 테스트 · 통과 뒤 컷의 문자열에 채울 자리가 있는가입니다(항목 참조로 메모). */
export function catalogEntryNeedsLearnerProfile(
  _content: EpisodeContent,
  _entry: Extract<CatalogEntry, { status: "ready" }>,
): boolean {
  return false;
}

export type LearnerProfileGate = "ask" | "pass";

export function learnerProfileGateOf(_input: {
  readonly needsProfile: boolean;
  readonly record: LearnerProfileRecord | null;
  readonly prompt: LearnerProfilePrompt;
}): LearnerProfileGate {
  return "pass";
}
