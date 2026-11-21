// 순위 화면의 순수 규칙입니다(ADR-0170) — 메달 · 남은 날 · 국기 · 구역 줄 · 화면 상태 · 방 줄 값.

import type { RankingBoard, RankingLoad, RankingRow } from "../../lib/ranking.contract";

export type RankingMedal = "gold" | "silver" | "bronze";

/** 화면이 그리는 상태입니다. 비회원은 서버를 부르지 않습니다. */
export type RankingView =
  | { readonly kind: "guest" }
  | { readonly kind: "loading" }
  | { readonly kind: "offline" }
  | { readonly kind: "error" }
  | { readonly kind: "not-joined"; readonly endsAt: string }
  | { readonly kind: "hidden" }
  | { readonly kind: "ready"; readonly board: RankingBoard };

export type RankingViewInput = {
  readonly account: "signed-in" | "guest";
  readonly offline: boolean;
  /** 아직 읽는 중이면 null. */
  readonly load: RankingLoad | null;
};

const MEDALS: readonly RankingMedal[] = ["gold", "silver", "bronze"];
const DAY_MS = 86400000;

/** 1 ~ 3위 메달. 그 밖은 null. */
export function medalOf(rank: number): RankingMedal | null {
  return MEDALS[rank - 1] ?? null;
}

/** 이번 주 남은 날 — 올림, 최소 1. 틀린 시각이면 1. */
export function daysLeft(endsAt: string, nowMs: number): number {
  const end = Date.parse(endsAt);
  if (Number.isNaN(end)) return 1;
  return Math.max(1, Math.ceil((end - nowMs) / DAY_MS));
}

/** 나라 코드 → 국기 글자(지역 표시 글자 둘). 틀리면 빈 글. */
export function flagOf(countryCode: string | null): string {
  if (countryCode === null || !/^[A-Z]{2}$/.test(countryCode)) return "";
  // 지역 표시 글자 A(U+1F1E6)부터 — 글자 코드 65(A)를 빼고 더합니다.
  return String.fromCodePoint(
    0x1f1e6 + countryCode.charCodeAt(0) - 65,
    0x1f1e6 + countryCode.charCodeAt(1) - 65,
  );
}

/** 줄 앞에 둘 구역 줄 — 첫 줄 앞 `top`(첫 줄이 4위 아래면 `climb`), 순위 4 이상의 첫 줄 앞 `climb`. */
export function zoneBefore(rows: readonly RankingRow[], index: number): "top" | "climb" | null {
  const current = rows[index];
  if (current === undefined) return null;
  const previous = rows[index - 1];
  if (current.rank >= 4) return previous === undefined || previous.rank < 4 ? "climb" : null;
  return previous === undefined ? "top" : null;
}

export function rankingViewOf(input: RankingViewInput): RankingView {
  if (input.account === "guest") return { kind: "guest" };
  const load = input.load;
  if (load === null || load.status === "error") {
    if (input.offline) return { kind: "offline" };
    return load === null ? { kind: "loading" } : { kind: "error" };
  }
  switch (load.status) {
    case "ready":
      return { kind: "ready", board: load.board };
    case "not-joined":
      return { kind: "not-joined", endsAt: load.endsAt };
    case "hidden":
      return { kind: "hidden" };
  }
}

/** 목록에 그릴 것 — 줄 하나, 또는 건너뛴 줄 수를 뜻하는 생략 표시. */
export type RankingListItem =
  | { readonly kind: "row"; readonly row: RankingRow }
  | { readonly kind: "gap"; readonly hidden: number };

const TOP = 3;
const ABOVE = 2;
const BELOW = 1;
const asRows = (rows: readonly RankingRow[]): RankingListItem[] =>
  rows.map((row) => ({ kind: "row", row }));

/**
 * 그룹 전체 대신 상위 3 · 생략 · 내 위 2 · 나 · 내 아래 1만 고릅니다(ADR-0170 D11 — 「조금만 더 하면 올라간다」).
 * 상위권이면 이어서(적어도 4위까지 — 쫓아오는 사람), 건너뛸 줄이 하나뿐이면 생략 대신 그 줄을 그립니다.
 * 내 줄이 없는 응답은 전부를 그대로 둡니다.
 */
export function nearMeItems(rows: readonly RankingRow[]): readonly RankingListItem[] {
  const mine = rows.findIndex((row) => row.me);
  if (mine < 0) return asRows(rows);
  const start = Math.max(0, mine - ABOVE);
  const end = Math.min(rows.length, Math.max(mine + BELOW, TOP) + 1);
  if (start - TOP < 2) return asRows(rows.slice(0, end));
  return [
    ...asRows(rows.slice(0, TOP)),
    { kind: "gap", hidden: start - TOP },
    ...asRows(rows.slice(start, end)),
  ];
}

/** 아바타 바탕 색의 수 — `ranking-screen.css`의 `.ranking-face-tone-0` ~ `-8`. */
export const AVATAR_TONES = 9;

/**
 * 표시 이름 → 아바타 색 번호(0 ~ 8). 사람마다 고정 — 매 렌더 난수가 아닙니다. 줄에는 user id가 없어(D2) 이름으로 고릅니다.
 * FNV-1a 32비트(글자 단위) — 31 곱 해시는 9로 나눈 나머지가 몇 색에 몰렸습니다.
 */
export function avatarToneOf(name: string): number {
  const key = name.trim();
  let hash = 2166136261;
  for (let index = 0; index < key.length; index += 1) {
    hash = Math.imul(hash ^ key.charCodeAt(index), 16777619) >>> 0;
  }
  return hash % AVATAR_TONES;
}

/** 방 머리 아래 줄의 값 — 채팅 단어 보드가 준비됐을 때만. */
export function chatStripOf(
  load: RankingLoad | null,
): { readonly words: number; readonly rank: number } | null {
  if (load?.status !== "ready" || load.board.kind !== "chat-words") return null;
  return { words: load.board.me.score, rank: load.board.me.rank };
}
