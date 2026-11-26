import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, screen } from "@lynx-js/react/testing-library";

import * as audio from "../lib/audio";
import type { ChatRemote } from "../screens/messenger-chat/chat-remote.contract";
import { COMPANION_CATALOG } from "../screens/messenger-chat/companion-roster";
import { friendStoriesTestIds as storyIds } from "../screens/messenger-chat/friend-stories.contract";
import { story } from "../screens/messenger-chat/friend-stories.test-support";
import { friend } from "../screens/messenger-chat/suggested-friends.test-support";
import { suggestedFriendsTestIds as ids } from "../screens/messenger-chat/suggested-friends.contract";
import { App } from "./App";
import { setFriendStoriesStoresForTests } from "./friend-stories-wiring";
import { setEarlyAccessRemote, setFriendCatalogForTests } from "./suggested-friends-wiring";
import {
  openTab,
  present,
  renderTesterApp,
  resetMessengerChatSource,
  tapId,
  textOf,
} from "./test-helpers/messenger-chat-app";
import { legacyPassedSeed } from "./test-helpers/progress-seed";

// `integration` 계층(PV-I1 · PV-I2, ADR-0198): 실제 App · 메신저 탭 · 추천 친구 결선. 목록 결선이 인물의 견본 경로를 아바타와 같은
// 해석기(콘텐츠 버킷 주소)로 풀어 시트에 넘기고, 로마자 스위치(기본 켬, ADR-0188)를 시트의 대본 줄에 넘기는지 봅니다. 재생 모듈은 대역.

vi.mock("../lib/audio", async (importOriginal) => ({
  ...(await importOriginal<typeof audio>()),
  playAudio: vi.fn(() => "started" as const),
  stopAudio: vi.fn(),
}));

const clerk = {
  id: "clerk",
  name: "점원",
  avatarPath: null,
  kind: "general",
  unlockEpisodeId: null,
  unlockEpisode: null,
  intro: { en: "Works at the corner store" },
  tags: [],
  category: null,
  sheetOpening: { ko: "어서 오세요.", en: "Welcome." },
  earlyAccess: null,
  voiceSamplePath: "content/audio/companion/clerk-intro.mp3",
  voiceSampleScript: {
    ko: "점원이에요! 뭐 찾아요? ㅎㅎ",
    roman: "jeomwonieyo! mwo chajayo? hh",
    en: "I'm the clerk! Looking for something? Hehe.",
  },
} as const;

beforeEach(async () => {
  vi.stubEnv("PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  vi.mocked(audio.playAudio).mockClear();
  await resetMessengerChatSource();
  setFriendCatalogForTests({
    characters: [...COMPANION_CATALOG.characters, clerk],
    categories: [],
  });
});
afterEach(() => {
  setFriendCatalogForTests(null);
  setEarlyAccessRemote(null);
  setFriendStoriesStoresForTests(null);
  cleanup();
  vi.unstubAllEnvs();
  (lynx as unknown as { __globalProps: unknown }).__globalProps = undefined;
});

test("PV-I1. 줄에서 연 시트 — 견본 단추가 버킷 주소로 틀고, 첫 말 칸은 대본(로마자 기본 켬)", async () => {
  await renderTesterApp(<App progressSeed={legacyPassedSeed} />);
  openTab("messenger");
  fireEvent.tap(screen.getByTestId(ids.avatar("clerk")), {});

  const opening = textOf(ids.sheetOpening);
  expect(opening).toContain("점원이에요! 뭐 찾아요? ㅎㅎ");
  expect(opening).toContain("jeomwonieyo! mwo chajayo? hh");
  expect(opening).not.toContain("어서 오세요.");

  tapId(ids.sheetVoice);
  expect(vi.mocked(audio.playAudio).mock.calls[0]?.[0]).toMatch(
    /^https:\/\/test\.supabase\.co\/.+\/audio\/companion\/clerk-intro\.mp3$/,
  );
  expect(present(ids.sheetVoiceUnavailable)).toBe(false);
});

test("PV-I2. 잠긴 이야기 인물(미나) — 단추 · 대본 없음", async () => {
  await renderTesterApp(<App progressSeed={legacyPassedSeed} />);
  openTab("messenger");
  fireEvent.tap(screen.getByTestId(ids.avatar("mina")), {});
  expect(present(ids.sheet)).toBe(true);
  expect(present(ids.sheetVoice)).toBe(false);
  expect(present(ids.sheetOpening)).toBe(false);
});

test("PV-I3. 스토리 보기 아바타로 연 이미 친구 시트 — 목록 시트와 같은 버킷 주소로 틀고 못 읽음 줄이 없다(2026-11-26 보고)", async () => {
  const now = Date.now();
  setFriendCatalogForTests({
    characters: [
      ...COMPANION_CATALOG.characters,
      friend("owner", {
        name: "사장님",
        voiceSamplePath: "content/audio/companion/owner-intro.mp3",
        voiceSampleScript: { ko: "사장님이에요!", roman: "sajangnimieyo!", en: "I'm the owner!" },
      }),
    ],
    categories: [],
  });
  setEarlyAccessRemote(
    () =>
      ({
        earlyAccess: { offers: async () => [], unlock: async () => null },
        friends: { visible: async () => [], ackAdult: async () => true },
        stories: {
          list: async () => [
            story("owner", { postedAt: now - 3_600_000, expiresAt: now + 3_600_000 }),
          ],
        },
      }) as unknown as ChatRemote,
  );
  setFriendStoriesStoresForTests({
    seen: { seenIds: () => new Set(), markSeen: () => undefined },
    saveWord: () => undefined,
    isWordSaved: () => false,
  });
  await renderTesterApp(<App progressSeed={legacyPassedSeed} />);
  openTab("messenger");
  await act(async () => {
    for (let i = 0; i < 8; i += 1) await Promise.resolve();
  });
  tapId(storyIds.friend("owner"));
  tapId(storyIds.profile);
  tapId(ids.sheetVoice);
  expect(vi.mocked(audio.playAudio).mock.calls[0]?.[0]).toMatch(
    /^https:\/\/test\.supabase\.co\/.+\/audio\/companion\/owner-intro\.mp3$/,
  );
  expect(present(ids.sheetVoiceUnavailable)).toBe(false);
});
