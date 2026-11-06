import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { EntryEvent } from "../lib/entry-flow";
import { guestSessionStorageKey } from "../lib/guest-session";
import { authSessionStorageKey } from "../lib/auth-session";
import type { AuthSession } from "../lib/auth-session.contract";
import { noLearnerProfilePort } from "../lib/learner-profile";
import type { LearnerProfilePort, LearnerProfileRecord } from "../lib/learner-profile.contract";
import type { SocialSignInResult, SupabaseOAuthProvider } from "../lib/social-sign-in.contract";
import { guestWiring } from "./guest-wiring";
import type { GuestWiringArgs } from "./guest-wiring";
import type { NavAction } from "./nav-state";

// 비회원 결선(ADR-0111 §2-2) — 순서가 계약이다. 로그는 한 줄에 하나씩 쌓인다.

const signInMock = vi.hoisted(() => vi.fn<(provider: SupabaseOAuthProvider) => Promise<unknown>>());
const adoptMock = vi.hoisted(() => vi.fn<(userId: string) => void>());
const storeMock = vi.hoisted(() => vi.fn<(session: unknown, deps: unknown) => string | null>());
const pushMock = vi.hoisted(() => vi.fn<(options: { readonly ask: boolean }) => Promise<void>>());
const probeMock = vi.hoisted(() => vi.fn<() => Promise<unknown>>());

vi.mock("../lib/social-sign-in", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/social-sign-in")>();
  return { ...actual, signInWithSocialProvider: signInMock };
});
vi.mock("./guest-progress", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./guest-progress")>();
  return { ...actual, adoptGuestRecords: adoptMock };
});
vi.mock("./store-session", () => ({ storeSignedInSession: storeMock }));
vi.mock("./push-wiring", () => ({ syncPushDevice: pushMock }));
vi.mock("./returning-learner-probe", () => ({ probeEntryRouteAfterLogin: probeMock }));

function tokenFor(sub: string | null): string {
  const payload = btoa(JSON.stringify(sub === null ? {} : { sub }))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
  return `e30.${payload}.sig`;
}

function sessionFor(sub: string | null): AuthSession {
  return { accessToken: tokenFor(sub), refreshToken: "refresh", expiresAt: 9_999_999_999 };
}

function describeEvent(event: EntryEvent): string {
  if (event.name === "entry_screen_viewed") return `event:${event.name}:${event.screen}`;
  if (event.name === "entry_login_method_selected") return `event:${event.name}:${event.method}`;
  return `event:${event.name}`;
}

let store: Map<string, string>;
let log: string[];
let actions: NavAction[];
let events: EntryEvent[];
let fetchSpy: ReturnType<typeof vi.fn>;
let identify: ReturnType<typeof vi.fn<(userId: string) => void>>;

beforeEach(() => {
  store = new Map();
  log = [];
  actions = [];
  events = [];
  fetchSpy = vi.fn();
  identify = vi.fn<(userId: string) => void>();
  vi.stubGlobal("fetch", fetchSpy);
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, value: string) => {
        if (key === guestSessionStorageKey) log.push("saveGuestSession");
        store.set(key, value);
      },
      remove: (key: string) => void store.delete(key),
    },
  });
  for (const mock of [signInMock, adoptMock, storeMock, pushMock, probeMock]) mock.mockReset();
  adoptMock.mockImplementation((userId) => void log.push(`adoptGuestRecords:${userId}`));
  storeMock.mockImplementation(() => {
    log.push("storeSignedInSession");
    return null;
  });
  pushMock.mockImplementation(async ({ ask }) => void log.push(`syncPushDevice:ask=${ask}`));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function build(overrides: Partial<GuestWiringArgs> = {}) {
  const syncLearnerProfile = vi.fn<() => Promise<void>>(async () => {
    log.push("syncLearnerProfile");
  });
  const syncProgress = vi.fn<() => Promise<void>>(async () => undefined);
  const args: GuestWiringArgs = {
    dispatch: (action) => {
      actions.push(action);
      log.push(`dispatch:${action.type}`);
    },
    entryEventSink: (event) => {
      events.push(event);
      log.push(describeEvent(event));
    },
    analyticsUser: { identify, reset: () => undefined },
    syncProgress,
    syncLearnerProfile,
    startGuestProgress: () => void log.push("startGuestProgress"),
    setAccountState: (state) => void log.push(`setAccountState:${state}`),
    learnerRecord: null,
    learnerPort: noLearnerProfilePort,
    ...overrides,
  };
  return { args, syncLearnerProfile, syncProgress, wiring: guestWiring(args) };
}

