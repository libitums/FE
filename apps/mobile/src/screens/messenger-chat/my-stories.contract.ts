// 내 스토리(ADR-0179) 계약입니다 — 단어 · 레슨 카드로 올리는 내 스토리의 앱 쪽 모양 · 포트 · props · test-id. 타입만 둡니다.
// 사진은 없습니다(1단계). 친구(AI 인물)만 보고, 친구에게는 24시간, 내 보관함에는 지울 때까지 남습니다(설정 스위치).

import type { FriendStoryWord } from "./friend-stories.contract";

/** 내 스토리의 종류 — 단어장 단어(`word`) · 레슨 카드(`card`). */
export type MyStoryKind = "word" | "card";

/** 카드의 예문 — 한국어는 그대로, 뜻은 올린 때의 화면 언어입니다. */
export type MyStoryExample = { readonly ko: string; readonly meaning: string };

/** 친구 반응(서버가 LLM으로 만들고 몇 분 ~ 몇 시간에 걸쳐 도착). 한국어 글에는 붙인 단어가 들어 있습니다. */
export type MyStoryReaction = {
  readonly id: string;
  readonly characterId: string;
  readonly text: string;
  /** 올린 사람 화면 언어의 뜻 — 못 만들었으면 null. */
  readonly meaning: string | null;
  readonly at: number;
};

/** 서버 `companion_my_stories()`의 한 줄. 시각은 epoch ms. */
export type MyStory = {
  readonly id: string;
  readonly kind: MyStoryKind;
  readonly word: FriendStoryWord;
  readonly ko: string;
  readonly roman: string;
  readonly meaning: string;
  readonly example: MyStoryExample | null;
  readonly postedAt: number;
  readonly expiresAt: number;
  readonly reactions: readonly MyStoryReaction[];
};

/** 내 스토리 읽기 — `enabled`가 거짓이면(서버 스위치 off · 시험 계정 아님) 「+」 동그라미도 서지 않습니다. */
export type MyStoriesState = {
  readonly enabled: boolean;
  /** 24시간 뒤에도 내 보관함에 남기는가(설정 › My stories). */
  readonly keep: boolean;
  readonly stories: readonly MyStory[];
};

/** 올릴 거리 하나 — 단어장 단어 또는 레슨 카드. 뜻 · 예문은 화면 언어입니다. */
export type MyStoryChoice = {
  readonly key: string;
  readonly kind: MyStoryKind;
  readonly word: FriendStoryWord;
  readonly ko: string;
  readonly roman: string;
  readonly meaning: string;
  readonly example: MyStoryExample | null;
  /** 어디서 왔는가 — 레슨 이름(카드 묶음 · 단어 줄의 둘째 줄). */
  readonly source: string;
};

/** 레슨 카드 묶음 — 에피소드마다(거르기 칩). */
export type LessonCardGroup = {
  readonly episodeId: string;
  readonly title: string;
  readonly cards: readonly MyStoryChoice[];
};

export type MyStoryChoices = {
  readonly words: readonly MyStoryChoice[];
  readonly cards: readonly LessonCardGroup[];
};

/** 올리기 요청 — `clientId`가 같으면 서버가 한 번만 올립니다(두 번 눌러도 하나). */
export type MyStoryDraft = {
  readonly clientId: string;
  readonly kind: MyStoryKind;
  readonly word: FriendStoryWord;
  readonly ko: string;
  readonly roman: string;
  readonly meaning: string;
  readonly example: MyStoryExample | null;
  readonly lang: string;
};

export type MyStoryPostResult =
  | { readonly result: "ok"; readonly story: MyStory }
  | { readonly result: "off" | "daily_limit" | "failed" };

/** 내 스토리 포트 — 서버 RPC · 고를 거리 · 처음 안내 표시. 어떤 호출도 던지지 않습니다. */
export type MyStoriesPort = {
  /** 못 읽음 · 서버 없음은 null(「+」 없음). */
  readonly load: () => Promise<MyStoriesState | null>;
  readonly post: (draft: MyStoryDraft) => Promise<MyStoryPostResult>;
  /** 하나(id) 또는 모두(null) 지움 — 성공이면 true. */
  readonly remove: (storyId: string | null) => Promise<boolean>;
  /** 보관 스위치 — 바뀐 값, 못 바꾸면 null. */
  readonly setKeep: (keep: boolean) => Promise<boolean | null>;
  /** 단어장 · 레슨 카드(화면 언어). 부를 때마다 지금 것을 읽습니다. */
  readonly choices: () => MyStoryChoices;
  /** 처음 안내를 본 적이 있는가(계정마다 기기 저장). */
  readonly guideSeen: () => boolean;
  readonly markGuideSeen: () => void;
  /** 본 반응 id(계정마다 기기 저장) — 「Your story」 고리 판정. */
  readonly seenReactions: () => ReadonlySet<string>;
  readonly markReactionsSeen: (ids: readonly string[], until: number) => void;
  readonly newClientId: () => string;
  /** 이번 실행에 읽은 서버가 켜져 있었는가 — 설정의 「My stories」 줄. 없으면 false. */
  readonly knownEnabled?: () => boolean;
};

/** 스토리 줄 맨 앞의 내 스토리 칸(ADR-0179) — 「+」(만들기)와, 살아 있는 내 스토리가 있으면 「Your story」. */
export type MineRowSlot = {
  readonly live: MyStory | null;
  /** 살아 있는 내 스토리에 안 본 반응이 있는가 — 주황 고리. */
  readonly unseen: boolean;
  readonly onCreate: () => void;
  readonly onOpen: () => void;
};

/** 친구 얼굴 · 이름(대화방 스냅숏) — 반응 줄에 씁니다. */
export type ReactionFace = { readonly name: string; readonly avatarUrl: string | null };

const ms = (suffix: string): string => `my-stories-${suffix}`;

export const myStoriesTestIds = {
  create: ms("create"),
  mine: ms("mine"),
  guide: ms("guide"),
  guideStart: ms("guide-start"),
  guideLater: ms("guide-later"),
  composer: ms("composer"),
  composerClose: ms("composer-close"),
  tab: (kind: MyStoryKind) => ms(`tab-${kind}`),
  choice: (key: string) => ms(`choice-${key}`),
  filter: (episodeId: string) => ms(`filter-${episodeId}`),
  filterAll: ms("filter-all"),
  empty: ms("empty"),
  share: ms("share"),
  composerError: ms("composer-error"),
  viewer: ms("viewer"),
  viewerClose: ms("viewer-close"),
  viewerMenu: ms("viewer-menu"),
  viewerDelete: ms("viewer-delete"),
  card: ms("card"),
  cardKo: ms("card-ko"),
  reactions: ms("reactions"),
  reaction: (id: string) => ms(`reaction-${id}`),
  answer: (id: string) => ms(`answer-${id}`),
  waiting: ms("waiting"),
  deleteDialog: ms("delete-dialog"),
  archive: ms("archive"),
  archiveBack: ms("archive-back"),
  keep: ms("keep"),
  count: ms("count"),
  tile: (id: string) => ms(`tile-${id}`),
  tileDelete: (id: string) => ms(`tile-delete-${id}`),
  deleteAll: ms("delete-all"),
  archiveEmpty: ms("archive-empty"),
  settingsRow: "settings-my-stories",
} as const;
