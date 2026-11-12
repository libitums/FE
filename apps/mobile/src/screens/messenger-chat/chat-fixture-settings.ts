// 가짜 출처의 대화 설정 · 기억 조각입니다(ADR-0126). 앱을 다시 켜면 씨앗으로 돌아갑니다(1단계 가짜 데이터와 같다).

import {
  CHARACTER_MEMORY_CAP,
  normalizeMemoryText,
  SHARED_MEMORY_CAP,
} from "./chat-settings-rules";
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
};

export type FixtureSettings = {
  readonly preferences: () => ChatPreferences;
  /** 바뀌었으면 true. */
  readonly setPreferences: (patch: Partial<ChatPreferences>) => boolean;
  readonly memories: (scope: ChatMemoryScope) => ChatMemoryList;
  readonly updateMemory: (id: string, content: string) => boolean;
  readonly deleteMemory: (id: string) => boolean;
};

const proactivePrefs: readonly ChatProactivePref[] = ["off", "daily1", "daily2"];
const feedbackModes: readonly ChatFeedbackMode[] = ["separate", "natural", "prefix"];

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
  return next;
}

const scopeKey = (scope: ChatMemoryScope): string =>
  scope.kind === "shared" ? "shared" : `character:${scope.characterId}`;
const capOf = (key: string): number =>
  key === "shared" ? SHARED_MEMORY_CAP : CHARACTER_MEMORY_CAP;

export function createFixtureSettings(seed: ChatFixtureSeed, now: () => number): FixtureSettings {
  let preferences = seed.preferences ?? DEFAULT_PREFERENCES;
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
    preferences: () => preferences,
    setPreferences: (patch) => {
      const valid = validPatch(patch);
      const merged = { ...preferences, ...valid };
      const changed = (Object.keys(merged) as (keyof ChatPreferences)[]).some(
        (key) => merged[key] !== preferences[key],
      );
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
  return {
    setPreferences: (patch) => {
      if (hooks.disposed() || !settings.setPreferences(patch)) return;
      for (const room of hooks.rooms.values()) room.threadCache = null;
      hooks.notify();
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
