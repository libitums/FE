import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, screen } from "@lynx-js/react/testing-library";

import type { EpisodeIntroEvent } from "../episode-intro/episode-intro.contract";
import {
  clearBackHandlers,
  fixtureRoom,
  mountChat,
  seedOf,
  systemBack,
  tapId,
} from "./chat-ui.test-support";
import type { SuggestedFriendsPort } from "./friend-catalog.contract";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";
import { suggestedFriendsTestIds as sf } from "./suggested-friends.contract";
import { catalogOf, friend, general } from "./suggested-friends.test-support";

// `ui` 계층(RP-U1 ~ RP-U3): 대화방 머리 이름 → 읽기 전용 프로필(ADR-0164 앱 추가 2026-11-20). 머리 배치 · 새 단추 없음, 열린 방에서만,
// Close만(추가 · 먼저 만나기 없음), 연 순간 `suggested_friend_opened { from: room }`.

afterEach(() => {
  cleanup();
  clearBackHandlers();
});

const port = (characters = [friend("mina", { name: "미나" })]): SuggestedFriendsPort => ({
  catalog: () => catalogOf(characters),
  add: () => "added",
  earlyAccess: null,
  mediaUrlOf: (path) => `https://cdn.test/${path}`,
});

test("RP-U1 열린 방: 이름이 버튼으로 읽히고, 누르면 Close만 있는 프로필 · 이벤트 from room", () => {
  const sink = vi.fn<(event: EpisodeIntroEvent) => void>();
  mountChat({ friends: port(), eventSink: sink });
  const title = screen.getByTestId(ids.title);
  expect(title.getAttribute("accessibility-label")).toBe("미나, view profile");
  fireEvent.tap(title, {});
  expect(screen.getByTestId(sf.sheet)).toBeInTheDocument();
  expect(screen.getByTestId(sf.sheetName).textContent).toBe("미나");
  expect(screen.getByTestId(sf.sheetAi)).toBeInTheDocument();
  expect(screen.queryByTestId(sf.sheetStart)).toBeNull();
  expect(screen.queryByTestId(sf.sheetEarly)).toBeNull();
  expect(screen.queryByTestId(sf.sheetVoice)).toBeNull(); // 이야기 인물은 견본 없음
  expect(sink).toHaveBeenCalledWith(
    expect.objectContaining({ name: "suggested_friend_opened", characterId: "mina", from: "room" }),
  );
  tapId(sf.sheetClose);
  expect(screen.queryByTestId(sf.sheet)).toBeNull();
});

test("RP-U2 견본이 있는 친구는 시트에 Hear voice, 시스템 뒤로가기는 시트만 닫는다", () => {
  const seoyeon = general("seoyeon", {
    name: "차서연",
    voiceSamplePath: "content/audio/companion/seoyeon-intro.mp3",
  });
  const { onExit } = mountChat({
    roomId: "seoyeon",
    seed: seedOf(
      fixtureRoom("seoyeon", { counterpart: { id: "seoyeon", name: "차서연", avatarPath: null } }),
    ),
    friends: port([seoyeon]),
  });
  fireEvent.tap(screen.getByTestId(ids.title), {});
  expect(screen.getByTestId(sf.sheetVoice).getAttribute("data-playback")).toBe("idle");
  expect(systemBack()).toBe(true);
  expect(screen.queryByTestId(sf.sheet)).toBeNull();
  expect(onExit).not.toHaveBeenCalled();
});

test("RP-U3 포트가 없거나 카탈로그에 없는 인물이면 이름은 지금처럼 글자만(낭독 이름 · 탭 없음)", () => {
  mountChat();
  expect(screen.getByTestId(ids.title).hasAttribute("accessibility-label")).toBe(false);
  cleanup();
  mountChat({ friends: port([friend("doyun")]) });
  expect(screen.getByTestId(ids.title).hasAttribute("accessibility-label")).toBe(false);
});
