import { afterEach, describe, expect, test, vi } from "vitest";

import {
  allowEpisodes,
  allowedEpisodesFrom,
  assetDownloadAllowed,
  downloadPolicyStorageKey,
  loadAllowedEpisodes,
  loadMobileDataPolicy,
  mobileDataPolicyFrom,
  saveMobileDataPolicy,
  type AssetDownloadInput,
} from "./download-policy";
import type { NetworkProperties } from "./network-status";

// `unit` 계층: 받기 정책(ADR-0095 D5)의 순수 판정과 저장값 해석입니다. 어떤 입력에도 던지지 않습니다.

const wifi: NetworkProperties = { network: "wifi", networkCost: "unmetered" };
const cellular: NetworkProperties = { network: "cellular", networkCost: "metered" };
const saver: NetworkProperties = { network: "cellular", networkCost: "constrained" };
const unknown: NetworkProperties = { network: "unknown", networkCost: "unknown" };
const offline: NetworkProperties = { network: "offline", networkCost: "unknown" };

const base = (over: Partial<AssetDownloadInput>): AssetDownloadInput => ({
  network: cellular,
  policy: "ask",
  allowed: new Set(),
  episodeId: "u03-mina",
  tutorialId: "u00-tutorial",
  ...over,
});

test("DP1. 요금 없는 연결 · 모르는 연결 · 오프라인은 정책과 상관없이 받는다", () => {
  for (const network of [wifi, unknown, offline]) {
    for (const policy of ["ask", "wifi-only", "always"] as const) {
      expect(assetDownloadAllowed(base({ network, policy })), `${network.network}/${policy}`).toBe(
        true,
      );
    }
  }
});

test("DP2. 요금제 · 데이터 절약에서 ask · wifi-only면 허락하지 않은 편은 받지 않는다", () => {
  for (const network of [cellular, saver]) {
    expect(assetDownloadAllowed(base({ network, policy: "ask" }))).toBe(false);
    expect(assetDownloadAllowed(base({ network, policy: "wifi-only" }))).toBe(false);
  }
});

test("DP3. 요금제에서도 always면 받는다", () => {
  expect(assetDownloadAllowed(base({ network: cellular, policy: "always" }))).toBe(true);
  expect(assetDownloadAllowed(base({ network: saver, policy: "always" }))).toBe(true);
});

test("DP4. 요금제에서도 튜토리얼과 허락한 편은 받는다", () => {
  expect(assetDownloadAllowed(base({ episodeId: "u00-tutorial" }))).toBe(true);
  expect(assetDownloadAllowed(base({ policy: "wifi-only", allowed: new Set(["u03-mina"]) }))).toBe(
    true,
  );
  expect(assetDownloadAllowed(base({ allowed: new Set(["u04-directions"]) }))).toBe(false);
});

test("DP5. 저장된 정책은 세 값만 받고 나머지는 ask다", () => {
  expect(mobileDataPolicyFrom("always")).toBe("always");
  expect(mobileDataPolicyFrom("wifi-only")).toBe("wifi-only");
  expect(mobileDataPolicyFrom("ask")).toBe("ask");
  for (const bad of [null, undefined, "", "ALWAYS", " always", 1, {}]) {
    expect(mobileDataPolicyFrom(bad)).toBe("ask");
  }
});

test("DP6. 허락한 편 목록은 JSON 문자열 배열의 문자열만 받고, 깨지면 빈 집합이다", () => {
  expect([...allowedEpisodesFrom('["u03-mina","u04-directions"]')]).toEqual([
    "u03-mina",
    "u04-directions",
  ]);
  expect([...allowedEpisodesFrom('["u03-mina", 1, null, ""]')]).toEqual(["u03-mina"]);
  for (const bad of [null, undefined, "", "{", '{"a":1}', "1", 3]) {
    expect(allowedEpisodesFrom(bad).size).toBe(0);
  }
});

describe("저장", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubStorage(initial: Record<string, string> = {}) {
    const values = new Map(Object.entries(initial));
    vi.stubGlobal("NativeModules", {
      StorageModule: {
        get: (key: string) => values.get(key) ?? null,
        set: (key: string, value: string) => void values.set(key, value),
        remove: (key: string) => void values.delete(key),
      },
    });
    return values;
  }

  test("DP7. 정책을 저장하고 다시 읽는다 — 없으면 ask", () => {
    const values = stubStorage();
    expect(loadMobileDataPolicy()).toBe("ask");
    saveMobileDataPolicy("wifi-only");
    expect(values.get(downloadPolicyStorageKey)).toBe("wifi-only");
    expect(loadMobileDataPolicy()).toBe("wifi-only");
  });

  test("DP8. 허락한 편을 더하면 중복 없이 쌓이고, 여럿을 한 번에 더할 수 있다", () => {
    stubStorage();
    allowEpisodes(["u03-mina"]);
    allowEpisodes(["u03-mina", "u04-directions"]);
    expect([...loadAllowedEpisodes()]).toEqual(["u03-mina", "u04-directions"]);
  });

  test("DP9. 저장소가 없어도 던지지 않고 기본값이다", () => {
    vi.stubGlobal("NativeModules", undefined);
    expect(loadMobileDataPolicy()).toBe("ask");
    expect(() => saveMobileDataPolicy("always")).not.toThrow();
    expect(() => allowEpisodes(["u03-mina"])).not.toThrow();
    expect(loadAllowedEpisodes().size).toBe(0);
  });
});
