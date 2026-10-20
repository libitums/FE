// 기존 회원 로그인 통합 테스트의 무대입니다. 제품 코드가 import하지 않습니다.
// 경계만 대역으로 세웁니다 — 저장소 · 웹 인증 · Apple · 푸시(`NativeModules`)와 `fetch`.

import { vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { App } from "../App";
import { learningProgressSnapshotFrom } from "../learning-progress";
import { productJourneySeed } from "../journey-progress";
import { entrySplashDurationMs } from "../../lib/entry-flow";
import type { EntryEvent, EntryLoginMethod } from "../../lib/entry-flow";
import { contentNotFoundResponse, isContentRequest } from "./content-requests";

export type Reply = { readonly status: number; readonly body: string };
export type Responder = () => Promise<Reply>;
export type Deferred = { readonly promise: Promise<Reply>; resolve: (reply: Reply) => void };

export function deferredReply(): Deferred {
  let resolve!: (reply: Reply) => void;
  const promise = new Promise<Reply>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

export function jsonReply(value: unknown): Reply {
  return { status: 200, body: JSON.stringify(value) };
}

export const unavailableReply: Reply = { status: 503, body: "" };
export const noRecord: Responder = () => Promise.resolve(jsonReply(null));
export const answer =
  (reply: Reply): Responder =>
  () =>
    Promise.resolve(reply);
export const waitFor =
  (gate: Deferred): Responder =>
  () =>
    gate.promise;

export const learnerProfileRecord = { name: "Mina", countryCode: "KR" };
const baseState = { ...productJourneySeed, completedEpisodeIntroIds: [], catalogProgress: {} };
export const startedProgress = learningProgressSnapshotFrom({
  ...baseState,
  completedStepCount: 1,
});
export const novelProgress = learningProgressSnapshotFrom({
  ...baseState,
  visualNovelProgress: { status: "active", beatIndex: 1 },
});

export type ServerOptions = { progress: Responder; profile: Responder };
export type Server = { readonly rpcs: string[] };

export const accessTokenWithSub = `e30.${btoa(JSON.stringify({ sub: "user-1" })).replace(/=+$/, "")}.sig`;

const sessionBody = JSON.stringify({
  access_token: accessTokenWithSub,
  token_type: "bearer",
  expires_in: 3600,
  refresh_token: "refresh-token-1",
  user: { id: "user-1" },
});

export function stubServer(options: ServerOptions): Server {
  vi.stubEnv("PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  const rpcs: string[] = [];
  const text = (reply: Reply) => ({ status: reply.status, text: async () => reply.body });
  vi.stubGlobal("fetch", async (url: string) => {
    if (isContentRequest(url)) return contentNotFoundResponse();
    const rpc = url.split("/rest/v1/rpc/")[1];
    if (rpc === undefined) {
      return text({ status: 200, body: url.endsWith("/auth/v1/otp") ? "{}" : sessionBody });
    }
    rpcs.push(rpc);
    if (rpc === "load_learning_progress") return text(await options.progress());
    if (rpc === "load_learner_profile") return text(await options.profile());
    return text({ status: 204, body: "" });
  });
  return { rpcs };
}

export type Host = {
  readonly store: Map<string, string>;
  readonly webStarts: unknown[];
  readonly register: ReturnType<typeof vi.fn<(callback: (payload: unknown) => void) => void>>;
};

export function stubHost(initial: Record<string, string> = {}): Host {
  const store = new Map<string, string>(Object.entries(initial));
  const webStarts: unknown[] = [];
  const register = vi.fn<(callback: (payload: unknown) => void) => void>((callback) =>
    callback({ permission: "authorized", token: "push-token-1", environment: "sandbox" }),
  );
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, value: string) => void store.set(key, value),
      remove: (key: string) => void store.delete(key),
    },
    WebAuthenticationModule: {
      randomBytes: () => "7418dfb49799e0254ffa607dd8adbbba16d4254d69d6bff05b58055853848d79",
      start: (args: unknown, callback: (payload: unknown) => void) => {
        webStarts.push(args);
        callback({ status: "completed", callbackUrl: "duru://auth-callback?code=abc" });
      },
    },
    AppleSignInModule: {
      start: (_args: unknown, callback: (payload: unknown) => void) =>
        callback({ status: "completed", identityToken: "apple-id-token-1" }),
    },
    PushNotificationModule: {
      getStatus: (callback: (payload: unknown) => void) =>
        callback({ permission: "not-determined" }),
      register,
      takeOpened: (callback: (payload: unknown) => void) => callback({ target: null }),
      openSettings: vi.fn<() => void>(),
    },
  });
  return { store, webStarts, register };
}

export async function advance(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

/** 연쇄된 미세 작업(조회 → 판정 → 전이)을 가짜 시간을 쓰지 않고 흘립니다. */
export async function settle(): Promise<void> {
  for (let round = 0; round < 6; round += 1) await advance(0);
}

export function bootToOnboarding(): EntryEvent[] {
  const events: EntryEvent[] = [];
  vi.useFakeTimers();
  render(<App phoneSignIn="visible" entryEventSink={(event) => events.push(event)} />);
  act(() => {
    vi.advanceTimersByTime(entrySplashDurationMs);
  });
  return events;
}

export const tapButtonIn = (id: string): void =>
  void fireEvent.tap(within(screen.getByTestId(id)).getByTestId("ui-lynx-button"), {});
export const present = (id: string): boolean => screen.queryByTestId(id) !== null;

export function completeOnboarding(): void {
  for (let step = 0; step < 3; step += 1) tapButtonIn("onboarding-screen-next");
}

function dispatchInput(selector: string, value: string): void {
  const EventConstructor = document.defaultView?.CustomEvent;
  if (!EventConstructor) throw new Error("CustomEvent is unavailable");
  const ref = lynx.createSelectorQuery().select(selector);
  fireEvent(
    ref as unknown as Element,
    new EventConstructor("bindEvent:input", { detail: { value } }),
  );
}

export function typeText(value: string): void {
  dispatchInput('[data-testid="ui-lynx-text-field-input"]', value);
}

export function typeCode(value: string): void {
  Array.from(value).forEach((digit, index) =>
    dispatchInput(`.verification-code-screen-digit-${index} .ui-lynx-compact-numeric-input`, digit),
  );
}

export async function tapSocial(method: EntryLoginMethod): Promise<void> {
  tapButtonIn(`login-screen-method-${method}`);
  await settle();
}

/** 번호 제출 → 코드 화면 → 여섯 자리 입력까지. 확인은 호출부가 누릅니다. */
export async function phoneUntilCode(): Promise<void> {
  typeText("10 1234 5678");
  tapButtonIn("login-screen-method-phone");
  await settle();
  typeCode("123456");
}

export function eventNames(events: readonly EntryEvent[]): string[] {
  return events.map((event) => {
    if (event.name === "entry_screen_viewed") return `viewed:${event.screen}`;
    if ("method" in event) return `${event.name}:${event.method}`;
    return event.name;
  });
}
