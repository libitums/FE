// 내 스토리 포트의 결선입니다(ADR-0194). 서버는 대화 원격(`companion_my_stories` …), 고를 거리는 단어장 + UI 언어 카탈로그, 처음 안내 · 본 반응은
// 계정마다 기기 저장(본 반응은 친구 스토리 본 것 저장과 같은 곳 — id가 겹치지 않습니다). 배경 전용 라이브러리를 값으로 가져오지 않습니다.

import type { CatalogEntry } from "../lib/episode-catalog";
import { purchaseStore } from "../lib/purchase-intent";
import { getItem, setItem } from "../lib/storage";
import { uuidV4 } from "../screens/messenger-chat/chat-remote-notes";
import type { StorySeenStore } from "../screens/messenger-chat/friend-stories.contract";
import type { MyStoriesPort } from "../screens/messenger-chat/my-stories.contract";
import type { MyStoryPhotoPort } from "../screens/messenger-chat/my-story-photo.contract";
import { discardStoryPhoto, pickStoryPhoto, storyPhotosAvailable } from "../lib/story-photo";
import { tzOffsetMinOf } from "../screens/messenger-chat/my-stories";
import { loadCurrentWordbook, todayLocal } from "./learning-trail-port";
import { myStoryChoicesOf } from "./my-stories-choices";
import { companionServerRemote } from "./suggested-friends-wiring";

const regionOf = (code: string | null): string | null =>
  code !== null && /^[A-Z]{2}$/.test(code) ? code : null;

/** `{ <출처 키>: true }` — 처음 안내를 본 계정. */
export const MY_STORY_GUIDE_KEY = "libitum.myStories.guideSeen";

function guideSeenFor(accountKey: string): boolean {
  try {
    const raw = getItem(MY_STORY_GUIDE_KEY);
    const parsed = raw === null ? null : (JSON.parse(raw) as unknown);
    return (
      typeof parsed === "object" &&
      parsed !== null &&
      (parsed as Record<string, unknown>)[accountKey] === true
    );
  } catch {
    return false;
  }
}

function markGuideSeenFor(accountKey: string): void {
  try {
    const raw = getItem(MY_STORY_GUIDE_KEY);
    const parsed = raw === null ? {} : (JSON.parse(raw) as unknown);
    const all =
      typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
    setItem(MY_STORY_GUIDE_KEY, JSON.stringify({ ...all, [accountKey]: true }));
  } catch {
    // 저장 못 하면 다음 실행에 안내가 한 번 더 섭니다.
  }
}

export type MyStoriesWiringArgs = {
  readonly catalog: () => readonly CatalogEntry[];
  /** 지금 계정의 출처 키(계정마다 기기 저장). */
  readonly accountKey: () => string;
  /** 친구 스토리 본 것 저장(같은 계정) — 본 반응도 여기에. */
  readonly seen: () => StorySeenStore;
};

/** 서명 주소를 다시 쓰는 시간 — 서버 수명(한 시간)보다 짧게. */
const SIGNED_REUSE_MS = 45 * 60_000;

/** 사진 포트(ADR-0199) — 호스트 고르기 · 지우기 + 서버 원격의 업로드 · 게시 · 서명 · 다시 확인 요청. */
function photoPortOf(remote: () => ReturnType<typeof companionServerRemote>): MyStoryPhotoPort {
  const signed = new Map<string, { readonly url: string; readonly at: number }>();
  // 기다리는 서명 — 대화방의 여러 판이 같은 사진을 동시에 그려도 요청은 하나(ADR-0194 개정 ⟨판⟩).
  const waiting = new Map<string, Promise<string | null>>();
  const photo = () => remote()?.myStories?.photo ?? null;
  const sign = async (imagePath: string, now: number): Promise<string | null> => {
    try {
      const url = (await photo()?.sign(imagePath)) ?? null;
      if (url !== null) signed.set(imagePath, { url, at: now });
      return url;
    } finally {
      waiting.delete(imagePath);
    }
  };
  return {
    pick: pickStoryPhoto,
    // 위기 연락처 지역 — 색 바탕과 같이 스토어 계정 나라를 알면 싣습니다(#598 `client_region`).
    post: async (draft, onUploaded) =>
      (await photo()?.post(
        { ...draft, region: regionOf(purchaseStore().storefront) },
        onUploaded,
      )) ?? { result: "failed" },
    url: async (imagePath) => {
      const now = Date.now();
      const kept = signed.get(imagePath);
      if (kept !== undefined && now - kept.at < SIGNED_REUSE_MS) return kept.url;
      const pending = waiting.get(imagePath) ?? sign(imagePath, now);
      waiting.set(imagePath, pending);
      return pending;
    },
    requestReview: async (id) => (await photo()?.requestReview(id)) ?? false,
    discard: discardStoryPhoto,
  };
}

/** 내 스토리 포트 — 서버 원격이 없으면(손님 · 가짜 출처) 읽기 null이라 「+」가 서지 않습니다. */
export function myStoriesPortOf(args: MyStoriesWiringArgs): MyStoriesPort {
  const remote = () => companionServerRemote()?.myStories ?? null;
  // 이번 실행 동안 본 안내(저장이 실패해도 같은 실행에서 다시 서지 않게).
  const shownThisRun = new Set<string>();
  // 계정마다 — 계정을 바꾸면 앞 계정의 값이 설정 줄을 세우지 않게(리뷰 m8).
  const enabled = new Map<string, boolean>();
  const photo = photoPortOf(companionServerRemote);
  return {
    // 호스트 모듈이 있을 때만(옛 호스트 · Explorer에는 사진 선택지가 없음) — 부를 때마다 봅니다.
    get photo() {
      return storyPhotosAvailable() ? photo : undefined;
    },
    load: async () => {
      try {
        const state = (await remote()?.list(tzOffsetMinOf(Date.now()))) ?? null;
        if (state !== null) enabled.set(args.accountKey(), state.enabled);
        return state;
      } catch {
        return null;
      }
    },
    knownEnabled: () => enabled.get(args.accountKey()) === true,
    post: async (draft) => (await remote()?.post(draft)) ?? { result: "failed" },
    // 위기 연락처 지역(#598 `client_region`) — 스토어 계정 나라(두 글자)를 알면 싣고, 모르면 서버가 국제 목록을 씁니다.
    postText: async (draft) =>
      (await remote()?.postText({ ...draft, region: regionOf(purchaseStore().storefront) })) ?? {
        result: "failed",
      },
    remove: async (storyId) => (await remote()?.remove(storyId)) ?? false,
    setKeep: async (keep) => (await remote()?.setKeep(keep)) ?? null,
    choices: () => myStoryChoicesOf(loadCurrentWordbook(), args.catalog(), todayLocal()),
    guideSeen: () => shownThisRun.has(args.accountKey()) || guideSeenFor(args.accountKey()),
    markGuideSeen: () => {
      shownThisRun.add(args.accountKey());
      markGuideSeenFor(args.accountKey());
    },
    seenReactions: () => args.seen().seenIds(),
    markReactionsSeen: (ids, until) => {
      const now = Date.now();
      for (const id of ids) args.seen().markSeen(id, until, now);
    },
    newClientId: () => uuidV4(),
  };
}
