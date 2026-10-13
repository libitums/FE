// 학습자 프로필 양식(미리보기 · 이름 칸 · 나라 줄 · 나라 고르기)의 props · 상태 · 문구 타입입니다. 타입만
// 둡니다 — 온보딩 넷째 스텝, 에피소드 전 화면, 설정 화면이 같은 조각을 씁니다.

import type { ReactNode } from "@lynx-js/react";

import type {
  LearnerCountry,
  LearnerNameIssue,
  LearnerProfilePreview,
  LearnerProfileRecord,
} from "../lib/learner-profile.contract";

export type LearnerProfileDraft = {
  readonly name: string;
  readonly countryCode: string | null;
  /** 양식과 나라 고르기는 같은 자리에서 갈아 섭니다. */
  readonly view: "form" | "picker";
  readonly query: string;
  /** 빈 칸이 있는 채 저장을 눌렀는가 — 그때만 빈 칸에 오류가 섭니다. 입력이 바뀌면 걷힙니다. */
  readonly incompleteNotice: "quiet" | "shown";
};

export type LearnerProfileDraftEvent =
  | { readonly type: "name-changed"; readonly value: string }
  | { readonly type: "picker-opened" }
  | { readonly type: "picker-closed" }
  | { readonly type: "query-changed"; readonly value: string }
  | { readonly type: "country-chosen"; readonly code: string }
  | { readonly type: "incomplete-noticed" };

/** 이름과 나라는 둘 다 있어야 저장됩니다 — `incomplete`는 한 칸만 찬 상태입니다. */
export type LearnerProfileDraftStatus =
  | { readonly kind: "ready"; readonly record: LearnerProfileRecord }
  | { readonly kind: "empty" }
  | { readonly kind: "incomplete"; readonly missing: "name" | "country" }
  | { readonly kind: "invalid"; readonly issue: Exclude<LearnerNameIssue, "empty"> };

export type LearnerProfileForm = {
  readonly draft: LearnerProfileDraft;
  /** 지금 이름 칸에 보일 오류입니다. 금지 문자 · 길이는 치는 즉시, 빈 값은 `noticeIncomplete()` 뒤에만. */
  readonly nameIssue: LearnerNameIssue | null;
  /** `nameIssue`가 이름 칸에 세울 문구입니다 — 빈 값의 문구는 진입점이 고른 `emptyMessage`입니다. */
  readonly nameIssueMessage: string | null;
  /** 나라 줄에 보일 오류입니다. 나라가 비었고 `noticeIncomplete()`를 부른 뒤에만. */
  readonly countryIssue: "missing" | null;
  readonly selectedCountry: LearnerCountry | null;
  readonly preview: LearnerProfilePreview;
  /** 나라 고르기의 줄입니다 — 질의가 비었고 고른 나라가 있으면 그 줄이 맨 위. */
  readonly rows: readonly LearnerCountry[];
  readonly onEvent: (event: LearnerProfileDraftEvent) => void;
  /** 지금 초안의 판정입니다. `invalid`면 그 오류를 한 번 낭독합니다. 상태를 바꾸지 않습니다. */
  readonly submit: () => LearnerProfileDraftStatus;
  /** 빈 칸이 있는 채 저장하려 했음을 드러내고 그 문구를 한 번 낭독합니다. */
  readonly noticeIncomplete: () => void;
};

export type LearnerProfileCopy = {
  readonly nameLabel: string;
  readonly nameIssue: Readonly<Record<LearnerNameIssue, string>>;
  /** 에피소드 전 묻기에서 빈 채 저장했을 때 — 건너뛰기를 함께 알립니다. */
  readonly nameEmptyOnGate: string;
  readonly countryLabel: string;
  readonly notSet: string;
  /** 이름은 찼는데 나라를 안 골랐을 때 나라 줄에 서는 오류입니다. */
  readonly countryMissing: string;
  readonly preview: {
    readonly heading: Readonly<Record<LearnerProfilePreview["kind"], string>>;
    /**
     * 상자 하나의 접근성 이름 — `You'll say: {ko}. Meaning: {en}`. 줄이 둘이면 호출자가 한국어 줄들과 영어
     * 줄들을 각각 이어 넘깁니다(문구표 함수는 원시 인자만 받습니다).
     */
    readonly label: (kind: LearnerProfilePreview["kind"], ko: string, en: string) => string;
  };
  readonly picker: {
    readonly title: string;
    readonly back: string;
    readonly searchLabel: string;
    readonly clearSearch: string;
    /** helper 줄 — `199 countries · search by English name` */
    readonly allCountries: (count: number) => string;
    readonly matches: (count: number) => string;
    readonly noMatches: string;
    readonly noMatchesAnnouncement: string;
    /** 줄에 보이는 글자 — `France · 프랑스` */
    readonly row: (en: string, ko: string) => string;
    readonly countrySet: (en: string) => string;
  };
  readonly gate: { readonly title: string; readonly body: string; readonly submit: string };
  readonly settings: {
    readonly title: string;
    readonly body: string;
    readonly submit: string;
    readonly saved: string;
  };
  /** 설정 줄의 설명 — `Emma · France` */
  readonly summary: {
    readonly both: (name: string, country: string) => string;
    readonly pending: (summary: string) => string;
  };
};

export type LearnerProfileFieldsProps = { readonly form: LearnerProfileForm };
export type LearnerCountryPickerProps = {
  readonly form: LearnerProfileForm;
  /** 머리 행 오른쪽 끝 자리입니다(에피소드 전 화면의 Skip). */
  readonly trailing?: ReactNode;
};
export type LearnerProfileFrameProps = {
  readonly form: LearnerProfileForm;
  /** 고정 머리 행(뒤로 · 건너뛰기)입니다. */
  readonly header: ReactNode;
  /** 고정 주 버튼 행입니다. */
  readonly footer: ReactNode;
  /** 스크롤 영역의 내용(제목 · 설명 · 양식)입니다. */
  readonly children: ReactNode;
};

export type LearnerProfileTestId =
  | "learner-profile-frame"
  | "learner-profile-scroll"
  | "learner-profile-fields"
  | "learner-profile-preview"
  | "learner-profile-preview-line"
  | "learner-profile-name"
  | "learner-profile-country-error"
  | "ui-lynx-settings-group-item-country"
  | "learner-country-picker"
  | "learner-country-picker-back"
  | "learner-country-picker-title"
  | "learner-country-picker-search"
  | "learner-country-picker-list"
  | `ui-lynx-option-selector-item-${string}`;
