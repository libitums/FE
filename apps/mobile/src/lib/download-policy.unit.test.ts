import { afterEach, describe, expect, test, vi } from "vitest";

import {
  allowEpisodes,
  allowedEpisodesFrom,
  allowEpisodeUnits,
  assetDownloadAllowed,
  downloadPolicyStorageKey,
  isDownloadAllowed,
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
  target: { kind: "episode" },
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

test("DP2. 요금제 · 데이터 절약에서 ask · wifi-only면 허락하지 않은 편은 어느 대상이든 받지 않는다", () => {
  const targets: AssetDownloadInput["target"][] = [
    { kind: "episode" },
    { kind: "common" },
    { kind: "unit", unitKey: "S3" },
  ];
  for (const network of [cellular, saver]) {
    for (const target of targets) {
      expect(assetDownloadAllowed(base({ network, policy: "ask", target }))).toBe(false);
      expect(assetDownloadAllowed(base({ network, policy: "wifi-only", target }))).toBe(false);
    }
  }
});

test("DP3. 요금제에서도 always면 받는다", () => {
  expect(assetDownloadAllowed(base({ network: cellular, policy: "always" }))).toBe(true);
  expect(assetDownloadAllowed(base({ network: saver, policy: "always" }))).toBe(true);
});

test("DP4. 요금제에서도 튜토리얼은 대상과 상관없이, 편을 허락했으면 episode · common · unit 모두 받는다", () => {
  const targets: AssetDownloadInput["target"][] = [
    { kind: "episode" },
    { kind: "common" },
    { kind: "unit", unitKey: "S3" },
  ];
  for (const target of targets) {
    expect(assetDownloadAllowed(base({ episodeId: "u00-tutorial", target }))).toBe(true);
    expect(
      assetDownloadAllowed(base({ policy: "wifi-only", allowed: new Set(["u03-mina"]), target })),
    ).toBe(true);
    expect(assetDownloadAllowed(base({ allowed: new Set(["u04-directions"]), target }))).toBe(
      false,
    );
  }
  // 유닛 토큰만 허락한 편은 그 유닛 대상만 받는다.
  const unitOnly = new Set(["u03-mina#S3"]);
  expect(
    assetDownloadAllowed(base({ allowed: unitOnly, target: { kind: "unit", unitKey: "S3" } })),
  ).toBe(true);
  expect(assetDownloadAllowed(base({ allowed: unitOnly, target: { kind: "episode" } }))).toBe(
    false,
  );
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

test("[U-DP10] 허락 목록은 편 토큰과 유닛 토큰을 그대로 두고, 빈 문자열 · 문자열 아님은 버린다", () => {
  expect([...allowedEpisodesFrom('["u01-water","u02-checkin#S3"]')]).toEqual([
    "u01-water",
    "u02-checkin#S3",
  ]);
  expect([...allowedEpisodesFrom('["u01-water","",1,null,"u02-checkin#S3"]')]).toEqual([
    "u01-water",
    "u02-checkin#S3",
  ]);
});

test("[U-DP11] isDownloadAllowed — 유닛 토큰은 그 유닛과 common만, 편 토큰은 전부, 빈 집합은 어느 것도 아니다", () => {
  const unitOnly = new Set(["u02#S3"]);
  expect(isDownloadAllowed(unitOnly, "u02", { kind: "unit", unitKey: "S3" })).toBe(true);
  expect(isDownloadAllowed(unitOnly, "u02", { kind: "unit", unitKey: "S4" })).toBe(false);
  expect(isDownloadAllowed(unitOnly, "u02", { kind: "common" })).toBe(true);
  expect(isDownloadAllowed(unitOnly, "u02", { kind: "episode" })).toBe(false);
  expect(isDownloadAllowed(unitOnly, "u03", { kind: "unit", unitKey: "S3" })).toBe(false);

  const whole = new Set(["u02"]);
  expect(isDownloadAllowed(whole, "u02", { kind: "unit", unitKey: "S9" })).toBe(true);
  expect(isDownloadAllowed(whole, "u02", { kind: "common" })).toBe(true);
  expect(isDownloadAllowed(whole, "u02", { kind: "episode" })).toBe(true);

  const empty = new Set<string>();
  expect(isDownloadAllowed(empty, "u02", { kind: "unit", unitKey: "S3" })).toBe(false);
  expect(isDownloadAllowed(empty, "u02", { kind: "common" })).toBe(false);
  expect(isDownloadAllowed(empty, "u02", { kind: "episode" })).toBe(false);
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

  test("[U-DP12] allowEpisodeUnits — 유닛 토큰을 중복 · 빈 키 없이 쓰고, 편이 이미 허락이면 쓰지 않으며, 저장소가 없어도 던지지 않는다", () => {
    stubStorage();
    allowEpisodeUnits("u02", ["S3", "S3", ""]);
    expect([...loadAllowedEpisodes()]).toEqual(["u02#S3"]);

    allowEpisodes(["u05"]);
    allowEpisodeUnits("u05", ["S1"]);
    expect([...loadAllowedEpisodes()]).toEqual(["u02#S3", "u05"]);

    vi.stubGlobal("NativeModules", undefined);
    expect(() => allowEpisodeUnits("u02", ["S4"])).not.toThrow();
  });
});
