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

describe("CP-U1 ~ U3 companion-chat 목적지(ADR-0127)", () => {
  test("CP-U1 인물 id · variant를 읽는다", () => {
    expect(pushTargetFrom({ kind: "companion-chat", characterId: "mina", variant: "a" })).toEqual({
      kind: "companion-chat",
      characterId: "mina",
      variant: "a",
    });
    expect(pushTargetFrom({ kind: "companion-chat", characterId: "duksu-ssam-2" })).toEqual({
      kind: "companion-chat",
      characterId: "duksu-ssam-2",
      variant: null,
    });
  });

  test("CP-U2 인물 id가 1~64자 [a-z0-9-]가 아니면 목적지 없음", () => {
    for (const characterId of ["", "Mina", "mi na", "../x", "a".repeat(65), 7, null]) {
      expect(pushTargetFrom({ kind: "companion-chat", characterId })).toBeNull();
    }
    expect(pushTargetFrom({ kind: "companion-chat" })).toBeNull();
    expect(pushTargetFrom({ kind: "companion-chat", characterId: "a".repeat(64) })).not.toBeNull();
  });

  test("CP-U3 variant는 a · b만, 그 밖은 null", () => {
    for (const variant of ["c", "A", 1, "", null]) {
      expect(pushTargetFrom({ kind: "companion-chat", characterId: "mina", variant })).toEqual({
        kind: "companion-chat",
        characterId: "mina",
        variant: null,
      });
    }
  });
});
