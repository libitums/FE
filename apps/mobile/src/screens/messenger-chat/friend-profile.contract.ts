// 인물 프로필(사실 줄 · 목소리 견본 · 방 머리에서 열기 · 성인 확인) 계약입니다(ADR-0162 2026-11-19 추가 · ADR-0163 D4) — 문구표 · test-id.

/** `UiCopy.messengerChat.suggested.profile`. 이름 · 직업 · MBTI는 인물 데이터, 여기는 틀과 단추 말만. */
export type FriendProfileCopy = {
  /** 나이 — 28 → 「28」 앞뒤 말(언어마다). */
  readonly age: (years: number) => string;
  /** 바이블의 나이대(「30대」) — 30 → 「30s」. */
  readonly ageDecade: (decade: number) => string;
  /** 바이블의 범위(「25~26」). */
  readonly ageRange: (from: number, to: number) => string;
  /** 사실 줄 — 있는 조각만 이어 붙입니다(나이 · 직업 · MBTI). */
  readonly facts: (parts: readonly string[]) => string;
  /** 방에서 연 프로필(읽기 전용)의 닫기 단추. */
  readonly close: string;
  /** 방 머리 제목(인물 이름)의 낭독 — 누르면 프로필이 열립니다. */
  readonly openProfile: (name: string) => string;
  readonly voice: {
    readonly hear: string;
    readonly pause: string;
    readonly resume: string;
    readonly loading: string;
    /** 파일을 못 읽음 · 재생 모듈 없음 — 조용한 한 줄. */
    readonly unavailable: string;
    /** 단추 낭독 — 「<이름>의 목소리 듣기」. */
    readonly label: (name: string) => string;
  };
  /** 성인 확인 창(ADR-0163 D4) — 확인 · 취소 모두 친구를 추가합니다. */
  readonly adult: {
    readonly title: string;
    readonly body: (name: string) => string;
    readonly confirm: string;
    readonly cancel: string;
  };
};

/** 시트를 연 자리 — 분석 `friend_profile_opened.source`. */
export type FriendProfileSource = "row" | "directory" | "room";

const fp = (suffix: string): string => `friend-profile-${suffix}`;

export const friendProfileTestIds = {
  facts: fp("facts"),
  ai: fp("ai"),
  voice: fp("voice"),
  voiceNote: fp("voice-note"),
  close: fp("close"),
  /** 방 머리 제목 — 누르면 읽기 전용 프로필(ADR-0162 2026-11-19 추가). */
  roomTitle: fp("room-title"),
  adultDialog: fp("adult-dialog"),
} as const;
