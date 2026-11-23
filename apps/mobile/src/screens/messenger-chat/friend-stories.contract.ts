// 친구 스토리(ADR-0178) 계약입니다 — 서버 스토리의 앱 쪽 모양 · 포트 · 문구표 · props · test-id. 타입만 둡니다.

import type { ChatRoomSummary } from "./chat-source.contract";
import type { LocalizedLine } from "./friend-catalog.contract";
import type { MineRowSlot, MyStoriesPort } from "./my-stories.contract";
import type { SuggestedFriend } from "./suggested-friends";

/** 스토리의 한국어 한 줄 — 한 줄은 번역하지 않고 뜻만 언어별로 둡니다(en 필수). */
export type FriendStoryLine = {
  readonly ko: string;
  readonly roman: string;
  readonly meaning: LocalizedLine;
};

/** 스토리의 단어 — 카탈로그 단어 카드의 `voca:` ref입니다. 글 · 뜻은 UI 언어 카탈로그에서 읽습니다. */
export type FriendStoryWord = { readonly episodeId: string; readonly ref: string };

/** 서버 `companion_friend_stories()`의 한 줄(ADR-0178 D2). 시각은 epoch ms. */
export type FriendStory = {
  readonly id: string;
  readonly characterId: string;
  readonly postedAt: number;
  readonly expiresAt: number;
  /** 버킷 상대 경로(`content/images/…`). 주소는 포트의 `imageUrl`이 만듭니다. */
  readonly imagePath: string;
  readonly line: FriendStoryLine;
  readonly word: FriendStoryWord | null;
  /** 답장 칩(한국어 0 ~ 3개). */
  readonly replies: readonly string[];
  /** 이 스토리의 첫 답장이 아직 무료인가 — 읽은 때의 안내 값이고 정본은 서버 판정입니다(D6). */
  readonly freeReply: boolean;
};

/** 본 스토리 표시 — 기기 저장(계정마다). 쓸 때 만료가 지난 표시는 지웁니다(ADR-0178 D3). */
export type StorySeenStore = {
  readonly seenIds: () => ReadonlySet<string>;
  readonly markSeen: (storyId: string, expiresAt: number, now: number) => void;
};

/** 카탈로그에서 찾은 단어 — 화면 언어의 뜻입니다. */
export type StoryWordInfo = {
  readonly ko: string;
  readonly roman: string;
  readonly meaning: string;
};

/** 단어장 포트(ADR-0169) — 없으면 단어 알약이 서지 않습니다. 던지지 않습니다. */
export type StoryWordPort = {
  /** 카탈로그(UI 언어)에 그 에피소드 · 단어가 없으면 null. */
  readonly lookup: (word: FriendStoryWord) => StoryWordInfo | null;
  readonly saved: (word: FriendStoryWord) => boolean;
  /** 단어장에 넣고 별표합니다(`withStarred`). */
  readonly save: (word: FriendStoryWord) => void;
};

/** 목록 화면이 받는 스토리 포트 — 없으면(손님 · 가짜 출처 · 옛 결선) 스토리가 없습니다. */
export type FriendStoriesPort = {
  /** 살아 있는 스토리 — 못 읽음 · 서버 없음은 null(스토리 없음과 같음). 던지지 않습니다. */
  readonly load: () => Promise<readonly FriendStory[] | null>;
  readonly imageUrl: (path: string) => string | null;
  readonly seen: StorySeenStore;
  readonly words?: StoryWordPort;
  /** 로마자를 보이는가(로마자 보기 설정) — 없으면 보입니다. */
  readonly romanization?: () => boolean;
  /** 내 스토리(ADR-0179) — 없으면 「+」가 서지 않습니다. */
  readonly mine?: MyStoriesPort;
};

/** 내 친구(열린 방)의 스토리 칸 — 본 것은 회색 고리. */
export type FriendStoryEntry = {
  readonly story: FriendStory;
  readonly room: ChatRoomSummary;
  readonly seen: boolean;
};

