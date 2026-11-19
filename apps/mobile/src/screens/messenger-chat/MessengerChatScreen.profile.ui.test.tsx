import { afterEach, expect, test, vi } from "vitest";
import { cleanup, screen } from "@lynx-js/react/testing-library";

import {
  clearBackHandlers,
  fixtureRoom,
  mountChat,
  seedOf,
  systemBack,
  tapId,
} from "./chat-ui.test-support";
import type { SuggestedFriendsPort } from "./friend-catalog.contract";
import { friendProfileTestIds as profileIds } from "./friend-profile.contract";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";
import { suggestedFriendsTestIds as sf } from "./suggested-friends.contract";
import { catalogOf, friend } from "./suggested-friends.test-support";

// `ui` 계층(MCP1 ~ MCP3, ADR-0162 2026-11-19): 방 머리 제목(인물 이름)이 프로필 입구다 — 새 단추 없이, 누르면 읽기 전용 시트(닫기만),
// 시스템 뒤로가기는 방이 닫고, 카탈로그에 없는 인물 · 포트 없음이면 지금처럼 글자만.

afterEach(() => {
  cleanup();
  clearBackHandlers();
});

const port = (): SuggestedFriendsPort => ({
  catalog: () =>
    catalogOf([
      friend("mina", {
        name: "미나",
        profile: { age: "25-26", job: { en: "Backpacker" }, mbti: "ESFJ", voiceSamplePath: null },
      }),
    ]),
  add: () => "already",
  earlyAccess: null,
  mediaUrlOf: (path) => `https://cdn/${path}`,
});

test("MCP1. 제목을 누르면 읽기 전용 프로필 — 사실 줄 · Close, 추가 단추 없음, profile_opened { source: room }", () => {
  const sink = vi.fn<(event: unknown) => void>();
  mountChat({ seed: seedOf(fixtureRoom("mina")), friends: port(), eventSink: sink });
  const title = screen.getByTestId(profileIds.roomTitle);
  expect(title.getAttribute("accessibility-label")).toBe("미나, view profile");
  expect(screen.getByTestId(ids.title).textContent).toBe("미나");
  tapId(profileIds.roomTitle);
  expect(screen.getByTestId(sf.sheet)).toBeInTheDocument();
  expect(screen.getByTestId(profileIds.facts).textContent).toBe("Age 25–26 · Backpacker · ESFJ");
  expect(screen.queryByTestId(sf.sheetStart)).toBeNull();
  expect(screen.queryByTestId(profileIds.voice)).toBeNull();
  expect(sink).toHaveBeenCalledWith(
    expect.objectContaining({ name: "friend_profile_opened", characterId: "mina", source: "room" }),
  );
  tapId(profileIds.close);
  expect(screen.queryByTestId(sf.sheet)).toBeNull();
});

test("MCP2. 시스템 뒤로가기는 방(useChatRoom)이 프로필을 닫는다 — 방은 그대로", () => {
  mountChat({ seed: seedOf(fixtureRoom("mina")), friends: port() });
  tapId(profileIds.roomTitle);
  expect(systemBack()).toBe(true);
  expect(screen.queryByTestId(sf.sheet)).toBeNull();
  expect(screen.getByTestId(ids.screen)).toBeInTheDocument();
});

test("MCP3. 포트가 없거나 카탈로그에 없는 인물이면 제목은 누를 수 없는 글자(header)다", () => {
  mountChat({ seed: seedOf(fixtureRoom("mina")) });
  expect(screen.queryByTestId(profileIds.roomTitle)).toBeNull();
  expect(screen.getByTestId(ids.title).getAttribute("accessibility-traits")).toBe("header");
  cleanup();
  mountChat({
    seed: seedOf(fixtureRoom("mina")),
    friends: { ...port(), catalog: () => catalogOf([friend("someone")]) },
  });
  expect(screen.queryByTestId(profileIds.roomTitle)).toBeNull();
});
