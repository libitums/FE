import { afterEach, expect, test } from "vitest";
import { cleanup, fireEvent, screen, within } from "@lynx-js/react/testing-library";

import { App } from "./App";
import { authSessionStorageKey, serializeAuthSession } from "../lib/auth-session";
import { learningItemGuideSeenStorageKey } from "../lib/learning-item-guide";
import { allLearningItemGuidesSeenValue } from "../lib/learning-item-guide.test-support";
import {
  bootGuestAfterFirstUnit,
  eventLabels,
  flush,
  flushRounds,
  guestMarkerKey,
  guestProgressKey,
  installGuestHost,
  openSettingsTab,
  present,
  renderGuestApp,
  resetGuestHost,
  settingsCell,
  settingsItemIds,
  signInFromSettingsWithGoogle,
  tapButtonIn,
} from "./test-helpers/guest-entry";
import { legacyPassedSeed } from "./test-helpers/progress-seed";
import { renderSignedInApp } from "./test-helpers/signed-in-app";

// `integration` 계층: 비회원의 설정 탭 — 행 구성, 「로그인」 행이 여는 `guest-login`(비회원 버튼 없음 · 탭 바 숨김),
// 취소 시 비회원 상태 유지, 로그아웃 뒤 로그인 화면. 대역은 경계뿐입니다(`test-helpers/guest-entry`).

afterEach(() => {
  cleanup();
  resetGuestHost();
});

const guestStore = (): Map<string, string> =>
  new Map([
    [guestMarkerKey, "1"],
    [learningItemGuideSeenStorageKey, allLearningItemGuidesSeenValue],
  ]);
const navigatorItems = (): HTMLElement[] =>
  screen.queryAllByTestId(/^ui-lynx-bottom-navigator-item-/);
const settingsId = (id: string): string => `ui-lynx-settings-group-item-${id}`;
// 학습 묶음(보기 로마자 — ADR-0108 · 진동 — ADR-0109 D4 토글)은 기기 설정이라 비회원 · 로그인 사용자 모두에게 선다.
// Facebook 버튼을 정책으로 연 상태(숨김 목록 비움) — 기본값은 숨김(ADR-0111 개정 4).
const openFacebookPolicy = {
  "app-policy.json": JSON.stringify({
    schema: "app-policy-1",
    min_build: {},
    hidden_login_methods: { all: [], android: [] },
  }),
};

const guestRows = [
  "show-choice-romanization",
  "vibration",
  "chats",
  "profile",
  "learner-profile",
  "language",
  "download",
  "privacy-policy",
  "terms-of-use",
  "sign-in",
].map(settingsId);

// ------------------------------------------------------------------------- GE5

test("[GE5] 비회원의 설정은 계정 묶음 여섯과 「로그인」 한 행뿐이고 알림 · 피드백 · 로그아웃 · 계정 삭제가 없다", async () => {
  const host = installGuestHost({ store: guestStore() });
  await renderGuestApp(host, { platform: "ios" });
  expect(present("journey-map-screen")).toBe(true);
  openSettingsTab();

  expect(settingsItemIds()).toEqual(guestRows);
  for (const id of ["notifications", "feedback", "sign-out", "delete-account"]) {
    expect(present(settingsId(id))).toBe(false);
  }
});

test("[GE5b] 로그인 사용자의 설정은 그대로 여덟 항목과 계정 동작 둘이다(회귀)", async () => {
  await renderSignedInApp(<App progressSeed={legacyPassedSeed} />);
  openSettingsTab();

  expect(settingsItemIds()).toEqual(
    [
      "show-choice-romanization",
      "vibration",
      "chats",
      "profile",
      "learner-profile",
      "language",
      "download",
      "notifications",
      "feedback",
      "privacy-policy",
      "terms-of-use",
      "sign-out",
      "delete-account",
    ].map(settingsId),
  );
  expect(present(settingsId("sign-in"))).toBe(false);
});

// ------------------------------------------------------------------------- GE6

