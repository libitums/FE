import { afterEach, beforeEach, expect, test } from "vitest";
import { cleanup, fireEvent, screen, within } from "@lynx-js/react/testing-library";

import { learningItemGuideSeenStorageKey } from "../lib/learning-item-guide";
import { allLearningItemGuidesSeenValue } from "../lib/learning-item-guide.test-support";
import { App } from "./App";
import {
  flush,
  guestMarkerKey,
  installGuestHost,
  renderGuestApp,
  resetGuestHost,
} from "./test-helpers/guest-entry";
import {
  openTab,
  present,
  renderTesterApp,
  resetMessengerChatSource,
} from "./test-helpers/messenger-chat-app";
import { legacyPassedSeed } from "./test-helpers/progress-seed";
import { renderSignedInApp } from "./test-helpers/signed-in-app";

// `integration` 계층(MA-I1 ~ I3): 메신저 탭 접근(ADR-0128) — 손님은 가입 권유(단추는 설정 탭 Sign in과 같은 로그인 화면),
// 로그인한 회원은 시험 계정이든 아니든 지금 목록 · Chats 줄(2026-11-17 일반 회원 개방).

beforeEach(async () => {
  await resetMessengerChatSource();
});
afterEach(() => {
  cleanup();
  resetGuestHost();
});

const gate = (): string | null =>
  screen.queryByTestId("messenger-access-gate")?.getAttribute("data-access") ?? null;

// ⟨ADR-0166⟩ 비회원은 가입 권유 안내 대신 회원과 같은 목록을 보고, 계정 동작(여기서는 엽전 칩)이 「로그인 필요」 대화상자를 띄운다.
test("MA-I1 손님 — 메신저 탭은 회원과 같은 목록이고, 권유 대화상자의 주 단추가 탭 바 없는 로그인 화면을 연다", async () => {
  const host = installGuestHost({
    store: new Map([
      [guestMarkerKey, "1"],
      [learningItemGuideSeenStorageKey, allLearningItemGuidesSeenValue],
    ]),
  });
  await renderGuestApp(host, { platform: "ios" });
  openTab("messenger");

  expect(gate()).toBeNull();
  expect(present("messenger-list-list")).toBe(true);
  expect(present("messenger-list-coins")).toBe(true);
  fireEvent.tap(screen.getByTestId("messenger-list-coins"), {});
  await flush();
  expect(present("messenger-sign-in-prompt")).toBe(true);
  fireEvent.tap(
    within(screen.getByTestId("ui-lynx-dialog-action-sign-in")).getByTestId("ui-lynx-button"),
    {},
  );
  await flush();
  expect(present("login-screen-title")).toBe(true);
});

test("MA-I2 시험 계정이 아닌 회원 — 지금 목록 · 엽전 칩, 설정 탭에 Chats 줄(2026-11-17 일반 회원 개방)", async () => {
  await renderSignedInApp(<App progressSeed={legacyPassedSeed} />);
  openTab("messenger");

  expect(gate()).toBeNull();
  expect(present("messenger-list-list")).toBe(true);
  expect(present("messenger-list-coins")).toBe(true);

  openTab("settings");
  expect(present("ui-lynx-settings-group-item-chats")).toBe(true);
});

test("MA-I3 시험 계정 — 지금 목록, 설정 탭에 Chats 줄", async () => {
  await renderTesterApp(<App progressSeed={legacyPassedSeed} />);
  openTab("messenger");

  expect(gate()).toBeNull();
  expect(present("messenger-list-list")).toBe(true);
  openTab("settings");
  expect(present("ui-lynx-settings-group-item-chats")).toBe(true);
});
