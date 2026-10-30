import { JSDOM } from "jsdom";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AirbridgeDeeplinkOptions, AirbridgeSdk } from "../analytics/airbridge.contract";
import { pages } from "../site";
import { initAirbridgeCta, initAirbridgeTracking } from "./airbridge-cta";

// 실제 Download 마크업을 JSDOM에 넣고, 클릭 → SDK 판정 → preventDefault · openDeeplink · 전파를 잇는 경계를 봅니다.

interface Links {
  ios: string;
  android: string;
}

const none: Links = { ios: "", android: "" };
const both: Links = {
  ios: "https://apps.apple.com/app/id1",
  android: "https://play.google.com/store/apps/details?id=app.duru",
};

const deeplink: AirbridgeDeeplinkOptions = {
  type: "click",
  deeplinks: { android: "duru://journey", ios: "duru://journey", desktop: "https://k-duru.com/" },
  fallbacks: { android: "google-play", ios: "https://k-duru.com/" },
};

afterEach(() => {
  vi.doUnmock("../site");
  vi.resetModules();
});

async function mount(storeLinks: Links): Promise<Document> {
  vi.resetModules();
  vi.doMock("../site", async (importOriginal) => ({
    ...(await importOriginal<typeof import("../site")>()),
    storeLinks,
  }));
  const { default: Download } = await import("../components/Download.astro");
  const { render } = await import("../components/render.support");
  const { html } = await render(Download, { props: { language: "en", t: pages.en.copy } });
  return new JSDOM(html).window.document;
}

interface Seen {
  prevented: boolean;
  store: string | undefined;
}

/** document에 먼저 붙는 click 리스너 — GA 경로를 흉내 냅니다. */
function watchDocument(document: Document): Seen[] {
  const seen: Seen[] = [];
  document.addEventListener("click", (event) => {
    const link = (event.target as Element).closest("a");
    seen.push({ prevented: event.defaultPrevented, store: link?.dataset.store });
  });
  return seen;
}

function click(
  document: Document,
  store: "android" | "ios",
  init: { metaKey?: boolean; ctrlKey?: boolean; shiftKey?: boolean; button?: number } = {},
): void {
  const link = document.querySelector(`a[data-testid="store"][data-store="${store}"]`);
  expect(link, `${store} 카드`).not.toBeNull();
  const view = document.defaultView as unknown as { MouseEvent: typeof MouseEvent };
  link?.dispatchEvent(new view.MouseEvent("click", { bubbles: true, cancelable: true, ...init }));
}

function fakeSdk(): { sdk: AirbridgeSdk; calls: AirbridgeDeeplinkOptions[] } {
  const calls: AirbridgeDeeplinkOptions[] = [];
  return {
    calls,
    sdk: {
      isSDKEnabled: true,
      openDeeplink(options) {
        calls.push(options);
      },
    },
  };
}

describe("Airbridge 클릭 결선 (Download 마크업 위)", () => {
  it("I-AC1 SDK가 있으면 Android 클릭이 preventDefault + openDeeplink, 클릭은 document까지 전파", async () => {
    const document = await mount(both);
    const seen = watchDocument(document);
    const { sdk, calls } = fakeSdk();
    expect(initAirbridgeCta({ root: document, sdkOf: () => sdk, deeplink })).toBe(1);
    click(document, "android");
    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual(deeplink);
    expect(seen).toEqual([{ prevented: true, store: "android" }]);
  });

  it("I-AC2 SDK가 없으면 무동작 — 기본 이동을 막지 않고 전파", async () => {
    const document = await mount(both);
    const seen = watchDocument(document);
    const { calls } = fakeSdk();
    initAirbridgeCta({ root: document, sdkOf: () => null, deeplink });
    click(document, "android");
    expect(calls).toHaveLength(0);
    expect(seen).toEqual([{ prevented: false, store: "android" }]);
  });

  it("I-AC6 새 탭 · 새 창 클릭(수정키 · 보조 버튼)은 SDK가 있어도 가로채지 않는다", async () => {
    const document = await mount(both);
    const seen = watchDocument(document);
    const { sdk, calls } = fakeSdk();
    const sdkOf = vi.fn<() => AirbridgeSdk | null>().mockReturnValue(sdk);
    initAirbridgeCta({ root: document, sdkOf, deeplink });
    click(document, "android", { metaKey: true });
    click(document, "android", { ctrlKey: true });
    click(document, "android", { shiftKey: true });
    click(document, "android", { button: 1 });
    expect(sdkOf).not.toHaveBeenCalled();
    expect(calls).toHaveLength(0);
    expect(seen.map((entry) => entry.prevented)).toEqual([false, false, false, false]);
    click(document, "android");
    expect(calls).toHaveLength(1);
  });

  it("I-AC3 sdkOf는 클릭마다 불린다 — 첫 클릭 null, 둘째 SDK", async () => {
    const document = await mount(both);
    watchDocument(document);
    const { sdk, calls } = fakeSdk();
    const sdkOf = vi.fn<() => AirbridgeSdk | null>().mockReturnValueOnce(null).mockReturnValue(sdk);
    initAirbridgeCta({ root: document, sdkOf, deeplink });
    click(document, "android");
    expect(calls).toHaveLength(0);
    click(document, "android");
    expect(sdkOf).toHaveBeenCalledTimes(2);
    expect(calls).toHaveLength(1);
  });

  it("I-AC4 iOS 카드는 건드리지 않고, 링크가 없는 상태는 0 · 오류 없음", async () => {
    const document = await mount(both);
    const seen = watchDocument(document);
    const { sdk, calls } = fakeSdk();
    initAirbridgeCta({ root: document, sdkOf: () => sdk, deeplink });
    click(document, "ios");
    expect(calls).toHaveLength(0);
    expect(seen).toEqual([{ prevented: false, store: "ios" }]);

    const empty = await mount(none);
    expect(initAirbridgeCta({ root: empty, sdkOf: () => sdk, deeplink })).toBe(0);
  });

  it("I-AC5 추적 시작 — 지역이 허용될 때만 startTracking, 전역이 없어도 던지지 않음", () => {
    const seoul = vi.fn();
    expect(
      initAirbridgeTracking({ airbridge: { startTracking: seoul }, timeZone: "Asia/Seoul" }),
    ).toBe(true);
    expect(seoul).toHaveBeenCalledTimes(1);

    const paris = vi.fn();
    expect(
      initAirbridgeTracking({ airbridge: { startTracking: paris }, timeZone: "Europe/Paris" }),
    ).toBe(false);
    expect(paris).not.toHaveBeenCalled();

    expect(() =>
      expect(initAirbridgeTracking({ airbridge: undefined, timeZone: "Asia/Seoul" })).toBe(true),
    ).not.toThrow();
    expect(() =>
      expect(initAirbridgeTracking({ airbridge: {}, timeZone: "Asia/Seoul" })).toBe(true),
    ).not.toThrow();
  });
});
