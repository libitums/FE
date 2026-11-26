import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@lynx-js/react/testing-library";

import * as audio from "../../lib/audio";
import { clearBackHandlers, fixtureRoom, makeSource, seedOf, tapId } from "./chat-ui.test-support";
import { ChatEventsContext } from "./chat-events";
import { createCoinWallet } from "./coin-wallet";
import type { SuggestedFriendsPort } from "./friend-catalog.contract";
import { friendStoriesTestIds as ids, type FriendStoriesPort } from "./friend-stories.contract";
import { STORY_NOW, story } from "./friend-stories.test-support";
import { MessengerListScreen } from "./MessengerListScreen";
import { takeStoryReplyHandoff } from "./story-reply-handoff";
import { suggestedFriendsTestIds as suggestedIds } from "./suggested-friends.contract";
import { catalogOf, friend } from "./suggested-friends.test-support";

// `ui` 계층(PV-UI1, ADR-0198 · 2026-11-26 보고): 스토리 보기 아바타로 연 **이미 친구** 프로필 시트도 목록 시트와 같은 견본 주소 ·
// 로마자 스위치를 받는다. 전에는 이 시트만 주소를 받지 못해 Hear voice가 늘 「Voice sample unavailable」이었다. 재생 모듈은 대역.

vi.mock("../../lib/audio", async (importOriginal) => ({
  ...(await importOriginal<typeof audio>()),
  playAudio: vi.fn(() => "started" as const),
  stopAudio: vi.fn(),
}));

const PATH = "content/audio/companion/duksu-intro.mp3";
const URL = "https://cdn/audio/companion/duksu-intro.mp3";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(STORY_NOW);
  vi.mocked(audio.playAudio).mockClear();
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
  vi.useRealTimers();
  takeStoryReplyHandoff("duksu");
});

const friendsPort = (): SuggestedFriendsPort => ({
  catalog: () =>
    catalogOf([
      friend("duksu", {
        name: "덕수쌤",
        voiceSamplePath: PATH,
        voiceSampleScript: { ko: "덕수쌤이에요!", roman: "deoksussaemieyo!", en: "I'm Deoksu!" },
      }),
    ]),
  add: () => "added",
  earlyAccess: null,
  voiceSampleUrl: (path) => (path === PATH ? URL : null),
  romanization: () => true,
});

async function mountViewerSheet() {
  const source = makeSource(
    seedOf(
      fixtureRoom("duksu", {
        counterpart: { id: "duksu", name: "덕수쌤", avatarPath: null },
        messages: [
          { kind: "text", from: "them", text: { ko: "안녕!", en: "Hi!" }, minutesAgo: 60 },
        ],
      }),
    ),
  );
  const stories: FriendStoriesPort = {
    load: async () => [story("duksu", { id: "st-duksu" })],
    imageUrl: (path) => `https://cdn/${path}`,
    seen: { seenIds: () => new Set(), markSeen: vi.fn() },
  };
  render(
    <ChatEventsContext.Provider value={{ sink: vi.fn(), roomId: null }}>
      <MessengerListScreen
        source={source}
        wallet={createCoinWallet({ earned: 100 })}
        onOpenRoom={vi.fn()}
        onGoToJourney={vi.fn()}
        onLayerChange={vi.fn()}
        notice={null}
        onNoticeShown={vi.fn()}
        access="open"
        onSignIn={vi.fn()}
        friends={friendsPort()}
        stories={stories}
      />
    </ChatEventsContext.Provider>,
  );
  await screen.findByTestId(ids.friend("duksu"));
  tapId(ids.friend("duksu"));
  tapId(ids.profile);
}

test("PV-UI1. 스토리 보기의 이미 친구 시트 — Hear voice가 견본 주소로 틀고 못 읽음 줄이 없다", async () => {
  await mountViewerSheet();
  tapId(suggestedIds.sheetVoice);
  expect(vi.mocked(audio.playAudio).mock.calls[0]?.[0]).toBe(URL);
  expect(screen.queryByTestId(suggestedIds.sheetVoiceUnavailable)).toBeNull();
});

test("PV-UI1. 스토리 보기의 이미 친구 시트 — 대본 줄도 로마자 스위치(켬)를 따른다", async () => {
  await mountViewerSheet();
  expect(screen.getByTestId(suggestedIds.sheetOpening).textContent).toContain("deoksussaemieyo!");
});