/** 안 만난 친구(추천 대상)의 스토리 칸 — 추가 길은 추천 친구 그대로(ADR-0162). */
export type UnmetStoryEntry = { readonly story: FriendStory; readonly friend: SuggestedFriend };

/** 스토리 줄(ADR-0178 D3): 친구 스토리 → 구분 선 → 안 만난 친구 스토리 → 그 밖의 추천 친구 → Find friends. */
export type StoryRow = {
  readonly friends: readonly FriendStoryEntry[];
  readonly unmet: readonly UnmetStoryEntry[];
  readonly others: readonly SuggestedFriend[];
};

/** 경과 시간 — 1분 미만 now, 1시간 미만 분, 그 밖 시간(내림). */
export type StoryAge =
  | { readonly unit: "now" }
  | { readonly unit: "m"; readonly value: number }
  | { readonly unit: "h"; readonly value: number };

export type StoryCloseReason = "completed" | "closed" | "back";

/** 보기 화면의 한 장 — 이름 · 얼굴은 대화 스냅숏의 방, 안 만난 친구는 추천 친구(소개 · 상태)를 함께 받습니다. */
export type StoryViewerItem = {
  readonly story: FriendStory;
  readonly name: string;
  readonly avatarUrl: string | null;
  readonly imageUrl: string | null;
  /** 안 만난 친구면 추천 친구(상태 · 소개), 내 친구면 null. */
  readonly unmet: SuggestedFriend | null;
};

/** 대화방의 스토리 인용(ADR-0178 D5) — 내 말풍선 위 카드. 서버 기록(`message_json.story`)에서도 다시 섭니다. */
export type ChatStoryQuote = {
  readonly storyId: string;
  readonly characterId: string;
  readonly line: string;
  /** 버킷 상대 경로 — 주소는 대화방의 해석기(`StoryImageContext`)가 만듭니다. 없으면 글만. */
  readonly imagePath: string | null;
  /** 올린 시각(ms) — 모르면 null(「Story」만). */
  readonly postedAt: number | null;
  /**
   * 무엇의 인용인가(ADR-0179) — 없거나 friend면 친구 스토리, mine이면 친구 반응에 답한 내 스토리(단어), deleted면 지운 내 스토리
   * (「Deleted story」).
   */
  readonly kind?: "friend" | "mine" | "deleted";
};

/** 보기 → 대화방 넘김(ADR-0178 D5). `text`가 있으면 곧바로 보내고, null이면 입력 줄 위 인용 띠로 붙입니다. */
export type StoryReplyHandoff = {
  readonly roomId: string;
  readonly quote: ChatStoryQuote;
  readonly text: string | null;
  /** 보기에서 본 무료 안내 값 — 이벤트용(정본은 서버). */
  readonly free: boolean;
};

/** `UiCopy.messengerChat.stories`. 인물 이름 · 한국어 한 줄은 그대로, 뜻은 스토리 데이터가 줍니다. */
export type FriendStoriesCopy = {
  readonly language: string;
  /** 낭독 조각 사이 구분자(감사 다국어 minor 9 — 컴포넌트가 「, 」를 박지 않게). */
  readonly listSeparator: string;
  /** 「머리: 본문」의 쌍점. */
  readonly labelSeparator: string;
  readonly rowTitle: string;
  readonly watchAll: string;
  readonly watchAllLabel: string;
  readonly age: (age: StoryAge) => string;
  readonly seen: string;
  readonly newBadge: string;
  readonly friendLabel: (name: string, age: string, seen: boolean) => string;
  readonly unmetLabel: (name: string) => string;
  readonly findFriends: string;
  readonly findFriendsLabel: string;
  readonly listPreview: (line: string) => string;
  readonly listRowLabel: (name: string, line: string) => string;
  readonly viewer: {
    readonly label: (name: string) => string;
    readonly progress: (index: number, count: number) => string;
    readonly pause: string;
    readonly play: string;
    readonly close: string;
    readonly previous: string;
    readonly next: string;
    readonly photoLabel: (name: string) => string;
    readonly saveWord: (ko: string, meaning: string) => string;
    readonly saveWordLabel: (ko: string, meaning: string) => string;
    readonly saved: (ko: string) => string;
    readonly freeReply: string;
    readonly replyPlaceholder: (name: string) => string;
    readonly replyChipLabel: (text: string) => string;
    readonly newFriend: string;
    readonly addAndReply: string;
    readonly seeHowToMeet: string;
  };
  readonly reply: {
    readonly caption: (name: string) => string;
    readonly storyMeta: (age: string | null) => string;
    readonly replying: (name: string) => string;
    readonly removeQuote: string;
  };
};

