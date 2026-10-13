// 학습자 프로필의 순수 규칙입니다 — 이름 검증 · 기록 디코드 · 같음 판정 · 이벤트 만들기. 어느 스레드든
// 안전하고 한글 리터럴이 없습니다.

import type {
  LearnerCountry,
  LearnerNameResult,
  LearnerProfileEntry,
  LearnerProfilePort,
  LearnerProfileRecord,
  LearnerProfileSavedEvent,
  LearnerProfileSkippedEvent,
} from "./learner-profile.contract";
import type { LearnerCountryText } from "./placeholder-fill";

export const LEARNER_NAME_MAX_LENGTH = 30;

/** 자산이 아직 닫히지 않았을 때의 포트입니다 — 검색은 빈 목록, 조회는 `null`, 미리보기는 줄 없는 `example`. */
export const noLearnerProfilePort: LearnerProfilePort = {
  search: () => [],
  byCode: () => null,
  previewOf: () => ({ kind: "example", lines: [] }),
};

// 공백류(NBSP · 전각 공백 · 줄바꿈 · 줄 · 문단 구분자 포함)입니다 — 연속은 한 칸으로 접습니다.
const WHITESPACE_RUN = /\s+/g;
// 치환을 깨는 중괄호와 제어 문자(U+0000 ~ 001F · U+007F ~ 009F), 줄 · 문단 구분자입니다.
function isForbiddenNameUnit(code: number): boolean {
  return (
    code <= 0x1f ||
    (code >= 0x7f && code <= 0x9f) ||
    code === 0x2028 ||
    code === 0x2029 ||
    code === 0x7b ||
    code === 0x7d
  );
}

function hasForbiddenNameCharacter(name: string): boolean {
  for (let index = 0; index < name.length; index += 1) {
    if (isForbiddenNameUnit(name.charCodeAt(index))) return true;
  }
  return false;
}
const COUNTRY_CODE = /^[A-Z]{2}$/;

export function learnerNameFrom(input: string): LearnerNameResult {
  const name = input.replace(WHITESPACE_RUN, " ").trim();
  if (name === "") {
    return { ok: false, issue: "empty" };
  }
  if (hasForbiddenNameCharacter(name)) {
    return { ok: false, issue: "forbidden-character" };
  }
  if (Array.from(name).length > LEARNER_NAME_MAX_LENGTH) {
    return { ok: false, issue: "too-long" };
  }
  return { ok: true, name };
}

/** 대문자 라틴 두 글자인가입니다(표에 있는가는 보지 않습니다). */
export function isLearnerCountryCode(value: unknown): value is string {
  return typeof value === "string" && COUNTRY_CODE.test(value);
}

/** `{ name, countryCode }` 모양이고 두 칸 모두 규칙을 지키면 정규화된 기록, 아니면 `null`. 던지지 않습니다. */
export function learnerProfileRecordFrom(raw: unknown): LearnerProfileRecord | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return null;
  }
  const { name, countryCode } = raw as { name?: unknown; countryCode?: unknown };
  if (typeof name !== "string" || !isLearnerCountryCode(countryCode)) {
    return null;
  }
  const checked = learnerNameFrom(name);
  return checked.ok ? { name: checked.name, countryCode } : null;
}

export function sameLearnerProfile(
  a: LearnerProfileRecord | null,
  b: LearnerProfileRecord | null,
): boolean {
  if (a === null || b === null) {
    return a === b;
  }
  return a.name === b.name && a.countryCode === b.countryCode;
}

/** `previous`가 없으면 `created`, 있으면 `updated`. 값(이름 · 나라)은 싣지 않습니다. */
export function learnerProfileSavedEvent(
  entry: LearnerProfileEntry,
  previous: LearnerProfileRecord | null,
): LearnerProfileSavedEvent {
  return {
    name: "learner_profile_saved",
    entry,
    change: previous === null ? "created" : "updated",
  };
}

export function learnerProfileSkippedEvent(
  entry: Exclude<LearnerProfileEntry, "settings">,
): LearnerProfileSkippedEvent {
  return { name: "learner_profile_skipped", entry };
}

/** 문장에 서는 세 표기입니다 - 관사가 있으면 `en` 앞에 붙습니다. 나라 표(백그라운드 전용)를 값으로 들이지 않고도 쓰입니다. */
export function learnerCountryTextOf(country: LearnerCountry): LearnerCountryText {
  return {
    ko: country.ko,
    roman: country.roman,
    en: country.article === undefined ? country.en : `${country.article} ${country.en}`,
  };
}
