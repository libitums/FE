import { describe, expect, test } from "vitest";

import { assetDownloadDecision, unitAllowToken } from "./download-policy";
import type { AssetDownloadInput, AssetTarget } from "./download-policy";
import type { NetworkProperties } from "./network-status";

// `unit` 계층(DW1 ~ DW5, ADR-0157): 배경 미리 받기 창 — 창 밖 편은 연결과 상관없이 `skip`(재확인 대상 아님),
// 창 안은 지금 정책(요금 없는 · 모르는 연결은 받기, 요금 연결은 정책 · 허락)을 그대로 따른다.

const WIFI: NetworkProperties = { network: "wifi", networkCost: "unmetered" };
const UNKNOWN: NetworkProperties = { network: "unknown", networkCost: "unknown" };
const CELL: NetworkProperties = { network: "cellular", networkCost: "metered" };
const EPISODE: AssetTarget = { kind: "episode" };

function input(
  overrides: Partial<AssetDownloadInput> & { readonly window?: ReadonlySet<string> | null },
) {
  return {
    network: WIFI,
    policy: "ask" as const,
    allowed: new Set<string>(),
    episodeId: "u05-e",
    tutorialId: "u00-tutorial",
    target: EPISODE,
    window: new Set(["u01-a", "u02-b"]),
    ...overrides,
  };
}

describe("assetDownloadDecision", () => {
  test("[DW1] 창 밖 편은 Wi-Fi · 모르는 연결 · 요금 연결 모두 skip", () => {
    for (const network of [WIFI, UNKNOWN, CELL]) {
      expect(assetDownloadDecision(input({ network }))).toBe("skip");
    }
    expect(assetDownloadDecision(input({ network: CELL, policy: "always" }))).toBe("skip");
  });

  test("[DW2] 창 안 편: Wi-Fi · 모르는 연결은 allow, 요금 연결은 ask면 defer · always면 allow", () => {
    const inside = { episodeId: "u02-b" };
    expect(assetDownloadDecision(input({ ...inside, network: WIFI }))).toBe("allow");
    expect(assetDownloadDecision(input({ ...inside, network: UNKNOWN }))).toBe("allow");
    expect(assetDownloadDecision(input({ ...inside, network: CELL }))).toBe("defer");
    expect(assetDownloadDecision(input({ ...inside, network: CELL, policy: "always" }))).toBe(
      "allow",
    );
  });

  test("[DW3] 튜토리얼은 창 밖이어도 allow", () => {
    expect(assetDownloadDecision(input({ episodeId: "u00-tutorial", network: CELL }))).toBe(
      "allow",
    );
  });

  test("[DW4] 사용자가 허락한 편 · 레슨(유닛 토큰)은 창 밖이어도 allow — 레슨 단위 받기가 창보다 우선", () => {
    expect(assetDownloadDecision(input({ allowed: new Set(["u05-e"]) }))).toBe("allow");
    const unit: AssetTarget = { kind: "unit", unitKey: "S1" };
    const allowed = new Set([unitAllowToken("u05-e", "S1")]);
    expect(assetDownloadDecision(input({ allowed, target: unit, network: CELL }))).toBe("allow");
    expect(assetDownloadDecision(input({ allowed, target: { kind: "unit", unitKey: "S2" } }))).toBe(
      "skip",
    );
  });

  test("[DW5] 창을 모르면(null) 지금처럼 — 창 규칙 없이 판정", () => {
    expect(assetDownloadDecision(input({ window: null, network: WIFI }))).toBe("allow");
    expect(assetDownloadDecision(input({ window: null, network: CELL }))).toBe("defer");
  });
});
