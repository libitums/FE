import { describe, expect, test } from "vitest";

import { pushTargetFrom } from "./push-target";

describe("PT1 pushTargetFrom", () => {
  test("유닛 없는 목적지 셋", () => {
    expect(pushTargetFrom({ kind: "journey-map" })).toEqual({ kind: "journey-map" });
    expect(pushTargetFrom({ kind: "notifications" })).toEqual({ kind: "notifications" });
    expect(pushTargetFrom({ kind: "roleplay-list" })).toEqual({ kind: "roleplay-list" });
  });

  test("PN1. 메신저 · 전화 · 비주얼 노벨 목적지는 유닛과 무관하게 여정 맵으로 읽는다", () => {
    const toMap = { kind: "journey-map" };
    expect(pushTargetFrom({ kind: "messenger", unitId: "appointment-confirmation" })).toEqual(
      toMap,
    );
    expect(pushTargetFrom({ kind: "messenger", unitId: "unknown" })).toEqual(toMap);
    expect(pushTargetFrom({ kind: "messenger" })).toEqual(toMap);
    expect(
      pushTargetFrom({ kind: "phone-call", unitId: "appointment-confirmation-phone-call" }),
    ).toEqual(toMap);
    expect(pushTargetFrom({ kind: "phone-call" })).toEqual(toMap);
    expect(pushTargetFrom({ kind: "visual-novel", unitId: "cafe-arrival-visual-novel" })).toEqual(
      toMap,
    );
    expect(pushTargetFrom({ kind: "visual-novel", unitId: "toString" })).toEqual(toMap);
  });

  test("빈 사전은 여정 맵, 모르는 목적지 · 모양 오류는 null", () => {
    expect(pushTargetFrom({})).toEqual({ kind: "journey-map" });
    expect(pushTargetFrom({ kind: "url", url: "https://example.com" })).toBeNull();
    expect(pushTargetFrom({ unitId: "appointment-confirmation" })).toBeNull();
    expect(pushTargetFrom(null)).toBeNull();
    expect(pushTargetFrom("journey-map")).toBeNull();
    expect(pushTargetFrom([])).toBeNull();
  });
});