test("[GE6] 「로그인」 행은 비회원 버튼 없는 로그인 화면을 탭 바 없이 열고 뒤로 가면 설정과 탭 바가 돌아온다", async () => {
  const host = installGuestHost({ store: guestStore(), content: openFacebookPolicy });
  await renderGuestApp(host, { platform: "ios" });
  openSettingsTab();
  host.events.length = 0;

  fireEvent.tap(settingsCell("sign-in"), {});
  await flush();

  expect(present("login-screen-title")).toBe(true);
  expect(present("login-screen-method-google")).toBe(true);
  expect(present("login-screen-method-guest")).toBe(false);
  expect(navigatorItems()).toHaveLength(0);
  expect(eventLabels(host.events)).toEqual(["viewed:login"]);
  expect(host.requests).toEqual([]);

  // 같은 LoginScreen이라 같은 사용 불가 안내가 선다(개정 2) — 정책이 Facebook 버튼을 열어 둔 상태, 요청 · 인증 창 0.
  expect(present("login-screen-method-facebook")).toBe(true);
  tapButtonIn("login-screen-method-facebook");
  await flush();
  expect(present("login-screen-unavailable-dialog")).toBe(true);
  expect(host.requests).toEqual([]);
  expect(host.webStarts).toEqual([]);
  tapButtonIn("ui-lynx-dialog-action-close");
  await flush();
  expect(present("login-screen-unavailable-dialog")).toBe(false);
  expect(present("login-screen-title")).toBe(true);

  fireEvent.tap(
    within(screen.getByTestId("login-screen-header")).getByTestId("ui-lynx-round-button"),
    {},
  );
  await flush();

  expect(present("settings-screen-title")).toBe(true);
  expect(present("login-screen-title")).toBe(false);
  expect(navigatorItems()).toHaveLength(4);
});

// ------------------------------------------------------------------------- GE10

test("[GE10] 설정 로그인을 취소하면 로그인 화면에 머물고 비회원 표식 · 기록 · 요청 상태가 그대로이며 뒤로 가면 비회원 설정이다", async () => {
  const host = installGuestHost();
  await bootGuestAfterFirstUnit(host);
  const progressBefore = host.store.get(guestProgressKey);
  expect(progressBefore).toBeDefined();
  openSettingsTab();
  host.web.mode = "cancelled";

  await signInFromSettingsWithGoogle();

  expect(host.webStarts).toHaveLength(1);
  expect(present("login-screen-title")).toBe(true);
  expect(host.store.get(guestMarkerKey)).toBe("1");
  expect(host.store.get(guestProgressKey)).toBe(progressBefore);
  expect(host.store.has(authSessionStorageKey)).toBe(false);
  // 교환 요청도, 진행 · 프로필 RPC도 없다.
  expect(host.requests).toEqual([]);
  expect(host.identify).not.toHaveBeenCalled();
  expect(host.register).not.toHaveBeenCalled();

  fireEvent.tap(
    within(screen.getByTestId("login-screen-header")).getByTestId("ui-lynx-round-button"),
    {},
  );
  await flush();

  expect(present("settings-screen-title")).toBe(true);
  expect(settingsItemIds()).toEqual(guestRows);
});

// ------------------------------------------------------------------------- GE11

test("[GE11] 로그인 사용자가 로그아웃하면 온보딩 위 로그인 화면이 서고 비회원 버튼이 있으며 저장소에 비회원 표식이 없다", async () => {
  const store = new Map<string, string>([
    [
      authSessionStorageKey,
      serializeAuthSession({
        accessToken: "stale-access",
        refreshToken: "boot-refresh",
        expiresAt: 4_102_444_800_000,
      }),
    ],
    [learningItemGuideSeenStorageKey, allLearningItemGuidesSeenValue],
  ]);
  const host = installGuestHost({ store });
  await renderGuestApp(host, { platform: "ios" });
  expect(present("journey-map-screen")).toBe(true);
  openSettingsTab();

  fireEvent.tap(settingsCell("sign-out"), {});
  tapButtonIn("ui-lynx-dialog-action-sign-out");
  await flushRounds(4);

  expect(present("login-screen-title")).toBe(true);
  expect(present("login-screen-method-guest")).toBe(true);
  expect(present("login-screen-method-facebook")).toBe(false); // 기본 숨김(개정 4)
  expect(present("login-screen-method-apple")).toBe(true);
  expect(host.store.has(guestMarkerKey)).toBe(false);
  expect(host.store.has(authSessionStorageKey)).toBe(false);

  fireEvent.tap(
    within(screen.getByTestId("login-screen-header")).getByTestId("ui-lynx-round-button"),
    {},
  );
  expect(present("onboarding-screen")).toBe(true);
});
