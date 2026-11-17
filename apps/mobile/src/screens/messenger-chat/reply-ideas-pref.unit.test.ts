import { expect, test, vi } from "vitest";

import { createFixtureSettings, settingsMethods } from "./chat-fixture-settings";
import { chatFixtureSeed } from "./chat-fixture";
import type { ChatProfileRemote } from "./chat-remote.contract";
import type { ReplyIdeasStore } from "./reply-ideas-pref";

// `unit` 계층(RI-U1 ~ U4, ADR-0156): 추천 답변 칩 설정은 기기(계정마다) · 서버 프로필에 남는다 — 다시 켜도 꺼진 채이고,
// 바꾸면 기기에 적고 서버(`p_reply_suggestions`)에 보낸다. 서버 값은 학습자가 아직 안 바꿨을 때만 이긴다.

const flush = async () => {
  for (let i = 0; i < 5; i += 1) await Promise.resolve();
};

function memoryStore(initial: boolean | null = null) {
  let value = initial;
  const write = vi.fn((on: boolean) => {
    value = on;
  });
  const store: ReplyIdeasStore = { read: () => value, write };
  return { store, write };
}

function profile(replySuggestions: boolean | null) {
  const saveReplySuggestions = vi.fn(async () => true);
  const remote: ChatProfileRemote = {
    load: async () => ({ birthYear: null, replySuggestions }),
    saveBirthYear: async () => true,
    saveReplySuggestions,
  };
  return { remote, saveReplySuggestions };
}

test("RI-U1 기기에 꺼 둔 값이 있으면 다시 켜도 꺼진 채로 시작한다(없으면 씨앗 그대로 켜짐)", () => {
  const off = createFixtureSettings(chatFixtureSeed, Date.now, {
    replyIdeasStore: memoryStore(false).store,
  });
  expect(off.preferences().replyIdeas).toBe(false);
  const fresh = createFixtureSettings(chatFixtureSeed, Date.now, {
    replyIdeasStore: memoryStore(null).store,
  });
  expect(fresh.preferences().replyIdeas).toBe(true);
});

test("RI-U2 바꾸면 기기에 적고 서버 프로필에 보낸다 · 같은 값이면 아무것도 하지 않는다", () => {
  const { store, write } = memoryStore();
  const { remote, saveReplySuggestions } = profile(null);
  const settings = createFixtureSettings(chatFixtureSeed, Date.now, {
    replyIdeasStore: store,
    remote: { profile: remote },
  });

  expect(settings.setPreferences({ replyIdeas: false })).toBe(true);
  expect(write).toHaveBeenLastCalledWith(false);
  expect(saveReplySuggestions).toHaveBeenCalledWith(false);
  expect(settings.setPreferences({ replyIdeas: false })).toBe(false);
  expect(saveReplySuggestions).toHaveBeenCalledTimes(1);
  settings.setPreferences({ feedbackMode: "natural" });
  expect(saveReplySuggestions).toHaveBeenCalledTimes(1);
});

test("RI-U3 서버 값(다른 기기에서 끔)이 오면 따르고 기기에도 적는다", async () => {
  const { store, write } = memoryStore(true);
  const settings = createFixtureSettings(chatFixtureSeed, Date.now, {
    replyIdeasStore: store,
    remote: { profile: profile(false).remote },
  });
  await flush();

  expect(settings.preferences().replyIdeas).toBe(false);
  expect(write).toHaveBeenLastCalledWith(false);
});

test("RI-U4 읽는 동안 학습자가 바꾼 값이 이긴다 · 서버 칸이 없으면(null) 그대로다", async () => {
  const settings = createFixtureSettings(chatFixtureSeed, Date.now, {
    replyIdeasStore: memoryStore().store,
    remote: { profile: profile(true).remote },
  });
  settings.setPreferences({ replyIdeas: false });
  await flush();
  expect(settings.preferences().replyIdeas).toBe(false);

  const unknown = createFixtureSettings(chatFixtureSeed, Date.now, {
    replyIdeasStore: memoryStore(false).store,
    remote: { profile: profile(null).remote },
  });
  await flush();
  expect(unknown.preferences().replyIdeas).toBe(false);
});

test("RI-U5 서버 값이 바꾼 설정은 출처 구독자에게 알리고 방의 보기 캐시를 비운다(열린 방이 바로 다시 그린다)", async () => {
  const settings = createFixtureSettings(chatFixtureSeed, Date.now, {
    replyIdeasStore: memoryStore().store,
    remote: { profile: profile(false).remote },
  });
  const notify = vi.fn<() => void>();
  const room = { threadCache: {} as unknown };
  settingsMethods(settings, { disposed: () => false, rooms: new Map([["mina", room]]), notify });
  await flush();
  expect(settings.preferences().replyIdeas).toBe(false);
  expect(notify).toHaveBeenCalledTimes(1);
  expect(room.threadCache).toBeNull();
});
