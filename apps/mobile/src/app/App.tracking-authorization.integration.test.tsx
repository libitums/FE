import { afterEach, expect, test, vi } from "vitest";
import { cleanup, screen } from "@lynx-js/react/testing-library";

import { App } from "./App";
import {
  assembleSinks,
  fakeTransport,
  runEntryFlow,
} from "./test-helpers/airbridge-events-harness";
import { tapTab } from "./test-helpers/journey-map-host";
import { renderSignedInApp } from "./test-helpers/signed-in-app";

// 「진입 흐름 → 여정 맵 → NativeModules.AirbridgeEventsModule.requestTrackingAuthorization」을 한 트리에서
// 봅니다(ADR-0079 D2). 대역은 호스트 모듈뿐입니다 — 「아직 정하지 않았을 때만 묻는다」는 호스트가 지고
// (HostTests · e2e), 여기서는 JS가 **맵에 들어선 때 한 번만** 부르는지를 봅니다.

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function stubTrackingHost(withRequest = true): { requests: number } {
  const counter = { requests: 0 };
  const module: Record<string, unknown> = { trackEvent: () => undefined };
  if (withRequest) {
    module.requestTrackingAuthorization = () => {
      counter.requests += 1;
    };
  }
  vi.stubGlobal("NativeModules", { AirbridgeEventsModule: module });
  return counter;
}

test("TA1. 가입을 마치고 「여정 시작하기」로 맵에 들어설 때 한 번 묻고, 그 앞(온보딩 · 가입 · 언어 선택)에서는 0회다", async () => {
  const host = stubTrackingHost();
  let before = -1;

  await runEntryFlow(assembleSinks(fakeTransport().transport), () => {
    before = host.requests;
  });

  expect(before).toBe(0);
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(host.requests).toBe(1);
});

test("TA2. 탭을 옮겼다가 맵으로 돌아와도 다시 부르지 않는다(한 세션에 한 번)", async () => {
  const host = stubTrackingHost();
  await runEntryFlow(assembleSinks(fakeTransport().transport));
  expect(host.requests).toBe(1);

  tapTab("roleplay");
  expect(screen.queryByTestId("journey-map-screen")).not.toBeInTheDocument();
  tapTab("journey");

  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(host.requests).toBe(1);
});

test("TA3. 기록 있는 계정이 바로 맵으로 들어와도 한 번 묻는다(정했는지는 호스트가 본다)", async () => {
  const host = stubTrackingHost();

  await renderSignedInApp(<App />);

  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(host.requests).toBe(1);
});

test("TA4. 호스트 모듈에 메서드가 없으면(Android · 값 없는 빌드) 부르지 않고 맵은 그대로 선다", async () => {
  stubTrackingHost(false);

  await renderSignedInApp(<App />);

  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
});
