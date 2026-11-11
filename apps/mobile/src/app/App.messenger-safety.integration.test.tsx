import { act, cleanup, fireEvent, screen } from "@lynx-js/react/testing-library";
import { afterEach, expect, test, vi } from "vitest";

import { chatFixtureSeed } from "../screens/messenger-chat/chat-fixture";
import { App } from "./App";
import { resetMessengerChatSourceForTests } from "./messenger-chat-wiring";
import {
  appChatSource,
  openTab,
  resetMessengerChatSource,
  tapButtonIn,
  tapId,
  tapRound,
} from "./test-helpers/messenger-chat-app";
import { legacyPassedSeed } from "./test-helpers/progress-seed";
import { renderSignedInApp } from "./test-helpers/signed-in-app";

// `integration` 계층(SU-I1 ~ I3): 앱 결선에서 법 · 안전 UI(ADR-0125) — 첫 방에서 생년을 한 번만 묻고, 위기 카드의 단추가
// 호스트 `ExternalLinkModule`에 닿는다. 호스트 모듈만 대역입니다.

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function bootToList(): Promise<void> {
  await renderSignedInApp(<App progressSeed={legacyPassedSeed} />, { keepFakeTimers: true });
  openTab("messenger");
  expect(screen.getByTestId("messenger-list-screen")).toBeInTheDocument();
}

const openRoom = (id: string) => tapId(`messenger-list-row-${id}`);
const leaveRoom = () => tapRound("messenger-chat-back");

test("SU-I1 처음 연 방에서 생년을 묻고, 답한 뒤에는 다른 방을 열어도 다시 묻지 않으며 사이드바에 값이 보인다", async () => {
  // 1.5(ADR-0117 D3)부터 미나 방은 해금 전 잠겨 있어, 이미 해금한 설치로 시작합니다.
  await resetMessengerChatSource({ birthYear: "unasked", unlocked: ["mina"] });
  await bootToList();

  openRoom("mina");
  expect(screen.getByTestId("messenger-chat-birth-year-sheet")).toBeInTheDocument();
  tapId("messenger-chat-birth-year-1998");
  act(() => {
    tapButtonIn("ui-lynx-bottom-sheet-action-continue");
  });
  expect(screen.queryByTestId("messenger-chat-birth-year-sheet")).toBeNull();
  expect((await appChatSource())?.snapshot().birthYear).toEqual({ kind: "set", year: 1998 });

  leaveRoom();
  openRoom("owner");
  expect(screen.queryByTestId("messenger-chat-birth-year-sheet")).toBeNull();
  tapId("messenger-chat-settings");
  expect(
    screen.getByTestId("messenger-chat-sidebar-birth-year").getAttribute("accessibility-label"),
  ).toBe("Birth year, 1998");
});

test("SU-I2 건너뛰어도 다시 묻지 않는다", async () => {
  // 1.5(ADR-0117 D3)부터 미나 방은 해금 전 잠겨 있어, 이미 해금한 설치로 시작합니다.
  await resetMessengerChatSource({ birthYear: "unasked", unlocked: ["mina"] });
  await bootToList();
  openRoom("mina");
  act(() => {
    tapButtonIn("ui-lynx-bottom-sheet-action-skip");
  });
  leaveRoom();
  openRoom("mina");
  expect(screen.queryByTestId("messenger-chat-birth-year-sheet")).toBeNull();
  expect((await appChatSource())?.snapshot().birthYear).toEqual({ kind: "skipped" });
});

test("SU-I3 위기 카드의 Call은 호스트 ExternalLinkModule.open에 tel: 주소를 넘긴다", async () => {
  const open = vi.fn();
  const [mina, ...rest] = chatFixtureSeed.rooms;
  if (mina === undefined) throw new Error("seed has no rooms");
  resetMessengerChatSourceForTests({
    rooms: [
      {
        ...mina,
        access: { kind: "open" },
        messages: [
          ...mina.messages,
          {
            kind: "crisis",
            resources: [{ name: "Line A", phone: "988", url: null, hours: null }],
            minutesAgo: 0,
          },
        ],
      },
      ...rest,
    ],
    birthYear: { kind: "set", year: 2000 },
  });
  await bootToList();
  vi.stubGlobal("NativeModules", {
    ...(globalThis as unknown as { NativeModules?: Record<string, unknown> }).NativeModules,
    ExternalLinkModule: { open },
  });

  openRoom(mina.roomId);
  act(() => {
    fireEvent.tap(screen.getByTestId("messenger-chat-crisis-call"), {});
  });
  expect(open).toHaveBeenCalledTimes(1);
  expect(open.mock.calls[0]?.[0]).toBe("tel:988");
});