export type FriendStoriesRowProps = {
  readonly row: StoryRow;
  /** 내 스토리 칸(ADR-0179) — 「+」와, 살아 있는 내 스토리가 있으면 「Your story」. 꺼져 있으면 없음. */
  readonly mine?: MineRowSlot | null;
  readonly now: number;
  readonly onOpenFriend: (entry: FriendStoryEntry) => void;
  readonly onOpenUnmet: (entry: UnmetStoryEntry) => void;
  readonly onOpenSuggested: (friend: SuggestedFriend) => void;
  readonly onWatchAll: () => void;
  readonly onFindFriends: () => void;
};

export type StoryViewerProps = {
  readonly items: readonly StoryViewerItem[];
  readonly start: number;
  readonly now: number;
  /** 모션 줄이기(ADR-0053) — 진행 막대가 움직이지 않고 저절로 넘어가지 않습니다. */
  readonly reducedMotion: boolean;
  readonly romanization: boolean;
  readonly words?: StoryWordPort;
  /** 스토리 한 장이 섰을 때(본 것 표시 · 이벤트). */
  readonly onShown: (item: StoryViewerItem) => void;
  /** 답장 — 칩이면 그 말, 답장 칸이면 null. */
  readonly onReply: (item: StoryViewerItem, text: string | null) => void;
  readonly onSaveWord: (item: StoryViewerItem) => void;
  /** 안 만난 친구 — 추가하고 답장(추가 가능) 또는 프로필 시트(잠김). */
  readonly onMeet: (item: StoryViewerItem) => void;
  /** 닫힘 — 끝까지 넘김(completed) · 닫기 단추(closed) · 시스템 뒤로(back). */
  readonly onClose: (reason: StoryCloseReason) => void;
  /** 다음 탭으로 넘김(건너뜀 세기). */
  readonly onSkip?: () => void;
  /** 위에 시트가 떠 있는가 — 그동안 낭독에서 가리고 멈춥니다. */
  readonly covered?: boolean;
};

const fs = (suffix: string): string => `friend-stories-${suffix}`;
const sv = (suffix: string): string => `story-viewer-${suffix}`;

export const friendStoriesTestIds = {
  row: fs("row"),
  title: fs("title"),
  watchAll: fs("watch-all"),
  friend: (characterId: string) => fs(`friend-${characterId}`),
  unmet: (characterId: string) => fs(`unmet-${characterId}`),
  suggested: (characterId: string) => fs(`suggested-${characterId}`),
  divider: fs("divider"),
  findFriends: fs("find-friends"),
  viewer: sv("screen"),
  progress: sv("progress"),
  segment: (index: number) => sv(`segment-${index}`),
  name: sv("name"),
  age: sv("age"),
  pause: sv("pause"),
  close: sv("close"),
  image: sv("image"),
  previous: sv("previous"),
  next: sv("next"),
  line: sv("line"),
  roman: sv("roman"),
  meaning: sv("meaning"),
  word: sv("word"),
  free: sv("free"),
  chip: (index: number) => sv(`chip-${index}`),
  reply: sv("reply"),
  meetCard: sv("meet-card"),
  meet: sv("meet"),
  quote: "chat-story-quote",
  quoteBar: "chat-story-quote-bar",
  quoteBarRemove: "chat-story-quote-bar-remove",
} as const;

/** 목록 화면이 받는 스토리 포트입니다(없으면 스토리 없음 — 손님 · 테스트 · 옛 결선). */
export type FriendStoriesProps = { readonly stories?: FriendStoriesPort };
