// 학습자 프로필(이름 · 나라)의 공유 타입입니다. 타입만 둡니다 — 구현은 `learner-profile.ts`(검증 · 디코드) ·
// `learner-profile-data.ts`(나라 표) · `learner-profile-api.ts`(서버) · `learner-profile-cache.ts`(기기 캐시)가
// 집니다.

/** 저장 단위입니다 — 이름과 나라가 **둘 다** 있거나 기록이 없습니다. `name`은 정규화된 값, `countryCode`는 대문자 두 글자입니다. */
export type LearnerProfileRecord = {
  readonly name: string;
  readonly countryCode: string;
};

export type LearnerNameIssue = "empty" | "too-long" | "forbidden-character";
export type LearnerNameResult =
  | { readonly ok: true; readonly name: string }
  | { readonly ok: false; readonly issue: LearnerNameIssue };

/** 저장한 자리입니다 — 가입 직후 이름 · 나라 화면, 또는 설정. */
export type LearnerProfileEntry = "signup" | "settings";
/** 기기 캐시가 서버와 맞았는가입니다. 기록이 없거나 로그인 전이면 `none`. */
export type LearnerProfileSyncState = "none" | "pending" | "synced";

/** 값(이름 · 나라)은 어떤 속성으로도 싣지 않습니다. */
export type LearnerProfileSavedEvent = {
  readonly name: "learner_profile_saved";
  readonly entry: LearnerProfileEntry;
  readonly change: "created" | "updated";
};
export type LearnerProfileOpenedEvent = { readonly name: "learner_profile_opened" };
export type LearnerProfileEvent = LearnerProfileSavedEvent | LearnerProfileOpenedEvent;

export type LoadLearnerProfilePath = "/rest/v1/rpc/load_learner_profile";
export type SaveLearnerProfilePath = "/rest/v1/rpc/save_learner_profile";
export type SaveLearnerProfileBody = {
  readonly p_name: string;
  readonly p_country_code: string;
};

/** 기기 캐시 한 칸입니다. `pending`은 서버가 아직 확인하지 않은 값입니다. */
export type LearnerProfileCacheEntry = {
  readonly record: LearnerProfileRecord;
  readonly sync: "pending" | "synced";
};

export type LearnerCountry = {
  /** ISO 3166-1 alpha-2 대문자(코소보만 사용자 지정 `XK`). */
  readonly code: string;
  readonly ko: string;
  /** 국어의 로마자 표기법, 소문자. */
  readonly roman: string;
  /** 목록 · 검색에 서는 영어 이름(관사 없음). */
  readonly en: string;
  /** 문장 안에서 앞에 서는 관사입니다. */
  readonly article?: "the";
  /** 검색 전용 다른 이름들(접힌 소문자). */
  readonly aliases?: readonly string[];
};

/** 미리보기 상자의 내용입니다. `example`은 견본 이름으로 만든 한 쌍, `yours`는 입력한 값으로 만든 한두 쌍입니다. */
export type LearnerProfilePreview = {
  readonly kind: "example" | "yours";
  readonly lines: readonly { readonly ko: string; readonly en: string }[];
};

/** 백그라운드가 닫아 만드는 포트입니다 — 화면 경로는 나라 표 · 치환기를 값으로 가져오지 않습니다. */
export type LearnerProfilePort = {
  /** 빈 질의면 전체(영어 이름 순). */
  readonly search: (query: string) => readonly LearnerCountry[];
  readonly byCode: (code: string) => LearnerCountry | null;
  /** `name`은 검증을 지난 값 또는 `null`입니다. */
  readonly previewOf: (
    name: string | null,
    country: LearnerCountry | null,
  ) => LearnerProfilePreview;
  /** 이름 칸에 미리 채울 무작위 이름입니다 — `previous`와 다른 값을 고릅니다. 자산이 닫히기 전이면 빈 문자열. */
  readonly randomName: (previous: string | null) => string;
};
