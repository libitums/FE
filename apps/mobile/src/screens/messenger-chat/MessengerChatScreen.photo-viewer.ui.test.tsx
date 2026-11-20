import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, screen } from "@lynx-js/react/testing-library";

import { chatAlbumTestIds as album } from "./chat-album.contract";
import { createFixtureChatSource } from "./chat-fixture-source";
import { fakeTimers } from "./chat-fixture-timers.test-support";
import type { ChatMediaRemote, MediaRequestResult, RemoteMedia } from "./chat-media.contract";
import type { ChatRemote } from "./chat-remote.contract";
import type { ChatMessage } from "./chat-source.contract";
import {
  clearBackHandlers,
  mountChat,
  presenceProbe,
  slotContent,
  systemBack,
  tapId,
} from "./chat-ui.test-support";
import { companionSeed } from "./companion-roster";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";

// `ui` 계층(CV-UI1 ~ UI5): 채팅방의 다 만든 사진을 누르면 앨범과 같은 사진 보기가 방 위에 열린다(ADR-0150 2026-11-17 추가).
// 만드는 중 · 그림 없는 사진은 누를 수 없고, 닫기 · 시스템 뒤로가기로 방에 돌아오며, Redraw는 앨범처럼 확인 뒤 다시 그린다.

const A1 = "22222222-2222-4222-8222-222222222222";
const M1 = "33333333-3333-4333-8333-333333333333";
const flush = () =>
  act(async () => {
    for (let i = 0; i < 6; i += 1) await new Promise((resolve) => setTimeout(resolve, 0));
  });

const reply: ChatMessage = {
  id: `${A1}#0`,
  at: 1,
  kind: "text",
  from: "them",
  text: { ko: "궁 마당이에요!", en: "It's the palace yard!" },
};
const row = (over: Partial<RemoteMedia> = {}): RemoteMedia => ({
  id: M1,
  messageId: A1,
  kind: "snapshot",
  status: "complete",
  path: "u/a.png",
  aspect: "3:2",
  failure: null,
  previewPath: null,
  createdAt: 1_000,
  ...over,
});

async function openRoom(loads: (readonly RemoteMedia[])[]) {
  const timers = fakeTimers();
  const queue = [...loads];
  const port: ChatMediaRemote = {
    request: vi.fn(async (): Promise<MediaRequestResult> => ({
      kind: "accepted",
      media: row({ id: "55555555-5555-4555-8555-555555555555", status: "pending", path: null }),
      cached: false,
    })),
    load: vi.fn(async () => queue.shift() ?? []),
    sign: vi.fn(async (path: string) => `https://signed/${path}`),
    balance: vi.fn(async () => 65),
  };
  const remote: ChatRemote = {
    loadHistory: async () => ({ messages: [reply], corrections: {}, ideas: null }),
    greet: async () => null,
    openTurn: () => ({ cancel: () => undefined }),
    media: port,
  };
  const source = createFixtureChatSource({
    imageUrlOf: () => null,
    seed: { ...companionSeed(), birthYear: { kind: "set", year: 2000 } },
    timers,
    remote,
  });
  mountChat({ source, roomId: "duksu", coinBalance: 100, probe: presenceProbe("absent") });
  await flush();
  return { port };
}

beforeEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
});

test("CV-UI1 다 만든 사진을 누르면 사진 보기가 방 위에 열리고, 그때의 말이 보인다", async () => {
  await openRoom([[row()]]);
  expect(screen.getByTestId(ids.photo).getAttribute("src")).toBe("https://signed/u/a.png");
  const open = screen.getByTestId(ids.photoOpen);
  expect(open.getAttribute("accessibility-traits")).toBe("button");
  tapId(ids.photoOpen);
  expect(screen.getByTestId(album.viewer)).toBeTruthy();
  expect(screen.getByTestId(album.viewer).textContent).toContain("궁 마당이에요!");
  expect(screen.getByTestId(album.redraw).textContent).toContain("Redraw · 25");
});

test("CV-UI2 만드는 중인 사진은 누를 자리가 없다", async () => {
  await openRoom([[row({ status: "pending", path: null })]]);
  expect(screen.getByTestId(ids.photoPending)).toBeTruthy();
  expect(screen.queryByTestId(ids.photoOpen)).toBeNull();
  expect(screen.queryByTestId(album.viewer)).toBeNull();
});

test("CV-UI3 닫기 · 시스템 뒤로가기는 사진 보기만 닫고 방에 남는다", async () => {
  await openRoom([[row()]]);
  tapId(ids.photoOpen);
  tapId(album.viewerClose);
  expect(screen.queryByTestId(album.viewer)).toBeNull();
  tapId(ids.photoOpen);
  expect(systemBack()).toBe(true);
  expect(screen.queryByTestId(album.viewer)).toBeNull();
  expect(screen.getByTestId(ids.screen)).toBeTruthy();
});

test("CV-UI4 열면 키보드 자리를 접는다", async () => {
  await openRoom([[row()]]);
  tapId(ids.field);
  expect(slotContent()).toBe("learning-keyboard");
  tapId(ids.photoOpen);
  expect(slotContent()).toBe("closed");
});

test("CV-UI5 Redraw → 확인 → 다시 그리기 요청(again), 사진 보기는 닫히고 방에 자리표시자", async () => {
  const env = await openRoom([[row()], []]);
  tapId(ids.photoOpen);
  tapId(album.redraw);
  expect(screen.getByTestId(album.confirm)).toBeTruthy();
  tapId(album.confirmGo);
  await flush();
  expect(env.port.request).toHaveBeenCalledWith("snapshot", A1, true);
  expect(screen.queryByTestId(album.viewer)).toBeNull();
  expect(screen.queryByTestId(album.confirm)).toBeNull();
  expect(screen.getByTestId(ids.photoPending)).toBeTruthy();
});
