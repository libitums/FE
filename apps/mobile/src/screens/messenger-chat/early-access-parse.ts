// 엽전 먼저 만나기 RPC(20261213, ADR-0162 D5)의 응답 풀기입니다. 순수 — 틀린 응답은 null.
// `companion_early_access_offers()` → 켜진 제안 목록, `companion_unlock_early(p_character_id)` → 결과 + 지갑.

import type { EarlyAccessListing } from "./friend-catalog.contract";

export type RemoteEarlyUnlock = {
  readonly result: "unlocked" | "already" | "short" | "no_offer";
  /** short일 때만 — 모자란 엽전. */
  readonly shortBy: number | null;
  /** 서버 지갑 잔액(돌려줬으면) — 머리 엽전 칩을 맞춥니다. */
  readonly balance: number | null;
};

/** 앱 쪽 원격 — 서버 대화 포트(`ChatRemote.earlyAccess`)가 채웁니다. */
export type EarlyAccessRemote = {
  readonly offers: () => Promise<readonly EarlyAccessListing[] | null>;
  readonly unlock: (characterId: string) => Promise<RemoteEarlyUnlock | null>;
};

type Json = Readonly<Record<string, unknown>>;

const recordOf = (value: unknown): Json | null =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Json) : null;
const countOf = (value: unknown): number | null =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;

function parse(bodyText: string | null): unknown {
  if (bodyText === null || bodyText.trim() === "") return null;
  try {
    return JSON.parse(bodyText) as unknown;
  } catch {
    return null;
  }
}

function listingOf(raw: unknown): EarlyAccessListing | null {
  const record = recordOf(raw);
  const characterId = record?.characterId;
  const price = countOf(record?.price);
  if (typeof characterId !== "string" || characterId === "" || price === null || price === 0)
    return null;
  const endsRaw = record?.endsAt;
  const endsAt = typeof endsRaw === "string" ? Date.parse(endsRaw) : null;
  if (endsAt !== null && !Number.isFinite(endsAt)) return null;
  return { characterId, price, endsAt };
}

/** 켜진 제안 목록 — 틀린 줄은 건너뜁니다. 배열이 아니면 null. */
export function earlyOffersFrom(bodyText: string | null): readonly EarlyAccessListing[] | null {
  const raw = parse(bodyText);
  if (!Array.isArray(raw)) return null;
  const list: EarlyAccessListing[] = [];
  for (const item of raw) {
    const listing = listingOf(item);
    if (listing !== null) list.push(listing);
  }
  return list;
}

const RESULTS: readonly RemoteEarlyUnlock["result"][] = [
  "unlocked",
  "already",
  "short",
  "no_offer",
];

/** 열기 결과 — 모르는 결과는 null. */
export function earlyUnlockFrom(bodyText: string | null): RemoteEarlyUnlock | null {
  const record = recordOf(parse(bodyText));
  const result = RESULTS.find((candidate) => candidate === record?.result);
  if (result === undefined) return null;
  return {
    result,
    shortBy: result === "short" ? countOf(record?.shortBy) : null,
    balance: countOf(recordOf(record?.wallet)?.balance),
  };
}
