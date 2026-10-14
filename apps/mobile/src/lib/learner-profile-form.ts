// 학습자 프로필 양식의 순수 로직입니다 — 초안 전이 · 판정 · 보일 오류 · 나라 줄 · 안내 줄 · 낭독 · 설정 요약.
// UI는 결과를 그리기만 합니다.

import type {
  LearnerProfileCopy,
  LearnerProfileDraft,
  LearnerProfileDraftEvent,
  LearnerProfileDraftStatus,
} from "../components/learner-profile.contract";
import { learnerNameFrom } from "./learner-profile";
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
  record: LearnerProfileRecord | null,
): LearnerProfileDraft {
  return {
    name: record?.name ?? "",
    countryCode: record?.countryCode ?? null,
    view: "form",
    query: "",
    incompleteNotice: "quiet",
  };
}

export function learnerProfileDraftReducer(
  draft: LearnerProfileDraft,
  event: LearnerProfileDraftEvent,
): LearnerProfileDraft {
  switch (event.type) {
    case "name-changed":
      return { ...draft, name: event.value, incompleteNotice: "quiet" };
    case "picker-opened":
      return { ...draft, view: "picker", query: "" };
    case "picker-closed":
      return { ...draft, view: "form", query: "" };
    case "query-changed":
      return draft.view === "picker" ? { ...draft, query: event.value } : draft;
    case "country-chosen":
      return {
        ...draft,
        countryCode: event.code,
        view: "form",
        query: "",
        incompleteNotice: "quiet",
      };
    case "incomplete-noticed":
      return draft.incompleteNotice === "shown" ? draft : { ...draft, incompleteNotice: "shown" };
  }
}

/** 표에 있는 나라만 나라로 칩니다 - 표에 없는 코드는 고르지 않은 것과 같습니다. */
function chosenCountry(
  draft: LearnerProfileDraft,
  port: LearnerProfilePort,
): LearnerCountry | null {
  return draft.countryCode === null ? null : port.byCode(draft.countryCode);
}

/** 이름과 나라가 둘 다 있어야 `ready`입니다. 이름이 규칙을 어기면 나라와 무관하게 `invalid`. */
export function learnerProfileDraftStatus(
  draft: LearnerProfileDraft,
  port: LearnerProfilePort,
): LearnerProfileDraftStatus {
  const named = learnerNameFrom(draft.name);
  if (!named.ok && named.issue !== "empty") {
    return { kind: "invalid", issue: named.issue };
  }
  const country = chosenCountry(draft, port);
  if (named.ok && country !== null) {
    return { kind: "ready", record: { name: named.name, countryCode: country.code } };
  }
  if (named.ok) {
    return { kind: "incomplete", missing: "country" };
  }
  return country === null ? { kind: "empty" } : { kind: "incomplete", missing: "name" };
}

export function visibleLearnerNameIssue(
  draft: LearnerProfileDraft,
  _port: LearnerProfilePort,
): LearnerNameIssue | null {
  const named = learnerNameFrom(draft.name);
  if (named.ok) return null;
  return named.issue !== "empty" || draft.incompleteNotice === "shown" ? named.issue : null;
}

export function visibleLearnerCountryIssue(
  draft: LearnerProfileDraft,
  port: LearnerProfilePort,
): "missing" | null {
  return draft.incompleteNotice === "shown" && chosenCountry(draft, port) === null
    ? "missing"
    : null;
}

export function learnerProfilePreviewFor(
  draft: LearnerProfileDraft,
  port: LearnerProfilePort,
): LearnerProfilePreview {
  const named = learnerNameFrom(draft.name);
  return port.previewOf(named.ok ? named.name : null, chosenCountry(draft, port));
}

/** 질의가 비었고 고른 나라가 있으면 그 줄을 맨 위로(중복 없이), 아니면 검색 결과 그대로. */
export function learnerCountryRowsOf(
  port: LearnerProfilePort,
  query: string,
  selectedCode: string | null,
): readonly LearnerCountry[] {
  const rows = port.search(query);
  const selected = query.trim() === "" && selectedCode !== null ? port.byCode(selectedCode) : null;
  return selected === null
    ? rows
    : [selected, ...rows.filter((country) => country.code !== selected.code)];
}

/** 검색 칸 아래 한 줄 - 질의가 비면 `allCountries(n)`, 결과 0이면 `noMatches`, 아니면 `matches(n)`. */
export function countrySearchHelper(
  query: string,
  count: number,
  copy: LearnerProfileCopy,
): string {
  if (query.trim() === "") return copy.picker.allCountries(count);
  return count === 0 ? copy.picker.noMatches : copy.picker.matches(count);
}

/** 낭독할 결과 수 - 질의가 비면 `null`, 결과 0이면 `noMatchesAnnouncement`, 아니면 `matches(n)`. */
export function countrySearchAnnouncement(
  query: string,
  count: number,
  copy: LearnerProfileCopy,
): string | null {
  if (query.trim() === "") return null;
  return count === 0 ? copy.picker.noMatchesAnnouncement : copy.picker.matches(count);
}

/** 설정 줄의 설명입니다. 표에 없는 나라 코드는 드러내지 않고 `notSet`으로 보입니다. */
export function learnerProfileSummary(
  record: LearnerProfileRecord | null,
  sync: LearnerProfileSyncState,
  port: LearnerProfilePort,
  copy: LearnerProfileCopy,
): string {
  if (record === null) return copy.notSet;
  const country = port.byCode(record.countryCode);
  const summary = copy.summary.both(record.name, country === null ? copy.notSet : country.en);
  return sync === "pending" ? copy.summary.pending(summary) : summary;
}

/**
 * 온보딩 마지막 스텝의 완료 판정입니다 - `ready` -> 저장 · `empty` -> 건너뜀 · `incomplete`와 `invalid` ->
 * `null`(머문다).
 */
export function onboardingProfileOutcome(
  status: LearnerProfileDraftStatus,
): LearnerProfileOutcome | null {
  if (status.kind === "ready") return { kind: "saved", record: status.record };
  return status.kind === "empty" ? { kind: "skipped" } : null;
}
