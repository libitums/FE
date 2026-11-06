import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { APP_POLICY_KEY } from "../lib/app-policy";
import type { AppVersion } from "../lib/app-version";
import { authSessionStorageKey } from "../lib/auth-session";
import type { AuthSession, SessionRefreshResult } from "../lib/auth-session.contract";
import { guestSessionStorageKey } from "../lib/guest-session";
import { entryWiring } from "./entry-wiring";
import type { EntryWiringArgs } from "./entry-wiring";
import type { NavAction } from "./nav-state";
import { noLearnerProfilePort } from "../lib/learner-profile";
import type { LearnerProfileRecord } from "../lib/learner-profile.contract";

// 세션 갱신 · 알림 등록은 이 파일이 보는 축이 아니라 경계에서 대체합니다(갱신 호출 횟수만 봅니다).
const refreshMock = vi.hoisted(() => vi.fn<(token: string) => Promise<SessionRefreshResult>>());
vi.mock("../lib/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/api-client")>();
  return { ...actual, refreshAuthSession: refreshMock };
});
vi.mock("./push-wiring", () => ({
  syncPushDevice: vi.fn<() => Promise<void>>(async () => undefined),
}));

// 가입 직후 ① 이름 · ② 나라의 결선(ADR-0059 D7 2026-10-20)입니다 — 전이 · 저장 · 이벤트 순서만 봅니다.

const emma: LearnerProfileRecord = { name: "Emma", countryCode: "DE" };

function harness(learnerRecord: LearnerProfileRecord | null) {
  const log: string[] = [];
  const actions: NavAction[] = [];
  const args: EntryWiringArgs = {
    entryEventSink: (event) =>
      void log.push(
        `event:${event.name}${"screen" in event ? `:${event.screen}` : ""}${"entry" in event ? `:${event.entry}:${event.change}` : ""}`,
      ),
    analyticsUser: null,
    appVersion: null,
    dispatch: (action) => {
      actions.push(action);
      log.push(`dispatch:${action.type}`);
    },
    entryLanguage: "en",
    setEntryLanguage: () => undefined,
    syncProgress: async () => undefined,
    learnerRecord,
    learnerPort: noLearnerProfilePort,
    saveLearnerProfile: (record) => void log.push(`save:${record.name}:${record.countryCode}`),
    syncLearnerProfile: async () => undefined,
    startGuestProgress: () => undefined,
    setAccountState: () => undefined,
  };
  return { log, actions, wiring: entryWiring(args) };
}

test("EW1. 온보딩 완료는 값 없이 로그인으로 간다", () => {
  const { log, actions, wiring } = harness(null);

  wiring.onOnboardingComplete();

  expect(log).toEqual(["event:entry_screen_viewed:login", "dispatch:push"]);
  expect(actions).toEqual([{ type: "push", screen: { name: "login" } }]);
});

test("EW2. ① 이름의 Continue는 친 이름을 route에 남기고 ② 나라로 간다", () => {
  const { log, actions, wiring } = harness(null);

  wiring.onContinueLearnerName("Mai");

  expect(actions).toEqual([
    { type: "replace", screen: { name: "learner-name", initialName: "Mai" } },
    { type: "push", screen: { name: "learner-country", learnerName: "Mai" } },
  ]);
  expect(log).toContain("event:entry_screen_viewed:learner-country");
  expect(log.some((line) => line.startsWith("save"))).toBe(false);
});

test("EW3. ② 나라의 Continue는 저장 → 저장 이벤트(signup · created) → 언어 선택 순이다", () => {
  const { log, actions, wiring } = harness(null);

  wiring.onContinueLearnerCountry(emma);

  expect(log).toEqual([
    "save:Emma:DE",
    "event:learner_profile_saved:signup:created",
    "event:entry_screen_viewed:language-select",
    "dispatch:push",
  ]);
  expect(actions).toEqual([{ type: "push", screen: { name: "language-select" } }]);
});

test("EW4. 이미 같은 기록이면 저장도 저장 이벤트도 없이 언어 선택으로 간다", () => {
  const { log, wiring } = harness(emma);

  wiring.onContinueLearnerCountry(emma);

  expect(log).toEqual(["event:entry_screen_viewed:language-select", "dispatch:push"]);
});

test("EW5. 다른 기록으로 고치면 updated로 저장한다", () => {
  const { log, wiring } = harness(emma);

  wiring.onContinueLearnerCountry({ name: "Emma", countryCode: "FR" });

  expect(log.slice(0, 2)).toEqual(["save:Emma:FR", "event:learner_profile_saved:signup:updated"]);
});

test("EW6. ① · ② 의 뒤로는 진입 스택에서 한 칸 뒤다", () => {
  const { actions, wiring } = harness(null);

  wiring.onLearnerProfileStepBack();

  expect(actions).toEqual([{ type: "back" }]);
});