describe("onContinueAsGuest", () => {
  test("GW1. 표식 저장 → 상태 guest → 비회원 진행 → 이벤트 둘 → ① 이름 push 순서이고 서버 쪽 일은 0이다", () => {
    const { wiring, syncLearnerProfile } = build();

    wiring.onContinueAsGuest();

    expect(log).toEqual([
      "saveGuestSession",
      "setAccountState:guest",
      "startGuestProgress",
      "event:entry_login_method_selected:guest",
      "event:entry_screen_viewed:learner-name",
      "dispatch:push",
    ]);
    expect(store.get(guestSessionStorageKey)).toBe("1");
    expect(actions).toEqual([
      { type: "push", screen: { name: "learner-name", initialName: expect.any(String) } },
    ]);
    expect(events).toEqual([
      { name: "entry_login_method_selected", method: "guest" },
      { name: "entry_screen_viewed", screen: "learner-name" },
    ]);
    expect(store.has(authSessionStorageKey)).toBe(false);
    expect(identify).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(syncLearnerProfile).not.toHaveBeenCalled();
    expect(storeMock).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
    expect(probeMock).not.toHaveBeenCalled();
  });

  test("GW2. 이름 칸은 기기에 남은 기록의 이름으로, 없으면 learnerPort.randomName(null)로 채운다", () => {
    const record: LearnerProfileRecord = { name: "Emma", countryCode: "DE" };
    build({ learnerRecord: record }).wiring.onContinueAsGuest();

    expect(actions).toEqual([
      { type: "push", screen: { name: "learner-name", initialName: "Emma" } },
    ]);

    actions = [];
    const randomName = vi.fn<(previous: string | null) => string>(() => "Mai");
    const port: LearnerProfilePort = { ...noLearnerProfilePort, randomName };
    build({ learnerRecord: null, learnerPort: port }).wiring.onContinueAsGuest();

    expect(randomName).toHaveBeenCalledWith(null);
    expect(actions).toEqual([
      { type: "push", screen: { name: "learner-name", initialName: "Mai" } },
    ]);
  });
});

describe("onSignIn · onGuestSignInBack", () => {
  test("GW3. onSignIn은 로그인 열람 이벤트 → guest-login push이고 뒤로는 back이다", () => {
    const { wiring } = build();

    wiring.onSignIn();

    expect(log).toEqual(["event:entry_screen_viewed:login", "dispatch:push"]);
    expect(actions).toEqual([{ type: "push", screen: { name: "guest-login" } }]);

    actions = [];
    wiring.onGuestSignInBack();

    expect(actions).toEqual([{ type: "back" }]);
  });
});

describe("onSelectGuestSignInMethod", () => {
  const signedIn = (sub: string | null): SocialSignInResult => ({
    status: "signed-in",
    session: sessionFor(sub),
  });

  test("GW4. 성공이면 이관 → 세션 저장 → 이벤트 → 프로필 동기화 → 설정 루트 → 알림 ask 순서이고 판정은 지나지 않는다", async () => {
    signInMock.mockResolvedValue(signedIn("u1"));
    const { wiring, args } = build();

    const outcome = await wiring.onSelectGuestSignInMethod("google");

    expect(signInMock).toHaveBeenCalledWith("google");
    expect(log).toEqual([
      "adoptGuestRecords:u1",
      "storeSignedInSession",
      "event:entry_login_method_selected:google",
      "syncLearnerProfile",
      "dispatch:backToRoot",
      "syncPushDevice:ask=true",
    ]);
    expect(outcome).toEqual({ status: "signed-in" });
    expect(actions).toEqual([{ type: "backToRoot" }]);
    expect(storeMock).toHaveBeenCalledWith(
      sessionFor("u1"),
      expect.objectContaining({
        analyticsUser: args.analyticsUser,
        syncProgress: args.syncProgress,
        setAccountState: args.setAccountState,
      }),
    );
    expect(probeMock).not.toHaveBeenCalled();
    expect(events.some((event) => event.name === "entry_returning_learner_entered")).toBe(false);
    expect(actions.some((action) => action.type === "push")).toBe(false);
  });

  test("GW5. cancelled · failed는 결과를 그대로 돌려주고 저장 · 이벤트 · 전이가 0이며 표식은 그대로다", async () => {
    store.set(guestSessionStorageKey, "1");
    const { wiring } = build();

    signInMock.mockResolvedValueOnce({ status: "cancelled" });
    expect(await wiring.onSelectGuestSignInMethod("google")).toEqual({ status: "cancelled" });

    signInMock.mockResolvedValueOnce({ status: "failed", reason: "network" });
    expect(await wiring.onSelectGuestSignInMethod("apple")).toEqual({
      status: "failed",
      reason: "network",
    });

    expect(log).toEqual([]);
    expect(adoptMock).not.toHaveBeenCalled();
    expect(storeMock).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
    expect(events).toEqual([]);
    expect(actions).toEqual([]);
    expect(store.get(guestSessionStorageKey)).toBe("1");
  });

  test("GW6. 토큰에 sub가 없으면 이관하지 않고(비회원 칸 유지) 나머지 순서는 같다", async () => {
    signInMock.mockResolvedValue(signedIn(null));
    const { wiring } = build();

    const outcome = await wiring.onSelectGuestSignInMethod("google");

    expect(adoptMock).not.toHaveBeenCalled();
    expect(log).toEqual([
      "storeSignedInSession",
      "event:entry_login_method_selected:google",
      "syncLearnerProfile",
      "dispatch:backToRoot",
      "syncPushDevice:ask=true",
    ]);
    expect(outcome).toEqual({ status: "signed-in" });
  });
});
