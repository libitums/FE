// 추천 친구 줄 · 프로필 시트 · 친구 찾기 화면 계약입니다(ADR-0162) — 문구표 · props · test-id.

import type { ChoiceRomanization } from "../../lib/session-options";
import type { FriendProfile, SuggestedFriendsPort } from "./friend-catalog.contract";

/** 문구의 대명사 — 인물 데이터의 `gender`, 없으면 null. */
export type FriendGender = "female" | "male" | null;
import type { DirectoryFilter, DirectoryRow } from "./friend-directory";
import type { SuggestedFriend } from "./suggested-friends";

/** `UiCopy.messengerChat.suggested`. 인물 이름은 한글 그대로, 소개 · 태그는 인물 데이터(`LocalizedLine`)가 줍니다. */
export type SuggestedFriendsCopy = {
  /** 이 표의 언어 — 인물 소개 · 태그 · 카테고리(`LocalizedLine`)의 칸을 고릅니다. */
  readonly language: string;
  readonly rowTitle: string;
  readonly seeAll: string;
  readonly seeAllLabel: string;
  readonly newLabel: (name: string) => string;
  readonly lockedLabel: (name: string, episode: number) => string;
  readonly earlyLabel: (name: string, episode: number, price: number) => string;
  readonly sheetLabel: (name: string) => string;
  readonly newBadge: string;
  readonly startChatting: string;
  readonly notNow: string;
  /** 시트 이름 아래 — 「You'll meet in Episode 17」. */
  readonly meetIn: (episode: number) => string;
  readonly lockedInfo: (name: string) => string;
  readonly chatNow: (price: number) => string;
  /** 먼저 만나기 단추의 낭독 이름 — 값(엽전) · 한정 · 남은 기간(있을 때만). */
  readonly earlyButtonLabel: (
    price: number,
    left: { readonly days: number; readonly hours: number } | null,
  ) => string;
  readonly launchSpecial: (name: string) => string;
  readonly limited: string;
  readonly limitedUntil: (days: number, hours: number) => string;
  readonly added: (name: string) => string;
  readonly addFailed: (name: string) => string;
  /** 프로필 시트 목소리 견본(ADR-0198 D2) — 단추 셋(처음 · 재생 중 · 멈춰 둠) · 자리마다 낭독 이름 · 못 읽음 줄. */
  readonly voice: {
    readonly hear: string;
    readonly pause: string;
    readonly resume: string;
    readonly label: (name: string, phase: "idle" | "playing" | "paused") => string;
    readonly unavailable: string;
  };
  /**
   * 「Get closer」 시트(ADR-0164 D4, 디자인 B1 SoftSheet). 문구 규칙(사용자 결정 2026-11-19): 어느 언어에서도 로맨스 · 성인 · 18+ ·
   * 생년을 말하지 않습니다. `gender`는 인물 데이터의 대명사(없으면 대명사 없는 문구).
   */
  readonly adultAck: {
    readonly title: (name: string) => string;
    readonly body: (gender: FriendGender) => string;
    readonly safe: string;
    readonly casual: (gender: FriendGender) => string;
    readonly confirm: string;
    readonly decline: string;
  };
  readonly directory: {
    readonly title: string;
    readonly back: string;
    readonly all: string;
    readonly fromStory: string;
    readonly sectionStory: string;
    readonly sectionNew: string;
    readonly chat: string;
    readonly chatLabel: (name: string) => string;
    readonly added: string;
    readonly addedLabel: (name: string) => string;
    readonly earlyLabel: (name: string, price: number) => string;
    /** 먼저 만나기가 꺼졌을 때 잠긴 줄 동작 알약 — 「Ep. 17」. */
    readonly locked: (episode: number) => string;
    readonly lockedLabel: (name: string, episode: number) => string;
    /** 잠긴 줄 둘째 줄 — 「Meet in Episode 17」. */
    readonly meetIn: (episode: number) => string;
    readonly moreComing: string;
    readonly chipLabel: (label: string, selected: boolean) => string;
  };
};

/**
 * 시트가 그리는 인물 — 추천 줄 · 친구 찾기 어느 쪽에서 열려도 같은 모양입니다. `added`는 이미 친구(열린 방)인 인물 — 스토리 보기의
 * 아바타에서 열리고(ADR-0178), 「Start chatting」이 그 방을 엽니다(NEW 배지 없음).
 */
