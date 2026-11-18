// 추천 친구 RPC 답의 순수 해석기입니다 — `companion_friends` · `companion_ack_adult`. 틀리면 null(앱은 친구를 보이지 않습니다).

import type { ChatFriend } from "./chat-friends.contract";

const recordOf = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

function parse(bodyText: string | null): unknown {
  if (bodyText === null) return null;
  try {
    return JSON.parse(bodyText) as unknown;
  } catch {
    return null;
  }
}

/**
 * `{ friends: [{ id, romanceTier: "open" | "standard" }] }` → 친구 목록. 줄 하나가 틀리면 그 줄만 버립니다(같은 id는 처음 것).
 * 모양이 틀리면 null.
 */
export function friendsFrom(bodyText: string | null): readonly ChatFriend[] | null {
  const list = recordOf(parse(bodyText))?.["friends"];
  if (!Array.isArray(list)) return null;
  const friends: ChatFriend[] = [];
  for (const item of list as unknown[]) {
    const row = recordOf(item);
    const id = row?.["id"];
    const tier = row?.["romanceTier"];
    if (typeof id !== "string" || id === "" || friends.some((f) => f.id === id)) continue;
    if (tier !== "open" && tier !== "standard") continue;
    friends.push({ id, romanceTier: tier });
  }
  return friends;
}

/** `{ ok, adultAck }` → 서버가 적은 성인 확인. ok가 아니거나 틀리면 null. */
export function adultAckFrom(bodyText: string | null): boolean | null {
  const record = recordOf(parse(bodyText));
  if (record?.["ok"] !== true) return null;
  const ack = record["adultAck"];
  return typeof ack === "boolean" ? ack : null;
}
