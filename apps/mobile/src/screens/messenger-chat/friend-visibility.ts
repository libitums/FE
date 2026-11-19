// 일반 인물의 보임 판정입니다(ADR-0163 D2 「앱 인계」). 순수 — 누가 보이는지는 서버(`companion_friends`)가 정하고, 앱은 카탈로그와
// 서버 목록 **둘 다**에 있는 일반 인물만 추천 줄 · 친구 찾기에 세웁니다. 이야기 인물은 상관없습니다.

import type { FriendCatalog, RomanceTier, VisibleFriend } from "./friend-catalog.contract";

/**
 * 서버 목록의 상태 — `ungated` = 포트에 칸이 없음(옛 결선 · 화면 테스트, 카탈로그 그대로), `loading` = 아직 못 받음,
 * `ready` = 받음(null = RPC 없음 · 404 · 오류 · 오프라인 · 서버 포트 없음 → 일반 인물 없음).
 */
export type FriendGate =
  | { readonly kind: "ungated" }
  | { readonly kind: "loading" }
  | { readonly kind: "ready"; readonly friends: readonly VisibleFriend[] | null };

export const UNGATED: FriendGate = { kind: "ungated" };
export const GATE_LOADING: FriendGate = { kind: "loading" };

/** 이 일반 인물이 서버 목록에 있는가 — 받기 전 · 못 받음이면 거짓, 칸이 없는 포트면 참. */
export function generalVisible(gate: FriendGate, characterId: string): boolean {
  if (gate.kind === "ungated") return true;
  if (gate.kind === "loading" || gate.friends === null) return false;
  return gate.friends.some((friend) => friend.id === characterId);
}

/** 카탈로그에서 서버가 보이게 하지 않은 일반 인물을 뺍니다 — 같으면 같은 참조. */
export function catalogVisibleTo(catalog: FriendCatalog, gate: FriendGate): FriendCatalog {
  if (gate.kind === "ungated") return catalog;
  const characters = catalog.characters.filter(
    (character) => character.kind !== "general" || generalVisible(gate, character.id),
  );
  return characters.length === catalog.characters.length ? catalog : { ...catalog, characters };
}

/** 서버가 준 그 인물의 수위 — 목록에 없거나 아직 모르면 null(성인 확인 창을 띄우지 않습니다). */
export function romanceTierOf(gate: FriendGate, characterId: string): RomanceTier | null {
  if (gate.kind !== "ready" || gate.friends === null) return null;
  return gate.friends.find((friend) => friend.id === characterId)?.romanceTier ?? null;
}

/**
 * 포트 칸과 읽기 결과 → 상태. `absent` = 칸 없음(옛 결선 · 화면 테스트), `off` = 칸이 null(서버 포트 없음 · 손님), `on` = 읽는 함수.
 * 읽기가 실패하면 훅이 `friends: null`로 끝냅니다.
 */
export function friendGateOf(
  port: "absent" | "off" | "on",
  done: boolean,
  friends: readonly VisibleFriend[] | null,
): FriendGate {
  if (port === "absent") return UNGATED;
  if (port === "off") return { kind: "ready", friends: null };
  return done ? { kind: "ready", friends } : GATE_LOADING;
}
