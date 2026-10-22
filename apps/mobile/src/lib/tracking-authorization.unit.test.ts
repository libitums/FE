import { afterEach, expect, test, vi } from "vitest";

import { requestTrackingAuthorization } from "./tracking-authorization";

// 호스트 추적 허용 요청의 해석(ADR-0079 D2). 순수 경계 — 모듈이 없거나 메서드가 없거나 던져도 앱은 멈추지 않는다.

afterEach(() => {
  vi.unstubAllGlobals();
});

test("TR1. 메서드가 있으면 모듈에 붙은 채로 한 번 부르고 true", () => {
  const module = {
    calls: 0,
    requestTrackingAuthorization() {
      this.calls += 1;
    },
  };
  vi.stubGlobal("NativeModules", { AirbridgeEventsModule: module });

  expect(requestTrackingAuthorization()).toBe(true);
  expect(module.calls).toBe(1);
});

test.each([
  ["NativeModules 없음", undefined],
  ["모듈 없음(값 없는 빌드)", {}],
  ["메서드 없음(Android)", { AirbridgeEventsModule: { trackEvent: () => undefined } }],
])("TR2. %s이면 부르지 않고 false", (_name, modules) => {
  vi.stubGlobal("NativeModules", modules);

  expect(requestTrackingAuthorization()).toBe(false);
});

test("TR3. 호스트가 던지면 삼키고 false", () => {
  vi.stubGlobal("NativeModules", {
    AirbridgeEventsModule: {
      requestTrackingAuthorization: () => {
        throw new Error("host failed");
      },
    },
  });

  expect(requestTrackingAuthorization()).toBe(false);
});
