// Airbridge 이벤트 결선 integration 테스트의 공용 대역 · 조립 · 진입 흐름 구동입니다.
// 제품 코드가 import하지 않습니다. 이름에 `.test.`를 넣지 않습니다.
//
// 이 헬퍼는 스스로 풀지 않습니다. 쓰는 파일의 `afterEach`가 `vi.unstubAllGlobals()`와
// `vi.unstubAllEnvs()`를 함께 부릅니다.

import { vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { App } from "../App";
import type {
  AnalyticsConfig,
  AnalyticsEventSinks,
  AnalyticsRequestInit,
  AnalyticsTransport,
} from "../../lib/analytics.contract";
import { analyticsConfigFrom } from "../../lib/analytics-config";
import { productEventSinks } from "../../lib/airbridge-events-module";
import type { Milestone, MilestoneStore } from "../../lib/companion-events";
import { createAnalyticsSession } from "../../lib/posthog-client";
import { contentNotFoundResponse, isContentRequest } from "./content-requests";
import { passSplash } from "./pass-splash";
import { passLearnerBirthYearIfShown, passLearnerSignup } from "./learner-signup";

const config: AnalyticsConfig | null = analyticsConfigFrom("phc_integration_test", "development");

export type TrackEventCall = readonly [string, Record<string, string>];
export type AirbridgeHostMode = "ok" | "throws" | "absent";
export type TransportCall = { url: string; init: AnalyticsRequestInit };

/** 호스트 `AirbridgeEventsModule` 대역을 세웁니다. `absent`는 모듈 없이 `NativeModules`만 비웁니다. */
export function stubAirbridgeHost(mode: AirbridgeHostMode): TrackEventCall[] {
  const calls: TrackEventCall[] = [];
  const trackEvent = (category: string, semanticAttributes: Record<string, string>) => {
    calls.push([category, semanticAttributes]);
    if (mode === "throws") throw new Error("host trackEvent failed");
  };
  vi.stubGlobal(
    "NativeModules",
    mode === "absent" ? {} : { AirbridgeEventsModule: { trackEvent } },
  );
  return calls;
}

export function fakeTransport(): { transport: AnalyticsTransport; calls: TransportCall[] } {
  const calls: TransportCall[] = [];
  const transport: AnalyticsTransport = async (url, init) => {
    calls.push({ url, init });
    return { status: 200, text: async () => "", json: async () => ({}) };
  };
  return { transport, calls };
}

export function sentEventNames(calls: readonly TransportCall[]): string[] {
  return calls.flatMap((call) => {
    const body: unknown = JSON.parse(call.init.body);
    if (typeof body !== "object" || body === null || !("batch" in body)) return [];
    return (body as { batch: { event: string }[] }).batch.map((e) => e.event);
  });
}

/** 이번 테스트 안에서만 기억하는 첫 경험 마일스톤 저장소입니다(기기 저장소 대역과 섞이지 않게). */
export function memoryMilestoneStore(): MilestoneStore {
  const done = new Set<Milestone>();
  return {
    done: (milestone) => done.has(milestone),
    mark: (milestone) => void done.add(milestone),
  };
}

/**
 * 진입점의 조립 그대로 — `productEventSinks(session.sinks)`(Airbridge 전달 + 바깥의 첫 경험 마일스톤, 2026-11-24).
 * `analyticsConfig`를 `null`로 주면 transport가 꽂혀 있어도 PostHog만 꺼집니다(I6). 호스트 모듈 대역은 먼저 세웁니다.
 */
export function assembleSinks(
  transport: AnalyticsTransport | null,
  analyticsConfig: AnalyticsConfig | null = config,
): AnalyticsEventSinks {
  const session = createAnalyticsSession(analyticsConfig, transport);
  return productEventSinks(session.sinks, memoryMilestoneStore());
}

const tapButton = (testId: string) =>
  fireEvent.tap(within(screen.getByTestId(testId)).getByTestId("ui-lynx-button"), {});

async function advance(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

function stubEntryHost(): void {
  const store = new Map<string, string>();
  const previous = (globalThis as { NativeModules?: Record<string, unknown> }).NativeModules ?? {};
  vi.stubGlobal("NativeModules", {
    ...previous,
    StorageModule: {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, value: string) => void store.set(key, value),
      remove: (key: string) => void store.delete(key),
    },
    WebAuthenticationModule: { start: () => undefined, randomBytes: () => "7418dfb4".repeat(8) },
    AppleSignInModule: {
      start: (_args: unknown, done: (payload: unknown) => void) =>
        done({ status: "completed", identityToken: "apple-id-token-1" }),
    },
  });
  vi.stubEnv("PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  const session = JSON.stringify({
    access_token: "access-token-1",
    token_type: "bearer",
    expires_in: 3600,
    refresh_token: "refresh-token-1",
    user: { id: "user-1" },
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url.includes("/rest/v1/rpc/")) return { status: 200, text: async () => "null" };
      if (isContentRequest(url)) return contentNotFoundResponse();
      if (url.includes("grant_type=id_token")) return { status: 200, text: async () => session };
      throw new Error(`entry harness: unstubbed route for ${url}`);
    }),
  );
}

/**
 * 진입 흐름을 「여정 시작하기」까지 구동합니다(Apple 시트 대역). `beforeStart`는 로그인 수단 선택 ·
 * 언어 선택을 지난 뒤 마지막 버튼 직전에 불립니다. 끝나면 실제 타이머로 돌아옵니다.
 * 호스트 모듈 대역은 부르기 전에 `stubAirbridgeHost`로 세웁니다.
 */
export async function runEntryFlow(
  sinks: AnalyticsEventSinks,
  beforeStart: () => void = () => undefined,
): Promise<void> {
  stubEntryHost();
  vi.useFakeTimers();
  render(<App phoneSignIn="visible" {...sinks} />);
  await passSplash();
  // 온보딩은 세 스텝이고, 가입 직후 ① 이름 · ② 나라를 지나 언어 선택에 섭니다(ADR-0059 D7 2026-10-20).
  tapButton("onboarding-screen-start");
  tapButton("login-screen-method-apple");
  await advance(0);
  passLearnerSignup();
  fireEvent.tap(screen.getByTestId("ui-lynx-option-selector-item-en"), {});
  tapButton("language-select-screen-next");
  passLearnerBirthYearIfShown();
  beforeStart();
  tapButton("journey-entry-screen-story");
  await advance(0);
  const reached = screen.queryByTestId("journey-map-screen") !== null;
  await act(async () => {
    await vi.runAllTimersAsync();
  });
  vi.useRealTimers();
  if (!reached) throw new Error("runEntryFlow: 여정 화면이 서지 않았습니다");
}
