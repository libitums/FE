// 학습자 프로필 독립 화면 넷(가입 직후 ① 이름 · ② 나라 · ④ 출생 연도, 설정)의 props · testid 타입입니다. 타입만 둡니다.

import type { LearnerProfilePort, LearnerProfileRecord } from "../../lib/learner-profile.contract";

/** 가입 직후 ① 이름 — 미리 채운 이름(지난 값 · 소셜 이름 · 무작위)으로 섭니다. */
export type LearnerNameScreenProps = {
  readonly initialName: string;
  readonly port: LearnerProfilePort;
  /** 이름 규칙을 지난 정규화된 이름입니다. */
  readonly onContinue: (name: string) => void;
  readonly onBack: () => void;
  /** 가입 흐름 단계 수 — 회원은 넷(④ 출생 연도까지), 비회원은 셋(ADR-0059 개정 2026-11-27). 기본 4. */
  readonly stepCount?: number;
};

/** 가입 직후 ② 나라 — ①에서 정한 이름과 고른 나라를 한 기록으로 냅니다. */
export type LearnerCountryScreenProps = {
  readonly learnerName: string;
  readonly initialCountryCode: string | null;
  readonly port: LearnerProfilePort;
  readonly onContinue: (record: LearnerProfileRecord) => void;
  readonly onBack: () => void;
  /** 가입 흐름 단계 수 — 회원은 넷(④ 출생 연도까지), 비회원은 셋(ADR-0059 개정 2026-11-27). 기본 4. */
  readonly stepCount?: number;
};

/** 가입 직후 ④ 출생 연도(ADR-0059 개정 2026-11-27) — 미리 고른 연도 없이 서고, 고른 연도를 냅니다. 건너뛰기는 없습니다. */
export type LearnerBirthYearScreenProps = {
  readonly onContinue: (year: number) => void;
  readonly onBack: () => void;
};

export type LearnerProfileSettingsScreenProps = {
  readonly record: LearnerProfileRecord | null;
  readonly port: LearnerProfilePort;
  readonly onSubmit: (record: LearnerProfileRecord) => void;
  readonly onExit: () => void;
};

export type LearnerProfileScreenTestId =
  | "learner-name-screen"
  | "learner-name-screen-back"
  | "learner-name-screen-title"
  | "learner-name-screen-field"
  | "learner-name-screen-shuffle"
  | "learner-name-screen-preview"
  | "learner-name-screen-next"
  | "learner-country-screen"
  | "learner-country-screen-back"
  | "learner-country-screen-title"
  | "learner-country-screen-search"
  | "learner-country-screen-count"
  | "learner-country-screen-list"
  | `learner-country-screen-letter-${string}`
  | "learner-country-screen-jump"
  | `learner-country-screen-jump-${string}`
  | "learner-country-screen-error"
  | "learner-country-screen-preview"
  | "learner-country-screen-next"
  | "learner-birth-year-screen"
  | "learner-birth-year-screen-back"
  | "learner-birth-year-screen-title"
  | "learner-birth-year-screen-list"
  | `learner-birth-year-screen-row-${number}`
  | "learner-birth-year-screen-next"
  | "learner-profile-screen"
  | "learner-profile-screen-back"
  | "learner-profile-screen-title"
  | "learner-profile-screen-submit";
