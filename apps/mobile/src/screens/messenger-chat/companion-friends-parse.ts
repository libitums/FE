// 추천 친구 RPC(20261216, ADR-0164)의 응답 풀기입니다. 순수 — 틀린 응답은 null.
// `companion_friends()` → `{ friends: [{ id, romanceTier }] }`, `companion_ack_adult()` → `{ ok, adultAck }`.

import type { RomanceTier, VisibleFriend } from "./friend-catalog.contract";

type Json = Readonly<Record<string, unknown>>;

const recordOf = (value: unknown): Json | null =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Json) : null;

function parse(bodyText: string | null): unknown {
  if (bodyText === null || bodyText.trim() === "") return null;
  try {
    return JSON.parse(bodyText) as unknown;
  } catch {
    return null;
  }
}

const TIERS: readonly RomanceTier[] = ["open", "standard"];

function friendOf(raw: unknown): VisibleFriend | null {
  const record = recordOf(raw);
  const id = record?.id;
  const romanceTier = TIERS.find((tier) => tier === record?.romanceTier);
  if (typeof id !== "string" || id === "" || romanceTier === undefined) return null;
  return { id, romanceTier };
}

/** 보이는 친구 목록 — 틀린 줄은 건너뜁니다. 모양이 틀리면 null. */
export function visibleFriendsFrom(bodyText: string | null): readonly VisibleFriend[] | null {
  const friends = recordOf(parse(bodyText))?.friends;
  if (!Array.isArray(friends)) return null;
  const list: VisibleFriend[] = [];
  for (const item of friends) {
    const friend = friendOf(item);
    if (friend !== null) list.push(friend);
  }
  return list;
}

/** 동의 결과 — 동의가 남았으면(`ok` · `adultAck` 둘 다 참) true. 틀리면 null. */
export function adultAckFrom(bodyText: string | null): boolean | null {
  const record = recordOf(parse(bodyText));
  const ok = record?.ok;
  const ack = record?.adultAck;
  if (typeof ok !== "boolean" || typeof ack !== "boolean") return null;
  return ok && ack;
}
