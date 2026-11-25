// 친구 스토리 포트의 결선입니다(ADR-0178). 읽기는 진입점이 끼운 서버 대화 포트(`companion_friend_stories`, 추천 친구와 같은 포트),
// 본 것은 계정마다 기기 저장, 단어는 UI 언어 카탈로그에서 찾고 저장은 별표 단어장(ADR-0169). 배경 전용 라이브러리를 값으로 가져오지 않습니다.

import type { CatalogEntry } from "../lib/episode-catalog";
import { isStarredIn, withStarred } from "../lib/wordbook";
import type {
  FriendStoriesPort,
  FriendStoryWord,
  StoryReplyPlan,
  StorySeenStore,
  StoryWordPort,
} from "../screens/messenger-chat/friend-stories.contract";
import { deviceKeyboardHeightStore } from "../screens/messenger-chat/chat-local-stores";
import { deviceStorySeenStore } from "../screens/messenger-chat/friend-story-seen-store";
import { loadCurrentWordbook, todayLocal, updateCurrentWordbook } from "./learning-trail-port";
import { sourceKey } from "./messenger-chat-wiring";
import { companionServerRemote } from "./suggested-friends-wiring";
import { catalogWordOf } from "./wordbook-entries";

export type FriendStoriesWiringArgs = {
  readonly imageUrlOf: (path: string) => string | null;
  /** UI 언어로 바꾼 카탈로그 — 부를 때마다 지금 것을 읽습니다. */
  readonly catalog: () => readonly CatalogEntry[];
  readonly romanization?: () => boolean;
  /** 보기 답장의 앱 관문 재료(체험 · 등급, D5 개정) — 없으면 앱 관문 없이 보냅니다. */
  readonly replyPlan?: StoryReplyPlan;
};

export type FriendStoriesTestStores = {
  readonly seen: StorySeenStore;
  readonly saveWord: (word: FriendStoryWord) => void;
  readonly isWordSaved: (word: FriendStoryWord) => boolean;
};

let testStores: FriendStoriesTestStores | null = null;
let latest: FriendStoriesWiringArgs | null = null;
let cachedPort: FriendStoriesPort | null = null;
let seenStores = new Map<string, StorySeenStore>();

/** 테스트가 본 것 · 단어장을 메모리로 끼웁니다(null = 기기 저장). */
export function setFriendStoriesStoresForTests(stores: FriendStoriesTestStores | null): void {
  testStores = stores;
  cachedPort = null;
  seenStores = new Map();
}

/** 본 것 저장 — 계정마다 하나를 실행 동안 들고 있습니다(쓸 때마다 다시 읽지 않게). */
function seenStore(): StorySeenStore {
  if (testStores !== null) return testStores.seen;
  const key = sourceKey();
  let store = seenStores.get(key);
  if (store === undefined) {
    store = deviceStorySeenStore(key);
    seenStores.set(key, store);
  }
  return store;
}

const wordsPort: StoryWordPort = {
  lookup: (word) => catalogWordOf(latest?.catalog() ?? [], word.episodeId, word.ref),
  saved: (word) => {
    if (testStores !== null) return testStores.isWordSaved(word);
    return isStarredIn(loadCurrentWordbook(), word.episodeId, word.ref);
  },
  save: (word) => {
    if (testStores !== null) return testStores.saveWord(word);
    updateCurrentWordbook((book) =>
      withStarred(book, word.episodeId, word.ref, true, todayLocal()),
    );
  },
};

async function loadStories() {
  try {
    return (await companionServerRemote()?.stories?.list()) ?? null;
  } catch {
    return null;
  }
}

/**
 * 목록 결선이 렌더마다 부릅니다 — **같은 객체 · 같은 함수**를 돌려줍니다(효과가 렌더마다 다시 돌지 않게, 추천 친구 리뷰 #503과 같은 이유).
 * 그림 해석기 · 카탈로그는 부를 때마다 최신으로 갈아 끼웁니다(첫 렌더의 빈 콘텐츠를 쥐지 않게).
 */
export function friendStoriesPort(args: FriendStoriesWiringArgs): FriendStoriesPort {
  latest = args;
  if (cachedPort !== null) return cachedPort;
  cachedPort = {
    load: loadStories,
    imageUrl: (path) => latest?.imageUrlOf(path) ?? null,
    seen: {
      seenIds: () => seenStore().seenIds(),
      markSeen: (id, expiresAt, now) => seenStore().markSeen(id, expiresAt, now),
    },
    words: wordsPort,
    romanization: () => latest?.romanization?.() ?? true,
    replyPlan: () => latest?.replyPlan ?? null,
    keyboardHeightStore: deviceKeyboardHeightStore,
  };
  return cachedPort;
}
