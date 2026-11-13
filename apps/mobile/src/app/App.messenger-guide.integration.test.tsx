import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, screen } from "@lynx-js/react/testing-library";

import { App } from "./App";
import {
  appChatSource,
  openTab,
  present,
  pressSystemBack,
  renderTesterApp,
  resetMessengerChatSource,
  tapId,
} from "./test-helpers/messenger-chat-app";
import { legacyPassedSeed } from "./test-helpers/progress-seed";

// `integration` 계층(MG-I1): 하단 탭 메신저 NEW — 처음 → 메신저 탭에 들어가면 사라짐 → 새 친구 해금 → 다시 NEW →
// 그 방을 열면 사라짐(사용자 결정 2026-11-13). 실제 App · 바 · 기기 저장소(호스트 StorageModule 목) · 가짜 출처 싱글턴.

const badge = "ui-lynx-bottom-navigator-badge-messenger";

beforeEach(async () => {
  await resetMessengerChatSource();
});
afterEach(() => {
  cleanup();
  (lynx as unknown as { __globalProps: unknown }).__globalProps = undefined;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test("MG-I1 처음엔 NEW, 메신저 탭에 들어가면 사라지고, 새 친구가 해금되면 다시 서고 그 방을 열면 사라진다", async () => {
  await renderTesterApp(<App progressSeed={legacyPassedSeed} />);
  expect(screen.getByTestId(badge).textContent).toBe("NEW");

  openTab("messenger");
  expect(present(badge)).toBe(false);

  const source = await appChatSource();
  act(() => {
    source?.unlockCharacter("mina");
  });
  expect(present(badge)).toBe(true);

  tapId("messenger-list-row-mina");
  expect(present("messenger-chat-screen")).toBe(true);
  // 방에는 바가 없으니 목록으로 돌아와 봅니다.
  pressSystemBack();
  expect(present("messenger-list-screen")).toBe(true);
  expect(present("ui-lynx-bottom-navigator")).toBe(true);
  expect(present(badge)).toBe(false);
});
