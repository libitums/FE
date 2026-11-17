// 가짜 출처의 대화 설정 · 기억 조각입니다(ADR-0126). 앱을 다시 켜면 씨앗으로 돌아갑니다(1단계 가짜 데이터와 같다).

import {
  CHARACTER_MEMORY_CAP,
  normalizeMemoryText,
  SHARED_MEMORY_CAP,
} from "./chat-settings-rules";
import type { ChatSnapshotSelf } from "./chat-album.contract";
import type { ChatProfileRemote } from "./chat-remote.contract";
import { replyIdeasSync, type ReplyIdeasStore } from "./reply-ideas-pref";
import type {
  ChatFeedbackMode,
  ChatFixtureSeed,
  ChatMemory,
  ChatMemoryList,
  ChatMemoryScope,
  ChatPreferences,
  ChatProactivePref,
  ChatSource,
} from "./chat-source.contract";

export const DEFAULT_PREFERENCES: ChatPreferences = {
  replyIdeas: true,
  proactive: "daily1",
  proactiveHour: null,
  feedbackMode: "separate",
  snapshotSelf: null,
};

export type FixtureSettings = {
  readonly preferences: () => ChatPreferences;
  /** 바뀌었으면 true. */
  readonly setPreferences: (patch: Partial<ChatPreferences>) => boolean;
  readonly memories: (scope: ChatMemoryScope) => ChatMemoryList;
  readonly updateMemory: (id: string, content: string) => boolean;
  readonly deleteMemory: (id: string) => boolean;
  /** 학습자가 아닌 쪽(서버 프로필)이 설정을 바꾸면 부를 것 — 출처가 방 캐시를 비우고 알립니다. */
  readonly onExternalChange: (listener: () => void) => void;
};

const proactivePrefs: readonly ChatProactivePref[] = ["off", "daily1", "daily2"];
const feedbackModes: readonly ChatFeedbackMode[] = ["separate", "natural", "prefix"];
const snapshotSelves: readonly ChatSnapshotSelf[] = ["female", "male", "hidden"];

/** 틀린 칸은 버리고 맞는 칸만 남깁니다. */
function validPatch(patch: Partial<ChatPreferences>): Partial<ChatPreferences> {
  const next: { -readonly [K in keyof ChatPreferences]?: ChatPreferences[K] } = {};
  if (typeof patch.replyIdeas === "boolean") next.replyIdeas = patch.replyIdeas;
  if (patch.proactive !== undefined && proactivePrefs.includes(patch.proactive)) {
    next.proactive = patch.proactive;
  }
  const hour = patch.proactiveHour;
  if (
    hour === null ||
    (Number.isInteger(hour) && (hour as number) >= 0 && (hour as number) <= 23)
  ) {
    next.proactiveHour = hour as number | null;
  }
  if (patch.feedbackMode !== undefined && feedbackModes.includes(patch.feedbackMode)) {
    next.feedbackMode = patch.feedbackMode;
  }
  // 내 모습은 한 번 고르면 「고른 적 없음」(null)으로 되돌리지 않습니다(ADR-0150).
  if (patch.snapshotSelf !== undefined && patch.snapshotSelf !== null) {
    if (snapshotSelves.includes(patch.snapshotSelf)) next.snapshotSelf = patch.snapshotSelf;
  }
  return next;
}

const scopeKey = (scope: ChatMemoryScope): string =>
  scope.kind === "shared" ? "shared" : `character:${scope.characterId}`;
const capOf = (key: string): number =>
  key === "shared" ? SHARED_MEMORY_CAP : CHARACTER_MEMORY_CAP;

