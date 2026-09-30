import { describe, expect, test } from "vitest";

import { pushTargetFrom } from "./push-target";

describe("PT1 pushTargetFrom", () => {
  test("유닛 없는 목적지 셋", () => {
    expect(pushTargetFrom({ kind: "journey-map" })).toEqual({ kind: "journey-map" });
    expect(pushTargetFrom({ kind: "notifications" })).toEqual({ kind: "notifications" });
    expect(pushTargetFrom({ kind: "roleplay-list" })).toEqual({ kind: "roleplay-list" });
  });

  test("있는 유닛만 받는다", () => {
    expect(pushTargetFrom({ kind: "messenger", unitId: "appointment-confirmation" })).toEqual({
      kind: "messenger",
      unitId: "appointment-confirmation",
    });
    expect(
      pushTargetFrom({ kind: "phone-call", unitId: "appointment-confirmation-phone-call" }),
    ).toEqual({ kind: "phone-call", unitId: "appointment-confirmation-phone-call" });
    expect(pushTargetFrom({ kind: "visual-novel", unitId: "cafe-arrival-visual-novel" })).toEqual({
      kind: "visual-novel",
      unitId: "cafe-arrival-visual-novel",
    });
    expect(pushTargetFrom({ kind: "messenger", unitId: "unknown" })).toBeNull();
    expect(pushTargetFrom({ kind: "messenger", unitId: "toString" })).toBeNull();
    expect(pushTargetFrom({ kind: "phone-call" })).toBeNull();
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