// ---------------------------------------------------------------- 스플래시의 비회원 갈래 (ADR-0111 §2-4)

const savedSession: AuthSession = {
  accessToken: "e30.e30.sig",
  refreshToken: "saved-refresh",
  expiresAt: 9_999_999_999,
};
const refreshedSession: AuthSession = { ...savedSession, refreshToken: "next-refresh" };

let hostStore: Map<string, string>;
let fetchSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  hostStore = new Map();
  fetchSpy = vi.fn();
  vi.stubGlobal("fetch", fetchSpy);
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (key: string) => hostStore.get(key) ?? null,
      set: (key: string, value: string) => void hostStore.set(key, value),
      remove: (key: string) => void hostStore.delete(key),
    },
  });
  refreshMock.mockReset();
  refreshMock.mockResolvedValue({ status: "refreshed", session: refreshedSession });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// `startGuestProgress` · `setAccountState`는 scaffold 단계의 `EntryWiringArgs`에 아직 없습니다. 변수에 담아 넘겨
// (객체 리터럴 초과 속성 검사 밖) 타입 단언 없이 계약의 인자 모양으로 부릅니다.
function guestHarness(appVersion: AppVersion | null = null) {
  const calls: string[] = [];
  const actions: NavAction[] = [];
  const startGuestProgress = vi.fn<() => void>(() => void calls.push("startGuestProgress"));
  const syncLearnerProfile = vi.fn<() => Promise<void>>(async () => undefined);
  const entryEventSink = vi.fn<(event: unknown) => void>();
  const args = {
    entryEventSink,
    analyticsUser: null,
    appVersion,
    dispatch: (action: NavAction) => {
      actions.push(action);
      calls.push(`dispatch:${action.type}`);
    },
    entryLanguage: "en" as const,
    setEntryLanguage: () => undefined,
    syncProgress: async () => undefined,
    learnerRecord: null,
    learnerPort: noLearnerProfilePort,
    saveLearnerProfile: () => undefined,
    syncLearnerProfile,
    startGuestProgress,
    setAccountState: () => undefined,
  };
  return {
    calls,
    actions,
    startGuestProgress,
    syncLearnerProfile,
    entryEventSink,
    wiring: entryWiring(args),
  };
}

test("EW7. 표식만 있고 세션이 없으면 스플래시 종료가 startGuestProgress → enterApp이고 그 밖의 일은 0이다", () => {
  hostStore.set(guestSessionStorageKey, "1");
  const { calls, actions, startGuestProgress, syncLearnerProfile, entryEventSink, wiring } =
    guestHarness();

  wiring.onSplashTimeout();

  expect(calls).toEqual(["startGuestProgress", "dispatch:enterApp"]);
  expect(actions).toEqual([{ type: "enterApp" }]);
  expect(startGuestProgress).toHaveBeenCalledTimes(1);
  expect(actions.some((action) => action.type === "replace")).toBe(false);
  expect(refreshMock).not.toHaveBeenCalled();
  expect(fetchSpy).not.toHaveBeenCalled();
  expect(entryEventSink).not.toHaveBeenCalled();
  expect(syncLearnerProfile).not.toHaveBeenCalled();
});

test("EW8. 표식과 세션이 둘 다 있으면 세션이 이겨 갱신을 한 번 부르고 비회원 진행은 세우지 않는다", async () => {
  hostStore.set(guestSessionStorageKey, "1");
  hostStore.set(authSessionStorageKey, JSON.stringify(savedSession));
  const { actions, startGuestProgress, wiring } = guestHarness();

  wiring.onSplashTimeout();

  await vi.waitFor(() => expect(actions).toEqual([{ type: "enterApp" }]));
  expect(refreshMock).toHaveBeenCalledTimes(1);
  expect(refreshMock).toHaveBeenCalledWith("saved-refresh");
  expect(startGuestProgress).not.toHaveBeenCalled();
});

test("EW9. 강제 업데이트가 required면 표식이 있어도 update-required로 replace하고 비회원 진행은 세우지 않는다", () => {
  hostStore.set(guestSessionStorageKey, "1");
  hostStore.set(APP_POLICY_KEY, JSON.stringify({ schema: "app-policy-1", min_build: { ios: 99 } }));
  const { actions, startGuestProgress, wiring } = guestHarness({
    platform: "ios",
    name: "1.0",
    build: 1,
  });

  wiring.onSplashTimeout();

  expect(actions).toEqual([{ type: "replace", screen: { name: "update-required" } }]);
  expect(startGuestProgress).not.toHaveBeenCalled();
  expect(refreshMock).not.toHaveBeenCalled();
});
