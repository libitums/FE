import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, screen } from "@lynx-js/react/testing-library";

import { memoryUnlockStore } from "../screens/messenger-chat/chat-local-stores";
import { chatFixtureSeed } from "../screens/messenger-chat/chat-fixture";
import type { ChatRemote } from "../screens/messenger-chat/chat-remote.contract";
import { nativeInput } from "../screens/messenger-chat/chat-ui.test-support";
import { myStoriesTestIds as ids } from "../screens/messenger-chat/my-stories.contract";
import { myStory, PHOTO_PATH } from "../screens/messenger-chat/my-stories.test-support";
import type { MyPhotoStoryDraft } from "../screens/messenger-chat/my-story-photo.contract";
import { App } from "./App";
import { setFriendStoriesStoresForTests } from "./friend-stories-wiring";
import {
  resetMessengerChatSourceForTests,
  setMessengerChatStoresForTests,
} from "./messenger-chat-wiring";
import { setAdultAckAskedStoreForTests, setEarlyAccessRemote } from "./suggested-friends-wiring";
import { openTab, present, renderTesterApp, tapId } from "./test-helpers/messenger-chat-app";
import { legacyPassedSeed } from "./test-helpers/progress-seed";

// `integration` 계층(MSP-I1 · I2, ADR-0199): 실제 App · 메신저 탭 · 내 스토리 결선(`my-stories-wiring`의 사진 포트 → `lib/story-photo.ts`
// → 호스트 `StoryPhotoModule` 대역) · 가짜 서버 원격(`myStories.photo`). 「+」 → 사진 → 호스트 고르기 → 사진 위 Aa → Share → 원격 게시 →
// 보기의 서명 주소 사진 · 올린 뒤 기기 파일 지움. 호스트 모듈이 없으면 kinds에 photo가 있어도 사진 선택지가 없다.

const HOUR = 3_600_000;
const LOCAL = "/data/cache/story-photos/7a1b.jpg";

function hostModule() {
  const host = {
    pick: vi.fn((_source: string, callback: (payload: unknown) => void) =>
      callback({
        status: "picked",
        url: `file://${LOCAL}`,
        path: LOCAL,
        width: "1200",
        height: "1600",
      }),
    ),
    upload: vi.fn(),
    discard: vi.fn(),
  };
  vi.stubGlobal("NativeModules", { StoryPhotoModule: host });
  return host;
}

function serverRemote() {
  const post = vi.fn(async (draft: MyPhotoStoryDraft, _onUploaded?: () => void) => ({
    result: "ok" as const,
    story: myStory("photo-1", {
      kind: "photo",
      imagePath: PHOTO_PATH,
      word: null,
      ko: draft.ko,
      roman: "",
      meaning: "",
      example: null,
      overlays: draft.overlays,
      postedAt: Date.now(),
      expiresAt: Date.now() + 24 * HOUR,
    }),
    window: null,
  }));
  const sign = vi.fn(async () => "https://signed.example/photo-1.jpg");
  setEarlyAccessRemote(
    () =>
      ({
        earlyAccess: { offers: async () => [], unlock: async () => null },
        friends: { visible: async () => [], ackAdult: async () => true },
        stories: { list: async () => [] },
        myStories: {
          list: async () => ({
            enabled: true,
            keep: true,
            stories: [],
            window: null,
            kinds: ["text", "photo"],
          }),
          post: async () => ({ result: "failed" }),
          postText: async () => ({ result: "failed" }),
          remove: async () => true,
          setKeep: async (keep: boolean) => keep,
          photo: { post, sign, requestReview: async () => true },
        },
      }) as unknown as ChatRemote,
  );
  return { post, sign };
}

beforeEach(() => {
  resetMessengerChatSourceForTests({ ...chatFixtureSeed, birthYear: { kind: "set", year: 2000 } });
  setMessengerChatStoresForTests({ unlock: memoryUnlockStore([]), now: () => Date.now() });
  setAdultAckAskedStoreForTests({ asked: () => true, markAsked: () => undefined });
  setFriendStoriesStoresForTests({
    seen: { seenIds: () => new Set(), markSeen: () => undefined },
    saveWord: () => undefined,
    isWordSaved: () => false,
  });
});
afterEach(() => {
  setEarlyAccessRemote(null);
  setAdultAckAskedStoreForTests(null);
  setFriendStoriesStoresForTests(null);
  vi.unstubAllGlobals();
  cleanup();
  (lynx as unknown as { __globalProps: unknown }).__globalProps = undefined;
});

async function settle() {
  await act(async () => {
    for (let i = 0; i < 8; i += 1) await Promise.resolve();
  });
}

async function openCreate() {
  await renderTesterApp(<App progressSeed={legacyPassedSeed} />);
  openTab("messenger");
  await settle();
  tapId(ids.create);
  if (present(ids.guide)) tapId(ids.guideStart);
}

test("MSP-I1. 「+」 → 사진 → 호스트 고르기 → 사진 위 Aa → Share: 원격이 호스트 경로 · 한 줄로 게시, 보기는 서명 주소 사진, 기기 파일을 지운다", async () => {
  const host = hostModule();
  const remote = serverRemote();
  await openCreate();
  tapId(ids.startPhotos);
  await settle();
  expect(host.pick).toHaveBeenCalledWith("library", expect.any(Function));
  expect(screen.getByTestId(ids.editorPhoto).getAttribute("src")).toBe(`file://${LOCAL}`);
  tapId(ids.toolText);
  await act(async () => nativeInput("input", "서울 도착!", ids.textInput));
  tapId(ids.textDone);
  await settle();
  tapId(ids.share);
  await settle();
  expect(remote.post).toHaveBeenCalledWith(
    expect.objectContaining({
      photo: { url: `file://${LOCAL}`, path: LOCAL, width: 1200, height: 1600 },
      ko: "서울 도착!",
      overlays: [expect.objectContaining({ kind: "text", ko: "서울 도착!" })],
      tzOffsetMin: -new Date().getTimezoneOffset() || 0,
    }),
    // 올린 뒤 확인 단계 알림이 결선을 지나 원격까지 간다(ADR-0199 개정 — 「Checking your photo…」).
    expect.any(Function),
  );
  await settle();
  expect(remote.sign).toHaveBeenCalledWith(PHOTO_PATH);
  expect(screen.getByTestId(ids.storyPhoto).getAttribute("src")).toBe(
    "https://signed.example/photo-1.jpg",
  );
  expect(host.discard).toHaveBeenCalledWith(LOCAL);
});

test("MSP-I2. 호스트 모듈이 없으면 kinds에 photo가 있어도 Camera · 사진이 없다", async () => {
  vi.stubGlobal("NativeModules", {});
  serverRemote();
  await openCreate();
  expect(present(ids.startBackground)).toBe(true);
  expect(present(ids.startCamera)).toBe(false);
  expect(present(ids.startPhotos)).toBe(false);
});
