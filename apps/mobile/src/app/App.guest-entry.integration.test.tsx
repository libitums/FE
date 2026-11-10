import { afterEach, expect, test } from "vitest";
import { cleanup, fireEvent, screen } from "@lynx-js/react/testing-library";

import { authSessionStorageKey } from "../lib/auth-session";
import { catalogUpdateNoticeStorageKey } from "../lib/catalog-update-notice";
import { localDayFrom } from "../lib/progress-api";
import { uiLanguageStorageKey } from "../lib/ui-language";
import {
  completeOnboarding,
  eventLabels,
  finishFirstUnit,
  flush,
  guestDaysKey,
  guestMarkerKey,
  guestProfileKey,
  guestProgressKey,
  installGuestHost,
  openSettingsTab,
  present,
  renderGuestApp,
  resetGuestHost,
  signInFromSettingsWithGoogle,
  tapButtonIn,
  walkGuestEntryToMap,
} from "./test-helpers/guest-entry";
import { passLearnerSignup } from "./test-helpers/learner-signup";

// `integration` 계층: 비회원 진입(ADR-0111)을 한 트리에서 봅니다 — 로그인 화면의 수단 목록과 「비회원으로 계속」,
// 네트워크 0건의 완주, 첫 유닛 완료의 기기 저장, 재실행 시 곧장 맵. 대역은 경계뿐입니다(`test-helpers/guest-entry`).
// 로그인 이후(설정 행 · 이관 · 합치기)는 `App.guest-entry.upgrade.integration.test.tsx`가 봅니다.

afterEach(() => {
  cleanup();
  resetGuestHost();
});

const today = (): string => localDayFrom(new Date());

// ------------------------------------------------------------------------- GE1

test("[GE1] iOS · Android 모두 로그인 화면은 Apple · Google · 비회원 버튼이고 Facebook은 숨김이다 — Android에서 Apple을 탭하면 웹 인증 창이 바로 선다", async () => {
  const ios = installGuestHost();
  await renderGuestApp(ios, { platform: "ios" });
  completeOnboarding();

  expect(present("login-screen-title")).toBe(true);
  for (const id of ["apple", "google", "guest"]) {
    expect(present(`login-screen-method-${id}`)).toBe(true);
  }
  expect(present("login-screen-method-facebook")).toBe(false);
  expect(present("login-screen-unavailable-dialog")).toBe(false);

  cleanup();
  resetGuestHost();
  const android = installGuestHost();
  android.web.mode = "cancelled";
  await renderGuestApp(android, { platform: "android" });
  completeOnboarding();

  expect(present("login-screen-title")).toBe(true);
  for (const id of ["apple", "google", "guest"]) {
    expect(present(`login-screen-method-${id}`)).toBe(true);
  }
  expect(present("login-screen-method-facebook")).toBe(false);
  tapButtonIn("login-screen-method-apple");
  await flush();

  // Android의 Apple은 웹 OAuth로 바로 간다(2026-11-06 실기 확인 — 사용 불가 기본값에서 제외).
  expect(present("login-screen-unavailable-dialog")).toBe(false);
  expect(android.webStarts).toHaveLength(1);
  expect(JSON.stringify(android.webStarts[0])).toContain("apple");
});

// ------------------------------------------------------------------------- GE2

test("[GE2] 「비회원으로 계속」은 네트워크 없이 표식만 남기고 이름 → 나라 → 언어 → 여정 입장 → 맵까지 가며 알림을 묻지 않는다", async () => {
  const host = installGuestHost();
  await renderGuestApp(host, { platform: "ios" });
  completeOnboarding();
  expect(host.requests).toEqual([]);
  expect(Array.from(host.store.keys())).toEqual([]);

  tapButtonIn("login-screen-method-guest");
  await flush();

  // 표식 하나뿐 — 세션 · 진행 · 프로필은 아직 없다. 요청 0건.
  expect(Array.from(host.store.keys())).toEqual([guestMarkerKey]);
  expect(host.store.get(guestMarkerKey)).toBe("1");
  expect(host.requests).toEqual([]);
  expect(present("learner-name-screen-title")).toBe(true);
  expect(present("verification-code-screen-title")).toBe(false);

  passLearnerSignup();
  expect(present("language-select-screen-next")).toBe(true);
  fireEvent.tap(screen.getByTestId("ui-lynx-option-selector-item-en"), {});
  tapButtonIn("language-select-screen-next");
  expect(present("journey-entry-screen-start")).toBe(true);
  tapButtonIn("journey-entry-screen-start");
  await flush();

  expect(present("journey-map-screen")).toBe(true);
  expect(present("ui-lynx-bottom-navigator-item-journey")).toBe(true);
  expect(Array.from(host.store.keys()).sort()).toEqual(
    // 업데이트 안내 버전 기록은 맵이 ready가 되면 로그인 사용자와 같은 경로로 생긴다.
    [guestMarkerKey, guestProfileKey, uiLanguageStorageKey, catalogUpdateNoticeStorageKey].sort(),
  );
  expect(host.requests).toEqual([]);
  expect(host.register).not.toHaveBeenCalled();
  expect(host.identify).not.toHaveBeenCalled();

  const labels = eventLabels(host.events);
  expect(labels.slice(labels.lastIndexOf("viewed:login"))).toEqual([
    "viewed:login",
    "entry_login_method_selected:guest",
    "viewed:learner-name",
    "viewed:learner-country",
    "learner_profile_saved",
    "viewed:language-select",
    "viewed:journey-entry",
    "entry_completed",
  ]);
});

