import { afterEach, expect, test } from "vitest";
import { cleanup, fireEvent, screen } from "@lynx-js/react/testing-library";

import { authSessionStorageKey } from "../lib/auth-session";
import { localDayFrom } from "../lib/progress-api";
import { TUTORIAL_EPISODE_ID } from "../lib/tutorial-episode";
import {
  bootGuestAfterFirstUnit,
  eventLabels,
  guestDaysKey,
  guestMarkerKey,
  guestProfileOf,
  guestProgressKey,
  installGuestHost,
  openSettingsTab,
  present,
  renderGuestApp,
  resetGuestHost,
  settingsItemIds,
  signInFromSettingsWithGoogle,
} from "./test-helpers/guest-entry";
import type { GuestHost } from "./test-helpers/guest-entry";
import { catalogNodeTestId } from "./test-helpers/map-unit-testid";
import { emptyContractState, progressApi } from "./test-helpers/progress-state-api";

// `integration` 계층: 비회원이 설정에서 로그인할 때 — 기기 기록의 이관 · 서버와 합치기 · 세션 · 식별 · 설정 루트로 복귀 ·
// 알림 질문 · 재실행 세션 갱신(ADR-0111 §2-2). 대역은 경계뿐입니다(`test-helpers/guest-entry`).

afterEach(() => {
  cleanup();
  resetGuestHost();
});

const U00 = TUTORIAL_EPISODE_ID;
const today = (): string => localDayFrom(new Date());
const settingsId = (id: string): string => `ui-lynx-settings-group-item-${id}`;
const lastBody = (host: GuestHost, rpc: string): Record<string, unknown> => {
  const bodies = host.bodiesOf(rpc);
  return bodies[bodies.length - 1] as Record<string, unknown>;
};
const navigatorItems = (): HTMLElement[] =>
  screen.queryAllByTestId(/^ui-lynx-bottom-navigator-item-/);

// ------------------------------------------------------------------------- GE7

test("[GE7] 설정에서 google로 로그인하면 비회원 기록이 사용자 기록으로 올라가고 설정 루트로 돌아오며 알림을 묻는다", async () => {
  const host = installGuestHost({ userId: "u1" });
  await bootGuestAfterFirstUnit(host);
  const guestProfile = guestProfileOf(host);
  openSettingsTab();

  await signInFromSettingsWithGoogle();

  // 표식 · 비회원 칸은 사라지고 세션이 선다.
  expect(host.store.has(guestMarkerKey)).toBe(false);
  expect(host.store.has(guestProgressKey)).toBe(false);
  expect(host.store.has(guestDaysKey)).toBe(false);
  expect(host.store.has(authSessionStorageKey)).toBe(true);
  // 서버로 올라간 것: 진행 스냅숏 · 그 날 · 손님 프로필.
  const saved = lastBody(host, "save_learning_progress")["p_progress"] as Record<string, unknown>;
  expect(saved["catalogProgress"]).toEqual({ [U00]: ["intro"] });
  expect(lastBody(host, "record_learning_days")["p_days"]).toEqual([today()]);
  expect(lastBody(host, "save_learner_profile")).toEqual({
    p_name: guestProfile.name,
    p_country_code: guestProfile.countryCode,
  });
  expect(host.identify).toHaveBeenCalledTimes(1);
  expect(host.identify).toHaveBeenCalledWith("u1");
  // 화면은 설정 루트 — 판정 · 언어 선택 · 여정 입장을 다시 지나지 않는다.
  expect(present("settings-screen-title")).toBe(true);
  expect(present("login-screen-title")).toBe(false);
  expect(present("language-select-screen-next")).toBe(false);
  expect(present("journey-entry-screen-start")).toBe(false);
  expect(navigatorItems()).toHaveLength(4);
  expect(settingsItemIds()).toContain(settingsId("sign-out"));
  expect(settingsItemIds()).not.toContain(settingsId("sign-in"));
  // 이벤트 · 알림.
  const labels = eventLabels(host.events);
  expect(labels).toContain("entry_login_method_selected:google");
  expect(labels.some((label) => label.startsWith("entry_returning_learner_entered"))).toBe(false);
  expect(host.register).toHaveBeenCalledTimes(1);
});

// ------------------------------------------------------------------------- GE8

test("[GE8] 서버에 이미 진행 · 프로필이 있으면 진행은 합쳐 올라가고 프로필은 기기 값이 이긴다", async () => {
  const serverState = {
    ...emptyContractState,
    catalogProgress: { [U00]: ["S1"] },
  };
  const serverSnapshot = progressApi.learningProgressSnapshotFrom(serverState);
  const host = installGuestHost({
    userId: "u1",
    serverProgress: serverSnapshot,
    serverProfile: { name: "Server", countryCode: "US" },
  });
  await bootGuestAfterFirstUnit(host);
  const guestProfile = guestProfileOf(host);
  const guestState = progressApi.journeyProgressFrom(
    JSON.parse(host.store.get(guestProgressKey) ?? "null"),
  );
  if (guestState === null) throw new Error("비회원 진행이 저장소에 없습니다");
  openSettingsTab();

  await signInFromSettingsWithGoogle();

  const expected = progressApi.learningProgressSnapshotFrom(
    // 동기화 객체는 기기 값(비회원 칸에서 옮긴 미전송)을 먼저, 서버 값을 뒤에 합친다(ADR-0062 — 변경 0).
    progressApi.mergeJourneyProgress(guestState, serverState),
  );
  expect(lastBody(host, "save_learning_progress")["p_progress"]).toEqual(expected);
  expect(lastBody(host, "save_learner_profile")).toEqual({
    p_name: guestProfile.name,
    p_country_code: guestProfile.countryCode,
  });

  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});
  expect(screen.getByTestId("ui-lynx-special-unit-catalog-cover-u00-tutorial")).toHaveAttribute(
    "data-status",
    "clear",
  );
  expect(screen.getByTestId(catalogNodeTestId(U00, "S1"))).toHaveAttribute("data-status", "clear");
});

// ------------------------------------------------------------------------- GE9

test("[GE9] 설정 로그인 뒤 다시 켜면 세션 갱신 한 번으로 맵이 서고 비회원 표식 · 칸이 없다", async () => {
  const first = installGuestHost({ userId: "u1" });
  await bootGuestAfterFirstUnit(first);
  openSettingsTab();
  await signInFromSettingsWithGoogle();
  cleanup();
  resetGuestHost();

  const second = installGuestHost({ store: first.store, userId: "u1" });
  await renderGuestApp(second, { platform: "ios" });

  const refreshes = second.requests.filter((request) => request.url.includes("grant_type=refresh"));
  expect(refreshes).toHaveLength(1);
  expect(present("journey-map-screen")).toBe(true);
  expect(present("login-screen-title")).toBe(false);
  expect(present("onboarding-screen")).toBe(false);
  expect(Array.from(second.store.keys()).filter((key) => key.endsWith(".guest"))).toEqual([]);
});
