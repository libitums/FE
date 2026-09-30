import { describe, expect, test } from "vitest";

import { pushTargetFrom, reengagementMessageFor, sendPushBodyFrom } from "./send-push-body.ts";

const userId = "3f1c2b0a-9d8e-4c7b-a6f5-0e1d2c3b4a59";

describe("SP1 pushTargetFrom", () => {
  test("유닛 없는 목적지 셋과 유닛 목적지 셋을 받는다", () => {
    expect(pushTargetFrom({ kind: "journey-map" })).toEqual({ kind: "journey-map" });
    expect(pushTargetFrom({ kind: "notifications", extra: 1 })).toEqual({ kind: "notifications" });
    expect(pushTargetFrom({ kind: "roleplay-list" })).toEqual({ kind: "roleplay-list" });
    expect(pushTargetFrom({ kind: "messenger", unitId: "u" })).toEqual({
      kind: "messenger",
      unitId: "u",
    });
  });

  test("모르는 kind · 유닛 없는 유닛 목적지 · URL은 버린다", () => {
    expect(pushTargetFrom({ kind: "url", unitId: "https://x" })).toBeNull();
    expect(pushTargetFrom({ kind: "phone-call" })).toBeNull();
    expect(pushTargetFrom({ kind: "visual-novel", unitId: "" })).toBeNull();
    expect(pushTargetFrom({ kind: "messenger", unitId: "x".repeat(101) })).toBeNull();
    expect(pushTargetFrom("journey-map")).toBeNull();
    expect(pushTargetFrom(null)).toBeNull();
  });
});

describe("SP2 sendPushBodyFrom", () => {
  test("다시 돌아오기는 3 · 7일만", () => {
    expect(sendPushBodyFrom('{"kind":"reengagement","days":3}')).toEqual({
      kind: "reengagement",
      days: 3,
    });
    expect(sendPushBodyFrom('{"kind":"reengagement","days":7}')).toEqual({
      kind: "reengagement",
      days: 7,
    });
    expect(sendPushBodyFrom('{"kind":"reengagement","days":5}')).toBeNull();
    expect(sendPushBodyFrom('{"kind":"reengagement"}')).toBeNull();
  });

  test("공지 — 전체 · 사용자 목록, 목적지는 없으면 null", () => {
    expect(
      sendPushBodyFrom(
        JSON.stringify({ kind: "announcement", audience: "all", title: "T", body: "B" }),
      ),
    ).toEqual({ kind: "announcement", audience: "all", title: "T", body: "B", target: null });
    expect(
      sendPushBodyFrom(
        JSON.stringify({
          kind: "announcement",
          audience: { userIds: [userId] },
          title: "T",
          body: "B",
          target: { kind: "notifications" },
        }),
      ),
    ).toEqual({
      kind: "announcement",
      audience: { userIds: [userId] },
      title: "T",
      body: "B",
      target: { kind: "notifications" },
    });
  });

  test("공지의 틀린 값은 본문 전체를 버린다", () => {
    const base = { kind: "announcement", audience: "all", title: "T", body: "B" };
    const bad = [
      { ...base, title: "" },
      { ...base, title: "x".repeat(101) },
      { ...base, body: "x".repeat(501) },
      { ...base, target: { kind: "url" } },
      { ...base, audience: { userIds: [] } },
      { ...base, audience: { userIds: ["not-a-uuid"] } },
      { ...base, audience: "some" },
    ];
    for (const body of bad) expect(sendPushBodyFrom(JSON.stringify(body))).toBeNull();
    expect(sendPushBodyFrom("not json")).toBeNull();
    expect(sendPushBodyFrom("[]")).toBeNull();
    expect(sendPushBodyFrom('{"kind":"other"}')).toBeNull();
  });
});

describe("SP3 reengagementMessageFor", () => {
  test("두 날 모두 여정 맵으로 가고 문구가 다르다", () => {
    const three = reengagementMessageFor(3);
    const seven = reengagementMessageFor(7);
    expect(three.target).toEqual({ kind: "journey-map" });
    expect(seven.target).toEqual({ kind: "journey-map" });
    expect(three.title).not.toBe(seven.title);
  });
});
