// 본 친구 스토리 표시의 기기 저장입니다(ADR-0177 D3, 계정마다). lib/storage의 getItem · setItem만 씁니다.
// 서버에 쓰지 않습니다 — 보는 것마다 RPC를 늘리지 않고, 다른 기기에서는 다시 「안 봄」입니다. 실패는 삼키고 이번 실행만 메모리로 갑니다.

import { getItem, setItem } from "../../lib/storage";
import type { StorySeenStore } from "./friend-stories.contract";
import { seenRecordsWith, type SeenRecords } from "./friend-stories";

/** `{ <출처 키>: { <스토리 id>: <만료 ms> } }`. */
export const FRIEND_STORY_SEEN_KEY = "libitum.friendStories.seen";

type AllRecords = Record<string, unknown>;

function readAll(): AllRecords {
  try {
    const raw = getItem(FRIEND_STORY_SEEN_KEY);
    const parsed = raw === null ? null : (JSON.parse(raw) as unknown);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? { ...(parsed as AllRecords) }
      : {};
  } catch {
    return {};
  }
}

function recordsOf(all: AllRecords, accountKey: string): SeenRecords {
  const raw = all[accountKey];
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return {};
  const records: Record<string, number> = {};
  for (const [id, value] of Object.entries(raw as Record<string, unknown>))
    if (typeof value === "number" && Number.isFinite(value)) records[id] = value;
  return records;
}

export function deviceStorySeenStore(accountKey: string): StorySeenStore {
  let cache: SeenRecords | null = null;
  const current = (): SeenRecords => {
    cache ??= recordsOf(readAll(), accountKey);
    return cache;
  };
  return {
    seenIds: () => new Set(Object.keys(current())),
    markSeen: (storyId, expiresAt, now) => {
      cache = seenRecordsWith(current(), storyId, expiresAt, now);
      try {
        setItem(FRIEND_STORY_SEEN_KEY, JSON.stringify({ ...readAll(), [accountKey]: cache }));
      } catch {
        // 이번 실행만 메모리로 — 다음 실행에 한 번 더 「안 봄」일 뿐입니다.
      }
    },
  };
}
