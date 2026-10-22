import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, screen } from "@lynx-js/react/testing-library";

import { App } from "./App";
import { deeplinkOpenedEventName } from "./use-opened-deeplink";
import { renderSignedInApp } from "./test-helpers/signed-in-app";
import {
  assembleSinks,
  fakeTransport,
  runEntryFlow,
} from "./test-helpers/airbridge-events-harness";

// 「호스트 AirbridgeEventsModule.takeOpenedDeeplink → 해석 → 탭 이동」을 한 트리에서 봅니다(ADR-0080).
// 대역은 호스트 모듈뿐입니다. 링크를 받는 것(scheme · universal link · App Link · 지연 딥링크)은 호스트가 지고 e2e가 봅니다.

type DeeplinkHost = { pending: string | null; takes: number };

function stubDeeplinkHost(pending: string | null): DeeplinkHost {
  const host: DeeplinkHost = { pending, takes: 0 };
  vi.stubGlobal("NativeModules", {
    AirbridgeEventsModule: {
      trackEvent: () => undefined,
      takeOpenedDeeplink: (callback: (payload: unknown) => void) => {
        host.takes += 1;
        const url = host.pending;
        host.pending = null;
        callback({ url });
      },
    },
  });
  return host;
}

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

test("DI1. 링크로 켜진 앱은 앱 구간에 들어선 뒤 그 탭(롤플레이)을 연다", async () => {
  stubDeeplinkHost("duru://roleplay");
  await renderSignedInApp(<App />);
  await flush();

  expect(screen.getByTestId("roleplay-list-screen-title")).toBeInTheDocument();
  expect(screen.queryByTestId("journey-map-screen")).not.toBeInTheDocument();
});

test("DI2. 켜진 채 링크가 오면 호스트 이벤트로 꺼내 설정 탭을 연다", async () => {
  const host = stubDeeplinkHost(null);
  await renderSignedInApp(<App />);
  await flush();
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();

  host.pending = "duru://settings";
  act(() => {
    lynx.getJSModule("GlobalEventEmitter").emit(deeplinkOpenedEventName, []);
  });
  await flush();

  expect(screen.getByTestId("settings-screen-list")).toBeInTheDocument();
});

test("DI3. 모르는 목적지는 앱만 열고 화면을 옮기지 않는다", async () => {
  stubDeeplinkHost("duru://shop");
  await renderSignedInApp(<App />);
  await flush();

  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
});

test("DI4. (지연 딥링크) 진입 흐름 중에는 꺼내지 않고, 「여정 시작하기」 뒤에 꺼내 연다", async () => {
  const host = stubDeeplinkHost("duru://roleplay");
  let takesBefore = -1;

  await runEntryFlow(assembleSinks(fakeTransport().transport), () => {
    takesBefore = host.takes;
  }).catch(() => undefined);
  await flush();

  expect(takesBefore).toBe(0);
  expect(host.takes).toBeGreaterThan(0);
  expect(screen.getByTestId("roleplay-list-screen-title")).toBeInTheDocument();
});

test("DI5. 모듈이나 메서드가 없으면(값 없는 빌드) 아무 일 없이 맵이 선다", async () => {
  vi.stubGlobal("NativeModules", {});
  await renderSignedInApp(<App />);
  await flush();

  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
});
