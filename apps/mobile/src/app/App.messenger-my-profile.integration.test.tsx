import { cleanup, fireEvent, screen } from "@lynx-js/react/testing-library";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { App } from "./App";
import {
  openTab,
  present,
  pressSystemBack,
  renderTesterApp,
  resetMessengerChatSource,
  stubBackHost,
  tapId,
  tapRound,
} from "./test-helpers/messenger-chat-app";
import { legacyPassedSeedWithCoins } from "./test-helpers/progress-seed";

// `integration` 계층(MP-I1 · MP-I2, 2026-11-17 기기 보고): 방 사이드바 › My profile로 연 User profile에서 뒤로 가면
// 설정 탭 첫 화면이 아니라 그 방으로 돌아온다 — 프로필은 지금 탭(메신저) 스택에 쌓이고, 나가기는 한 칸 뒤로입니다.
// 보이는 뒤로 단추와 시스템 뒤로가 같고, 돌아온 방에 사이드바가 다시 열려 있지 않습니다.

beforeEach(async () => {
  await resetMessengerChatSource();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

async function openMyProfileFromRoom(): Promise<void> {
  await renderTesterApp(<App progressSeed={legacyPassedSeedWithCoins(0)} />, {
    keepFakeTimers: true,
  });
  openTab("messenger");
  tapId("messenger-list-row-guesthouse");
  expect(screen.getByTestId("messenger-chat-screen")).toBeInTheDocument();
  tapRound("messenger-chat-settings");
  const cell = screen
    .getByTestId("messenger-chat-sidebar-my-profile")
    .querySelector('[data-testid="ui-lynx-settings-cell"]');
  if (cell === null) throw new Error("settings cell missing");
  fireEvent.tap(cell, {});
  expect(screen.getByTestId("profile-screen-title")).toBeInTheDocument();
}

test("MP-I1. 방 › 사이드바 › My profile › 뒤로 단추 → 그 방으로 돌아온다(설정 탭이 아니다)", async () => {
  await openMyProfileFromRoom();
  tapRound("profile-screen-exit");

  expect(screen.getByTestId("messenger-chat-screen")).toBeInTheDocument();
  expect(present("profile-screen-title")).toBe(false);
  expect(present("messenger-chat-sidebar")).toBe(false);
});

test("MP-I2. 방 › 사이드바 › My profile › 시스템 뒤로 → 그 방으로 돌아온다", async () => {
  stubBackHost();
  await openMyProfileFromRoom();

  pressSystemBack();

  expect(screen.getByTestId("messenger-chat-screen")).toBeInTheDocument();
  expect(present("profile-screen-title")).toBe(false);
});
