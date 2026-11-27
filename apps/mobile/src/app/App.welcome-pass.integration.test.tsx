import { afterEach, expect, test } from "vitest";
import { cleanup, fireEvent, screen } from "@lynx-js/react/testing-library";

import { authSessionStorageKey, serializeAuthSession } from "../lib/auth-session";
import { learningItemGuideSeenStorageKey } from "../lib/learning-item-guide";
import { allLearningItemGuidesSeenValue } from "../lib/learning-item-guide.test-support";
import { ticketsUnlimited } from "../lib/unlimited-tickets";
import {
  bootGuestAfterFirstUnit,
  flushRounds,
  installGuestHost,
  openSettingsTab,
  present,
  renderGuestApp,
  resetGuestHost,
  settingsCell,
  signInFromSettingsWithGoogle,
  tapButtonIn,
} from "./test-helpers/guest-entry";
import { goToTabRoot } from "./test-helpers/more-menu";
import { welcomePassShownStorageKey } from "./welcome-pass-record";

// `integration` 계층: 첫날 무제한 티켓은 회원에게만(ADR-0186 개정 1) — 비회원은 새 기기여도 없고, 가입하면 가입 보상 창을 본 때부터
// 24시간(개정 4), 로그아웃하면 사라진다. 대역은 경계뿐입니다(`test-helpers/guest-entry` — 저장소 · 인증 · RPC).

afterEach(() => {
  cleanup();
  resetGuestHost();
});

const HOUR = 3_600_000;
const isoHoursAgo = (hours: number): string => new Date(Date.now() - hours * HOUR).toISOString();
const chip = () => screen.getByTestId("top-bar-tickets");

test("[WP-I1] 새 기기의 비회원은 첫날 무제한이 없다 — 칩은 숫자, 기기에 시작 시각을 적지 않는다", async () => {
  const host = installGuestHost();
  await bootGuestAfterFirstUnit(host);
  expect(chip()).toHaveTextContent("3");
  expect(ticketsUnlimited()).toBe(false);
  expect([...host.store.keys()].some((key) => key.includes("welcome-pass"))).toBe(false);
});

test("[WP-I2] 비회원이 튜토리얼 중에 설정에서 가입(기록 이어받기)하면 가입 보상 창을 보기 전까지는 아직 없다(개정 4) — 칩은 숫자", async () => {
  const host = installGuestHost({ accountCreatedAt: isoHoursAgo(0) });
  await bootGuestAfterFirstUnit(host);
  expect(ticketsUnlimited()).toBe(false);

  openSettingsTab();
  await signInFromSettingsWithGoogle();
  goToTabRoot("journey");
  await flushRounds(2);

  // 튜토리얼은 티켓을 쓰지 않고, 창이 서는 순간부터 24시간이 시작한다(App.welcome-pass-start WS-I1).
  expect(ticketsUnlimited()).toBe(false);
  expect(chip()).toHaveTextContent(/^\d+$/);
  expect([...host.store.keys()].some((key) => key.includes("welcome-pass"))).toBe(false);
});

test("[WP-I3] 오래된 계정으로 로그인하면 무제한이 없다 — 기준은 이 기기가 아니라 계정 생성 시각", async () => {
  const host = installGuestHost({ accountCreatedAt: isoHoursAgo(24 * 40) });
  await bootGuestAfterFirstUnit(host);
  openSettingsTab();
  await signInFromSettingsWithGoogle();
  goToTabRoot("journey");
  await flushRounds(2);

  expect(ticketsUnlimited()).toBe(false);
  expect(chip()).toHaveTextContent(/^\d+$/); // 숫자 칩
});

test("[WP-I4] 새 회원이 로그아웃하면 무제한도 사라진다", async () => {
  const store = new Map<string, string>([
    [
      authSessionStorageKey,
      serializeAuthSession({
        accessToken: "stale",
        refreshToken: "boot",
        expiresAt: 4_102_444_800_000,
      }),
    ],
    [learningItemGuideSeenStorageKey, allLearningItemGuidesSeenValue],
    // 가입 보상 창을 한 시간 전에 본 계정(개정 4 — 시작은 창이 선 때).
    [welcomePassShownStorageKey("u1"), String(Date.now() - HOUR)],
  ]);
  const host = installGuestHost({ store, accountCreatedAt: isoHoursAgo(2) });
  await renderGuestApp(host, { platform: "ios" });
  expect(present("journey-map-screen")).toBe(true);
  expect(ticketsUnlimited()).toBe(true);

  openSettingsTab();
  fireEvent.tap(settingsCell("sign-out"), {});
  tapButtonIn("ui-lynx-dialog-action-sign-out");
  await flushRounds(4);

  expect(present("login-screen-title")).toBe(true);
  expect(ticketsUnlimited()).toBe(false);
});