export function createFixtureSettings(
  seed: ChatFixtureSeed,
  now: () => number,
  stores: {
    readonly replyIdeasStore?: ReplyIdeasStore;
    readonly remote?: { readonly profile?: ChatProfileRemote };
  } = {},
): FixtureSettings {
  // 추천 답변 설정은 기기(계정마다) · 서버 프로필에 남습니다(ADR-0156). 나머지 설정은 다시 켜면 씨앗으로 돌아갑니다.
  const replyIdeas = replyIdeasSync(stores.replyIdeasStore, stores.remote?.profile);
  let preferences = seed.preferences ?? DEFAULT_PREFERENCES;
  if (replyIdeas.initial !== null) preferences = { ...preferences, replyIdeas: replyIdeas.initial };
  let external: (() => void) | null = null;
  replyIdeas.onLoaded((on) => {
    if (preferences.replyIdeas === on) return;
    preferences = { ...preferences, replyIdeas: on };
    external?.(); // 열린 방 · 설정 화면이 다음 갱신을 기다리지 않고 바로 다시 그립니다.
  });
  let nextId = 1;
  const layers = new Map<string, ChatMemory[]>();
  const cache = new Map<string, ChatMemoryList>();
  const seedLayer = (key: string, texts: readonly string[]) => {
    const at = now();
    layers.set(
      key,
      texts.map((content, index) => ({
        id: `mem-${nextId++}`,
        content,
        edited: false,
        createdAt: at - (texts.length - index) * 86_400_000,
      })),
    );
  };
  seedLayer("shared", seed.memories?.shared ?? []);
  for (const [id, texts] of Object.entries(seed.memories?.byCharacter ?? {})) {
    seedLayer(`character:${id}`, texts);
  }

  const find = (id: string): { key: string; index: number } | null => {
    for (const [key, list] of layers) {
      const index = list.findIndex((memory) => memory.id === id);
      if (index >= 0) return { key, index };
    }
    return null;
  };

  return {
    onExternalChange: (listener) => {
      external = listener;
    },
    preferences: () => preferences,
    setPreferences: (patch) => {
      const valid = validPatch(patch);
      const merged = { ...preferences, ...valid };
      const changed = (Object.keys(merged) as (keyof ChatPreferences)[]).some(
        (key) => merged[key] !== preferences[key],
      );
      if (changed && merged.replyIdeas !== preferences.replyIdeas) {
        replyIdeas.changed(merged.replyIdeas);
      }
      if (changed) preferences = merged;
      return changed;
    },
    memories: (scope) => {
      const key = scopeKey(scope);
      const cached = cache.get(key);
      if (cached !== undefined) return cached;
      const memories = layers.get(key) ?? [];
      const cap = capOf(key);
      const list = { memories, count: memories.length, cap, full: memories.length >= cap };
      cache.set(key, list);
      return list;
    },
    updateMemory: (id, content) => {
      const text = normalizeMemoryText(content);
      const at = find(id);
      if (text === null || at === null) return false;
      const list = layers.get(at.key) ?? [];
      const current = list[at.index];
      // 같은 글이면 무동작입니다 — 고친 표시(서버에서는 상한을 넘어도 지우지 않는 표시)는 실제로 바뀐 글에만 붙습니다.
      if (current === undefined || current.content === text) return false;
      layers.set(
        at.key,
        list.map((memory, index) =>
          index === at.index ? { ...memory, content: text, edited: true } : memory,
        ),
      );
      cache.delete(at.key);
      return true;
    },
    deleteMemory: (id) => {
      const at = find(id);
      if (at === null) return false;
      layers.set(
        at.key,
        (layers.get(at.key) ?? []).filter((memory) => memory.id !== id),
      );
      cache.delete(at.key);
      return true;
    },
  };
}

type SettingsHooks = {
  readonly disposed: () => boolean;
  /** 추천 답변을 끄고 켜면 모든 방의 보기가 바뀌므로 이 방들의 캐시를 비웁니다(스냅숏은 설정 참조로 스스로 갱신). */
  readonly rooms: ReadonlyMap<string, { threadCache: unknown }>;
  readonly notify: () => void;
};

/** 가짜 출처의 설정 · 기억 메서드입니다 — 바뀌었을 때만 알립니다. */
export function settingsMethods(
  settings: FixtureSettings,
  hooks: SettingsHooks,
): Pick<ChatSource, "setPreferences" | "memories" | "updateMemory" | "deleteMemory"> {
  const invalidate = () => {
    for (const room of hooks.rooms.values()) room.threadCache = null;
    hooks.notify();
  };
  settings.onExternalChange(() => {
    if (!hooks.disposed()) invalidate();
  });
  return {
    setPreferences: (patch) => {
      if (hooks.disposed() || !settings.setPreferences(patch)) return;
      invalidate();
    },
    memories: (scope) => settings.memories(scope),
    updateMemory: (id, content) => {
      if (!hooks.disposed() && settings.updateMemory(id, content)) hooks.notify();
    },
    deleteMemory: (id) => {
      if (!hooks.disposed() && settings.deleteMemory(id)) hooks.notify();
    },
  };
}