// ------------------------------------------------------------------------- GE3

test("[GE3] 첫 유닛(표지)을 끝내면 진행이 기기에만 적히고 RPC가 0건이다 — 표지는 학습일이 아니다(ADR-0035 U2 개정 2026-11-09)", async () => {
  const host = installGuestHost();
  await renderGuestApp(host, { platform: "ios" });
  await walkGuestEntryToMap();

  await finishFirstUnit();

  const progress = JSON.parse(host.store.get(guestProgressKey) ?? "null") as {
    catalogProgress?: Record<string, string[]>;
  } | null;
  expect(progress?.catalogProgress).toEqual({ "u00-tutorial": ["intro"] });
  expect(JSON.parse(host.store.get(guestDaysKey) ?? "null")).toBeNull();
  expect(screen.getByTestId("top-bar-streak")).toHaveAttribute(
    "accessibility-label",
    "0-day streak",
  );
  // 진행 · 학습일 · 프로필 · 피드백 어느 RPC도 나가지 않는다.
  expect(host.requests).toEqual([]);
});

// ------------------------------------------------------------------------- GE4

test("[GE4] 비회원 기록이 있는 저장소로 다시 켜면 요청 없이 곧장 여정 맵이 서고 완료 유닛이 남아 있다 — 표지만 끝낸 연속은 0(비회원 학습일 기록은 use-learning-days.guest GLD1)", async () => {
  const first = installGuestHost();
  await renderGuestApp(first, { platform: "ios" });
  await walkGuestEntryToMap();
  await finishFirstUnit();
  cleanup();
  resetGuestHost();

  const second = installGuestHost({ store: first.store });
  await renderGuestApp(second, { platform: "ios" });

  expect(second.requests).toEqual([]);
  expect(present("journey-map-screen")).toBe(true);
  expect(present("ui-lynx-bottom-navigator-item-journey")).toBe(true);
  for (const id of [
    "onboarding-screen",
    "login-screen-title",
    "learner-name-screen-title",
    "language-select-screen-next",
  ]) {
    expect(present(id)).toBe(false);
  }
  expect(screen.getByTestId("ui-lynx-special-unit-catalog-cover-u00-tutorial")).toHaveAttribute(
    "data-status",
    "clear",
  );
  expect(screen.getByTestId("top-bar-streak")).toHaveAttribute(
    "accessibility-label",
    "0-day streak",
  );
  expect(second.events.filter((event) => event.name.startsWith("entry_"))).toEqual([]);
  expect(second.register).not.toHaveBeenCalled();
});

// ------------------------------------------------------------------------- GE12

test("[GE12] 분석 sink · 식별이 없는 부팅에서도 비회원 완주와 설정 로그인이 던지지 않는다", async () => {
  const host = installGuestHost();
  await renderGuestApp(host, { platform: "ios", bare: true });
  await walkGuestEntryToMap();
  await finishFirstUnit();

  expect(present("journey-map-screen")).toBe(true);
  expect(host.store.get(guestMarkerKey)).toBe("1");
  openSettingsTab();
  await signInFromSettingsWithGoogle();

  expect(present("settings-screen-title")).toBe(true);
  expect(host.store.has(guestMarkerKey)).toBe(false);
  expect(host.store.has(authSessionStorageKey)).toBe(true);
});
