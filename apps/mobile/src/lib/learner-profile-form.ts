// 학습자 프로필 양식의 순수 로직입니다 — 초안 전이 · 판정 · 보일 오류 · 나라 줄 · 안내 줄 · 낭독 · 설정 요약.
// UI는 결과를 그리기만 합니다.

import type {
  LearnerProfileCopy,
  LearnerProfileDraft,
  LearnerProfileDraftEvent,
  LearnerProfileDraftStatus,
} from "../components/learner-profile.contract";
import type {
  LearnerCountry,
  LearnerNameIssue,
  LearnerProfileOutcome,
  LearnerProfilePort,
  LearnerProfilePreview,
  LearnerProfileRecord,
  LearnerProfileSyncState,
} from "./learner-profile.contract";

export const learnerCountryAnnounceDelayMs = 600;

export function initialLearnerProfileDraft(
  _record: LearnerProfileRecord | null,
): LearnerProfileDraft {
  return { name: "", countryCode: null, view: "form", query: "", incompleteNotice: "quiet" };
}

export function learnerProfileDraftReducer(
  draft: LearnerProfileDraft,
  _event: LearnerProfileDraftEvent,
): LearnerProfileDraft {
  return draft;
}

export function learnerProfileDraftStatus(
  _draft: LearnerProfileDraft,
  _port: LearnerProfilePort,
): LearnerProfileDraftStatus {
  return { kind: "empty" };
}

export function visibleLearnerNameIssue(
  _draft: LearnerProfileDraft,
  _port: LearnerProfilePort,
): LearnerNameIssue | null {
  return null;
}

export function visibleLearnerCountryIssue(
  _draft: LearnerProfileDraft,
  _port: LearnerProfilePort,
): "missing" | null {
  return null;
}

export function learnerProfilePreviewFor(
  _draft: LearnerProfileDraft,
  _port: LearnerProfilePort,
): LearnerProfilePreview {
  return { kind: "example", lines: [] };
}

/** 질의가 비었고 고른 나라가 있으면 그 줄을 맨 위로(중복 없이), 아니면 검색 결과 그대로. */
export function learnerCountryRowsOf(
  _port: LearnerProfilePort,
  _query: string,
  _selectedCode: string | null,
): readonly LearnerCountry[] {
  return [];
}

/** 검색 칸 아래 한 줄 — 질의가 비면 `allCountries(n)`, 결과 0이면 `noMatches`, 아니면 `matches(n)`. */
export function countrySearchHelper(
  _query: string,
  _count: number,
  _copy: LearnerProfileCopy,
): string {
  return "";
}

/** 낭독할 결과 수 — 질의가 비면 `null`, 결과 0이면 `noMatchesAnnouncement`, 아니면 `matches(n)`. */
export function countrySearchAnnouncement(
  _query: string,
  _count: number,
  _copy: LearnerProfileCopy,
): string | null {
  return null;
}

/** 설정 줄의 설명입니다. */
export function learnerProfileSummary(
  _record: LearnerProfileRecord | null,
  _sync: LearnerProfileSyncState,
  _port: LearnerProfilePort,
  _copy: LearnerProfileCopy,
): string {
  return "";
}

/**
 * 온보딩 마지막 스텝의 완료 판정입니다 — `ready` → 저장 · `empty` → 건너뜀 · `incomplete`와 `invalid` →
 * `null`(머문다).
 */
export function onboardingProfileOutcome(
  _status: LearnerProfileDraftStatus,
): LearnerProfileOutcome | null {
  return null;
}
