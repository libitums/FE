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
// 시험 계정이 아닌 회원은 「곧 열림」 · 설정 탭 Chats 줄 없음, 시험 계정은 지금 목록 · Chats 줄.

beforeEach(async () => {
  await resetMessengerChatSource();
});
afterEach(() => {
  cleanup();
  resetGuestHost();
});

const gate = (): string | null =>
  screen.queryByTestId("messenger-access-gate")?.getAttribute("data-access") ?? null;

test("MA-I1 손님 — 메신저 탭은 가입 권유이고, 단추는 탭 바 없는 로그인 화면을 연다", async () => {
  const host = installGuestHost({
    store: new Map([
      [guestMarkerKey, "1"],
      [learningItemGuideSeenStorageKey, allLearningItemGuidesSeenValue],
    ]),
  });
  await renderGuestApp(host, { platform: "ios" });
  openTab("messenger");

  expect(gate()).toBe("sign-in");
  expect(present("messenger-list-list")).toBe(false);
  expect(present("messenger-list-coins")).toBe(false);
  fireEvent.tap(
    within(screen.getByTestId("messenger-access-sign-in")).getByTestId("ui-lynx-button"),
    {},
  );
  await flush();
  expect(present("login-screen-title")).toBe(true);
});

test("MA-I2 시험 계정이 아닌 회원 — 곧 열림 · Go to Journey는 여정으로, 설정 탭에 Chats 줄이 없다", async () => {
  await renderSignedInApp(<App progressSeed={legacyPassedSeed} />);
  openTab("messenger");

  expect(gate()).toBe("coming-soon");
  expect(present("messenger-list-coins")).toBe(true);
  fireEvent.tap(
    within(screen.getByTestId("messenger-access-journey")).getByTestId("ui-lynx-button"),
    {},
  );
  expect(present("journey-map-screen")).toBe(true);

  openTab("settings");
  expect(present("ui-lynx-settings-group-item-chats")).toBe(false);
});

test("MA-I3 시험 계정 — 지금 목록, 설정 탭에 Chats 줄", async () => {
  await renderTesterApp(<App progressSeed={legacyPassedSeed} />);
  openTab("messenger");

  expect(gate()).toBeNull();
  expect(present("messenger-list-list")).toBe(true);
  openTab("settings");
  expect(present("ui-lynx-settings-group-item-chats")).toBe(true);
});
