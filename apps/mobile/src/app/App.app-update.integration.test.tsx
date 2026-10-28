import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, screen, within } from "@lynx-js/react/testing-library";

import { APP_POLICY_KEY } from "../lib/app-policy";
import type { EntryEvent } from "../lib/entry-flow";
import { bootContentApp, settle } from "./test-helpers/episode-content-boot";
import type { BootOptions } from "./test-helpers/episode-content-boot";
import { setGlobalProps } from "./test-helpers/journey-map-host";
import { passSplash } from "./test-helpers/pass-splash";

// `integration` 계층: 앱 루트 훅의 정책 받기 → 저장소 → 스플래시가 나가는 순간의 판정 → 진입 화면 교체 →
// 호스트 모듈로 스토어 열기까지 한 트리에서 봅니다(ADR-0086). 대역은 경계뿐 — 가짜 전송(`fetch`) ·
// `StorageModule` · `AppUpdateModule` · 호스트 globalProps · 가짜 시계.

afterEach(() => {
  cleanup();
  setGlobalProps(undefined);
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const policy = (minBuild: Record<string, number>) =>
  JSON.stringify({ schema: "app-policy-1", min_build: minBuild });
const android = (build: number) => ({
  appVersion: { platform: "android", name: "0.1.0", build },
});

/** 정책이 저장될 때까지 스플래시를 잡아 두었다가 넘깁니다(실제 기기에서 로고가 끝나기 전에 정책이 옵니다). */
async function boot(options: BootOptions) {
  const booted = await bootContentApp({ ...options, splash: "hold" });
  await passSplash();
  vi.useRealTimers();
  return booted;
}

function hostModule(openStore: (callback: (payload: unknown) => void) => void): void {
  (NativeModules as unknown as Record<string, unknown>)["AppUpdateModule"] = { openStore };
}

// ------------------------------------------------------------------------- IU1

test("[IU1] 최소 빌드보다 낮으면 스플래시 뒤 강제 업데이트 화면이 서고 앱에 들어가지 않는다", async () => {
  const events: EntryEvent[] = [];
  const { store } = await boot({
    content: { "app-policy.json": policy({ android: 7 }) },
    globalProps: android(6),
    onEntryEvent: (event) => events.push(event),
  });

  expect(screen.getByTestId("update-required-screen-title")).toBeInTheDocument();
  expect(screen.queryByTestId("splash-screen-logo")).toBeNull();
  expect(screen.queryAllByTestId(/^ui-lynx-bottom-navigator-item-/)).toHaveLength(0);
  expect(screen.queryByTestId("journey-map-screen")).toBeNull();
  expect(store.get(APP_POLICY_KEY)).toBe(policy({ android: 7 }));
  expect(events).toEqual([
    { name: "app_update_required_shown", platform: "android", build: "6", minBuild: "7" },
  ]);
});

// ------------------------------------------------------------------------- IU2

test("[IU2] 최소 빌드 이상이면 여정 맵으로 들어간다", async () => {
  await boot({ content: { "app-policy.json": policy({ android: 7 }) }, globalProps: android(7) });

  expect(screen.queryByTestId("update-required-screen-title")).toBeNull();
  expect(screen.getByTestId("ui-lynx-bottom-navigator-item-journey")).toBeInTheDocument();
});

// ------------------------------------------------------------------------- IU3

test("[IU3] 정책 파일이 없으면(404) 저장하지 않고 여정 맵으로 들어간다", async () => {
  const { store, urls } = await boot({ content: {}, globalProps: android(1) });

  expect(screen.getByTestId("ui-lynx-bottom-navigator-item-journey")).toBeInTheDocument();
  expect(store.has(APP_POLICY_KEY)).toBe(false);
  expect(urls.some((url) => url.includes("/content/app-policy.json?m="))).toBe(true);
});

// ------------------------------------------------------------------------- IU4

test("[IU4] 오프라인이어도 지난 실행에 저장한 정책으로 막는다", async () => {
  await boot({
    content: {},
    offline: true,
    preStore: { [APP_POLICY_KEY]: policy({ android: 7 }) },
    globalProps: android(6),
  });

  expect(screen.getByTestId("update-required-screen-title")).toBeInTheDocument();
});

// ------------------------------------------------------------------------- IU5

test("[IU5] 다른 플랫폼의 최소 빌드는 보지 않는다", async () => {
  await boot({ content: { "app-policy.json": policy({ ios: 99 }) }, globalProps: android(1) });

  expect(screen.getByTestId("ui-lynx-bottom-navigator-item-journey")).toBeInTheDocument();
});

// ------------------------------------------------------------------------- IU6

test("[IU6] Update를 누르면 호스트 모듈이 한 번 불리고, 못 열면 실패 문구가 선다", async () => {
  await boot({ content: { "app-policy.json": policy({ android: 7 }) }, globalProps: android(6) });
  const openStore = vi.fn<(callback: (payload: unknown) => void) => void>((callback) =>
    callback({ status: "failed" }),
  );
  hostModule(openStore);

  fireEvent.tap(
    within(screen.getByTestId("update-required-screen-update")).getByTestId("ui-lynx-button"),
    {},
  );
  await settle();

  expect(openStore).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId("update-required-screen-failure")).toBeInTheDocument();
  expect(screen.getByTestId("update-required-screen-title")).toBeInTheDocument();
});
