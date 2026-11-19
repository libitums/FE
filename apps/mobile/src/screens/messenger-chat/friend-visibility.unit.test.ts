import { describe, expect, test } from "vitest";

import {
  catalogVisibleTo,
  friendGateOf,
  GATE_LOADING,
  generalVisible,
  romanceTierOf,
  UNGATED,
} from "./friend-visibility";
import type { FriendGate } from "./friend-visibility";
import { suggestedFriendsOf } from "./suggested-friends";
import { catalogOf, friend, general, room } from "./suggested-friends.test-support";

// `unit` 계층(FV-U1 ~ U6): 일반 인물은 카탈로그와 서버 목록(`companion_friends`) 둘 다에 있어야 선다(ADR-0163 D2). 못 받음 · 받기 전 ·
// 서버 포트 없음이면 일반 인물이 없고, 이야기 인물은 늘 그대로다.

const catalog = catalogOf([
  friend("mina"),
  general("seoyeon"),
  general("haejun"),
  general("daeun"),
]);
const ready = (ids: readonly [string, "open" | "standard"][]): FriendGate => ({
  kind: "ready",
  friends: ids.map(([id, romanceTier]) => ({ id, romanceTier })),
});
const idsOf = (gate: FriendGate) => catalogVisibleTo(catalog, gate).characters.map((c) => c.id);

describe("보임 교집합", () => {
  test("FV-U1 카탈로그 ∩ 서버 목록 — 서버에만 있는 id(geonwoo)는 서지 않고, 카탈로그 순서", () => {
    const gate = ready([
      ["daeun", "standard"],
      ["geonwoo", "standard"],
      ["seoyeon", "open"],
    ]);
    expect(idsOf(gate)).toEqual(["mina", "seoyeon", "daeun"]);
  });

  test("FV-U2 RPC 없음 · 404 · 오류 · 오프라인(null) · 받기 전 · 빈 목록이면 일반 인물이 없다 — 이야기 인물은 그대로", () => {
    expect(idsOf({ kind: "ready", friends: null })).toEqual(["mina"]);
    expect(idsOf(GATE_LOADING)).toEqual(["mina"]);
    expect(idsOf(ready([]))).toEqual(["mina"]);
  });

  test("FV-U3 칸 없는 포트(옛 결선 · 화면 테스트)는 카탈로그 그대로 — 같은 참조", () => {
    expect(catalogVisibleTo(catalog, UNGATED)).toBe(catalog);
    expect(generalVisible(UNGATED, "anyone")).toBe(true);
  });

  test("FV-U4 포트 칸 → 상태: 없음 = ungated, null = 일반 인물 없음, 함수 = 받기 전 loading · 받은 뒤 ready", () => {
    expect(friendGateOf("absent", false, null)).toEqual(UNGATED);
    expect(friendGateOf("off", false, null)).toEqual({ kind: "ready", friends: null });
    expect(friendGateOf("on", false, null)).toEqual(GATE_LOADING);
    const list = [{ id: "daeun", romanceTier: "standard" as const }];
    expect(friendGateOf("on", true, list)).toEqual({ kind: "ready", friends: list });
    expect(friendGateOf("on", true, null)).toEqual({ kind: "ready", friends: null });
  });

  test("FV-U5 수위는 서버 목록에서만 — 목록에 없거나 아직 모르면 null", () => {
    const gate = ready([["seoyeon", "open"]]);
    expect(romanceTierOf(gate, "seoyeon")).toBe("open");
    expect(romanceTierOf(gate, "daeun")).toBeNull();
    expect(romanceTierOf(GATE_LOADING, "seoyeon")).toBeNull();
    expect(romanceTierOf(UNGATED, "seoyeon")).toBeNull();
  });

  test("FV-U6 추천 줄은 보이는 카탈로그로만 — 숨은 일반 인물은 방이 있어도 줄에 없다", () => {
    const rooms = ["mina", "seoyeon", "haejun", "daeun"].map((id) => room(id, false));
    const visible = catalogVisibleTo(catalog, ready([["haejun", "open"]]));
    const list = suggestedFriendsOf({ catalog: visible, rooms, earlyAccess: false, now: 0 });
    expect(list.map((s) => s.character.id)).toEqual(["haejun", "mina"]);
  });
});