export type SuggestedFriendSheetModel = {
  readonly character: FriendProfile;
  readonly avatarUrl: string | null;
  readonly status: "addable" | "locked" | "added";
  readonly offer: SuggestedFriend["offer"];
};

export type SuggestedFriendSheetProps = {
  readonly model: SuggestedFriendSheetModel;
  readonly now: number;
  /**
   * 목소리 견본의 재생 주소(ADR-0198) — 결선이 인물의 `voiceSamplePath`를 아바타와 같은 해석기로 푼 값. 단추는 인물에 견본이 있고
   * 잠기지 않았을 때 서고, 주소가 없으면(null · 생략) 누를 때 못 읽음 줄을 보입니다.
   */
  readonly voiceSampleUrl?: string | null;
  /** 로마자 스위치(ADR-0188) — 견본 대본 아래 줄을 고릅니다. 생략하면 hidden(뜻 한 줄). */
  readonly romanization?: ChoiceRomanization;
  /**
   * 아래 단추 줄(ADR-0178 개정 ⟨대화방⟩) — `offer`(기본)는 Start chatting · Chat now + Not now, `close`는 대화방에서 연 시트라 행동
   * 단추 없이 Close 하나. 막 탭 · 끌어내림 · 뒤로가기는 어느 쪽이든 `onClose`입니다.
   */
  readonly actions?: "offer" | "close";
  readonly onStart: () => void;
  readonly onEarly: () => void;
  readonly onClose: () => void;
};

/** 「Get closer」 시트(ADR-0164 D4) — Sounds good = 동의 후 추가, Just friends for now = 동의 없이 추가, 막 탭 · 뒤로가기 = 닫기만. */
export type AdultAckSheetProps = {
  readonly name: string;
  readonly avatarUrl: string | null;
  readonly gender: FriendGender;
  readonly onConfirm: () => void;
  readonly onDecline: () => void;
  readonly onClose: () => void;
};

export type SuggestedFriendsRowProps = {
  readonly friends: readonly SuggestedFriend[];
  readonly onOpen: (friend: SuggestedFriend) => void;
  readonly onSeeAll: () => void;
};

export type FriendDirectoryScreenProps = {
  readonly chips: readonly DirectoryFilter[];
  readonly filter: DirectoryFilter;
  readonly story: readonly DirectoryRow[];
  readonly general: readonly DirectoryRow[];
  readonly categoryLabel: (id: string) => string;
  readonly onFilter: (filter: DirectoryFilter) => void;
  readonly onOpen: (row: DirectoryRow) => void;
  readonly onBack: () => void;
  /** 위에 시트가 떠 있는가 — 그동안 이 화면을 낭독에서 가립니다(ADR-0016 D9). */
  readonly covered?: boolean;
};

/** 목록 화면이 받는 추천 친구 포트입니다(없으면 줄이 없음 — 테스트 · 옛 결선). */
export type SuggestedFriendsProps = { readonly friends?: SuggestedFriendsPort };

const sf = (suffix: string): string => `suggested-friends-${suffix}`;
const fd = (suffix: string): string => `friend-directory-${suffix}`;

export const suggestedFriendsTestIds = {
  row: sf("row"),
  title: sf("title"),
  seeAll: sf("see-all"),
  avatar: (id: string) => sf(`avatar-${id}`),
  sheet: sf("sheet"),
  sheetName: sf("sheet-name"),
  sheetIntro: sf("sheet-intro"),
  sheetTags: sf("sheet-tags"),
  sheetOpening: sf("sheet-opening"),
  sheetVoice: sf("sheet-voice"),
  sheetVoiceUnavailable: sf("sheet-voice-unavailable"),
  sheetInfo: sf("sheet-info"),
  sheetStart: sf("sheet-start"),
  sheetEarly: sf("sheet-early"),
  sheetLimited: sf("sheet-limited"),
  sheetLater: sf("sheet-later"),
  sheetClose: sf("sheet-close"),
  toast: sf("toast"),
  adultAck: sf("adult-ack"),
  adultAckConfirm: sf("adult-ack-confirm"),
  adultAckDecline: sf("adult-ack-decline"),
} as const;

export const friendDirectoryTestIds = {
  screen: fd("screen"),
  back: fd("back"),
  chip: (key: string) => fd(`chip-${key}`),
  sectionStory: fd("section-story"),
  sectionGeneral: fd("section-general"),
  row: (id: string) => fd(`row-${id}`),
  action: (id: string) => fd(`action-${id}`),
  more: fd("more"),
} as const;
