import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { fireEvent, screen, within } from "@lynx-js/react/testing-library";

import { App } from "./App";
import {
  assembleSinks,
  fakeTransport,
  runEntryFlow,
  sentEventNames,
  stubAirbridgeHost,
} from "./test-helpers/airbridge-events-harness";
import type { AirbridgeHostMode } from "./test-helpers/airbridge-events-harness";
import { renderSignedInApp } from "./test-helpers/signed-in-app";

// 「App의 한 사용자 흐름 → 합성 sink → 매핑 → tracker → NativeModules.AirbridgeEventsModule」을 한
// 트리에서 봅니다. 대역은 호스트 모듈(`trackEvent` 기록) · PostHog 가짜 transport · 저장소뿐이고
// 매핑 · 합성 · 해석은 진짜입니다. 조립은 진입점을 따라 합니다(`assembleSinks`). 진입점
// (`index.tsx`)이 그 조립을 실제로 하는지는 `pnpm build`와 e2e의 몫입니다.

let unhandled: unknown[] = [];
const onUnhandled = (reason: unknown) => void unhandled.push(reason);

beforeEach(() => {
  unhandled = [];
  process.on("unhandledRejection", onUnhandled);
});

afterEach(() => {
  process.off("unhandledRejection", onUnhandled);
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const tap = (id: string) => fireEvent.tap(screen.getByTestId(id), {});

async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 30));
}

const registration = ["airbridge.user.signup", {}] as const;

test("I1. 진입 흐름을 「여정 시작하기」까지 가면 trackEvent가 가입 완료로 정확히 1회 불리고 그 앞에서는 0회다", async () => {
  const calls = stubAirbridgeHost("ok");
  const { transport } = fakeTransport();
  let before = -1;

  await runEntryFlow(assembleSinks(transport), () => {
    before = calls.length;
  });

  expect(before).toBe(0);
  expect(calls).toEqual([registration]);
});

test("I3. 완료가 아닌 이벤트(표지 열기 · 설정 · 알림)는 trackEvent 0회이고 PostHog에는 실린다", async () => {
  const calls = stubAirbridgeHost("ok");
  const { transport, calls: sent } = fakeTransport();
  await renderSignedInApp(<App {...assembleSinks(transport)} />);
  tap("ui-lynx-bottom-navigator-item-journey");
  tap("ui-lynx-special-unit-catalog-cover-u00-tutorial");
  fireEvent.tap(
    within(screen.getByTestId("episode-intro-screen-back")).getByTestId("ui-lynx-round-button"),
    {},
  );
  tap("ui-lynx-bottom-navigator-item-settings");
  tap("top-bar-notifications");

  await vi.waitFor(() =>
    expect(sentEventNames(sent)).toEqual(
      expect.arrayContaining(["episode_intro_viewed", "settings_opened", "notifications_opened"]),
    ),
  );
  expect(calls).toEqual([]);
});

test.each<AirbridgeHostMode>(["absent", "throws"])(
  "I4/I5. 호스트 모듈이 %s여도 흐름이 끝까지 가고 PostHog 전송이 유지되며 처리되지 않은 예외가 없다",
  async (mode) => {
    const calls = stubAirbridgeHost(mode);
    const entry = fakeTransport();
    await runEntryFlow(assembleSinks(entry.transport));
    expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
    await vi.waitFor(() => expect(sentEventNames(entry.calls)).toContain("entry_completed"));
    expect(calls.length).toBe(mode === "absent" ? 0 : 1);
    await settle();
    expect(unhandled).toEqual([]);
  },
);

test("I6. PostHog 설정 없이 호스트 모듈만 있어도 I1과 같은 trackEvent가 불리고 꽂은 transport 호출은 0이다", async () => {
  const calls = stubAirbridgeHost("ok");
  const recording = fakeTransport();
  await runEntryFlow(assembleSinks(recording.transport, null));
  expect(calls).toEqual([registration]);
  await settle();
  expect(recording.calls).toHaveLength(0);
});
