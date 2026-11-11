import { cleanup, fireEvent, screen, within } from "@lynx-js/react/testing-library";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { App } from "./App";
import {
  appChatSource,
  openTab,
  pressSystemBack,
  present,
  resetMessengerChatSource,
  stubBackHost,
  tapId,
  tapRound,
  textOf,
} from "./test-helpers/messenger-chat-app";
import {
  assembleSinks,
  fakeTransport,
  sentEventNames,
} from "./test-helpers/airbridge-events-harness";
import { legacyPassedSeed } from "./test-helpers/progress-seed";
import { renderSignedInApp } from "./test-helpers/signed-in-app";

// `integration` 계층(CS-I1 ~ I3): 앱 결선에서 대화 설정(ADR-0126) — 설정 탭 Chats 줄 → Chats 화면 → 공유 기억 화면이
// 설정 스택에 쌓이고 뒤로 내려오며, 방 사이드바의 기억 줄이 그 인물의 기억 화면을 쌓는다. 추천 답변 스위치가 방의 보기를 끈다.

beforeEach(async () => {
  // 1.5(ADR-0117 D3)부터 미나 방은 해금 전 잠겨 있어, 이미 해금한 설치로 시작합니다.
  await resetMessengerChatSource({ unlocked: ["mina"] });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const tapCell = (testId: string): void => {
  fireEvent.tap(within(screen.getByTestId(testId)).getByTestId("ui-lynx-settings-cell"), {});
};

async function bootToChats(): Promise<void> {
  await renderSignedInApp(<App progressSeed={legacyPassedSeed} />, { keepFakeTimers: true });
  openTab("settings");
  tapCell("ui-lynx-settings-group-item-chats");
  expect(present("chat-settings-screen")).toBe(true);
}

test("CS-I1 설정 탭 Chats → 공유 기억 화면이 쌓이고, 시스템 뒤로 두 번이면 설정 탭으로 돌아온다", async () => {
  await bootToChats();
  stubBackHost();
  expect(textOf("chat-settings-shared-memories")).toContain("2 memories");

  tapId("chat-settings-shared-memories");
  expect(present("chat-settings-memories")).toBe(true);
  expect(textOf("chat-settings-memories")).toContain("What everyone knows about you");
  expect(textOf("chat-settings-memories")).toContain("You're preparing for TOPIK II.");

  pressSystemBack();
  expect(present("chat-settings-screen")).toBe(true);
  pressSystemBack();
  expect(present("settings-screen-list")).toBe(true);
});

test("CS-I2 Chats의 추천 답변을 끄면 방의 보기가 비어 전구가 꺼진다", async () => {
  await bootToChats();
  tapCell("chat-settings-reply-ideas");
  const source = await appChatSource();
  expect(source?.snapshot().preferences.replyIdeas).toBe(false);
  expect(source?.thread("mina")?.ideas).toEqual([]);

  tapRound("chat-settings-back");
  openTab("messenger");
  tapId("messenger-list-row-mina");
  expect(present("messenger-chat-screen")).toBe(true);
  expect(screen.getByTestId("messenger-chat-ideas-button").getAttribute("data-disabled")).toBe(
    "true",
  );
});

test("CS-I3 방 사이드바 「What 미나 remembers」 → 미나의 기억 화면, 뒤로 단추면 방으로", async () => {
  await renderSignedInApp(<App progressSeed={legacyPassedSeed} />, { keepFakeTimers: true });
  openTab("messenger");
  tapId("messenger-list-row-mina");
  tapId("messenger-chat-settings");
  expect(textOf("messenger-chat-sidebar-memories")).toContain("2 / 50");

  tapId("messenger-chat-sidebar-memories");
  expect(present("chat-settings-memories")).toBe(true);
  expect(textOf("chat-settings-memories")).toContain("What 미나 remembers");
  expect(textOf("chat-settings-memories")).toContain("Your Korean test is on December 14.");

  // 지우기 — 확인 대화상자를 거쳐 빠지고, 방 사이드바의 개수도 준다.
  const source = await appChatSource();
  const first = source?.memories({ kind: "character", characterId: "mina" }).memories[0]?.id ?? "";
  tapId(`chat-settings-memory-${first}-delete`);
  const buttons = within(screen.getByTestId("chat-settings-memory-delete")).getAllByTestId(
    "ui-lynx-button",
  );
  fireEvent.tap(buttons[buttons.length - 1] as Element, {});
  expect(textOf("chat-settings-memories")).toContain("1 / 50");

  tapRound("chat-settings-memories-back");
  expect(present("messenger-chat-screen")).toBe(true);
  expect(present("messenger-chat-sidebar")).toBe(false);
  tapId("messenger-chat-settings");
  expect(textOf("messenger-chat-sidebar-memories")).toContain("1 / 50");
});

test("CS-I4 Chats 화면 · 기억 화면을 오가도 분석 이벤트가 생기지 않는다(AC3 · AC8)", async () => {
  const { transport, calls: sent } = fakeTransport();
  await renderSignedInApp(<App progressSeed={legacyPassedSeed} {...assembleSinks(transport)} />);
  openTab("settings");
  await vi.waitFor(() => expect(sentEventNames(sent)).toContain("settings_opened"));
  const before = new Set(sentEventNames(sent));

  tapCell("ui-lynx-settings-group-item-chats");
  tapCell("chat-settings-reply-ideas");
  tapId("chat-settings-shared-memories");
  tapRound("chat-settings-memories-back");
  tapRound("chat-settings-back");
  // 뒤에 아는 이벤트 하나를 내 보내 그 사이의 대기열이 모두 나간 것을 확인합니다.
  tapId("top-bar-notifications");
  await vi.waitFor(() => expect(sentEventNames(sent)).toContain("notifications_opened"));

  const added = sentEventNames(sent).filter((name) => !before.has(name));
  expect(added.filter((name) => name !== "notifications_opened")).toEqual([]);
});
