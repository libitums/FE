// 추천 친구 RPC 답의 순수 해석기입니다(ADR-0163 D2 · D4) — `companion_friends` · `companion_ack_adult`. 틀리면 null.
// 계약 정본은 `@libitums/companion-contract`의 `companionFriendsResponseSchema` · `companionAckAdultResponseSchema`(zod를 번들에
// 넣지 않으려고 손으로 풉니다 — `early-access-parse.ts`와 같은 까닭).

import type { VisibleFriend } from "./friend-catalog.contract";

/** 앱 쪽 원격 — 서버 대화 포트(`ChatRemote.friends`)가 채웁니다. 어떤 호출도 던지지 않습니다. */
export type CompanionFriendsRemote = {
  /** 이 학습자에게 보이는 일반 인물 — 못 읽으면(RPC 없음 · 404 · 오류 · 오프라인) null. */
  readonly list: () => Promise<readonly VisibleFriend[] | null>;
  /** 성인 확인을 남김 — 답의 `adultAck`(못 받으면 null). */
  readonly ackAdult: () => Promise<boolean | null>;
};

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

/**
 * `{ friends: [{ id, romanceTier: "open" | "standard" }] }` → 목록(서버 순서). 틀린 줄은 그 줄만 버립니다(같은 id는 처음 것).
 * 모양이 틀리면 null — 앱은 일반 인물을 보이지 않습니다.
 */
export function visibleFriendsFrom(bodyText: string | null): readonly VisibleFriend[] | null {
  const list = recordOf(parse(bodyText))?.friends;
  if (!Array.isArray(list)) return null;
  const friends: VisibleFriend[] = [];
  for (const item of list as readonly unknown[]) {
    const row = recordOf(item);
    const id = row?.id;
    const tier = row?.romanceTier;
    if (typeof id !== "string" || id === "" || friends.some((friend) => friend.id === id)) continue;
    if (tier !== "open" && tier !== "standard") continue;
    friends.push({ id, romanceTier: tier });
  }
  return friends;
}

/** `{ ok, adultAck }` → 서버에 남은 동의. ok가 아니거나(나이 모름 · 미성년자) 틀리면 null. */
export function adultAckFrom(bodyText: string | null): boolean | null {
  const record = recordOf(parse(bodyText));
  if (record?.ok !== true) return null;
  return typeof record.adultAck === "boolean" ? record.adultAck : null;
}
