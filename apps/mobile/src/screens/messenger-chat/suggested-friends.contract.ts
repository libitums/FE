// 추천 친구 줄 · 프로필 시트 · 친구 찾기 화면 계약입니다(ADR-0162) — 문구표 · props · test-id.

import type { FriendProfile, SuggestedFriendsPort } from "./friend-catalog.contract";
import type { DirectoryFilter, DirectoryRow } from "./friend-directory";
import type { SuggestedFriend } from "./suggested-friends";

/** `UiCopy.messengerChat.suggested`. 인물 이름은 한글 그대로, 소개 · 태그는 인물 데이터(`LocalizedLine`)가 줍니다. */
export type SuggestedFriendsCopy = {
  /** 이 표의 언어 — 인물 소개 · 태그 · 카테고리(`LocalizedLine`)의 칸을 고릅니다. */
  readonly language: string;
  readonly rowTitle: string;
  readonly seeAll: string;
  readonly seeAllLabel: string;
  /** 줄 아바타 아래 검은 꼬리표 — 「EARLY · 100」. */
  readonly earlyTag: (price: number) => string;
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
  readonly launchSpecial: (name: string) => string;
  readonly limited: string;
  readonly limitedUntil: (days: number, hours: number) => string;
  readonly added: (name: string) => string;
  readonly addFailed: (name: string) => string;
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

/** 시트가 그리는 인물 — 추천 줄 · 친구 찾기 어느 쪽에서 열려도 같은 모양입니다. */
export type SuggestedFriendSheetModel = {
  readonly character: FriendProfile;
  readonly avatarUrl: string | null;
  readonly status: "addable" | "locked";
  readonly offer: SuggestedFriend["offer"];
};

export type SuggestedFriendSheetProps = {
  readonly model: SuggestedFriendSheetModel;
  readonly now: number;
  readonly onStart: () => void;
  readonly onEarly: () => void;
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
  early: (id: string) => sf(`early-${id}`),
  sheet: sf("sheet"),
  sheetName: sf("sheet-name"),
  sheetIntro: sf("sheet-intro"),
  sheetTags: sf("sheet-tags"),
  sheetOpening: sf("sheet-opening"),
  sheetInfo: sf("sheet-info"),
  sheetStart: sf("sheet-start"),
  sheetEarly: sf("sheet-early"),
  sheetLimited: sf("sheet-limited"),
  sheetLater: sf("sheet-later"),
  toast: sf("toast"),
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
