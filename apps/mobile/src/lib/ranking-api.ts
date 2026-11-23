// 주간 순위 RPC 클라이언트(ADR-0170) — `ranking_board(p_board)` · `ranking_preferences()` · `ranking_set_hidden(p_hidden)`.
// **던지지 않습니다** — 로그인 · 설정이 없거나 응답이 틀리면 `error` · null.

import type { HttpRequestInit, SupabaseConfig } from "./auth-session.contract";
import { bearerHeaders } from "./auth-request";
import type { RankingBoardKind, RankingClient, RankingLoad, RankingRow } from "./ranking.contract";
import { isSuccessStatus, type AuthRequestOutcome } from "./supabase-transport";

export type RankingClientDeps = {
  readonly token: () => Promise<string | null>;
  readonly post: (
    build: (config: SupabaseConfig) => { url: string; init: HttpRequestInit },
  ) => Promise<AuthRequestOutcome>;
};

type Json = Record<string, unknown>;

const SERVER_BOARD: Readonly<Record<RankingBoardKind, string>> = {
  lessons: "lessons",
  "chat-words": "chat_words",
};
const ERROR: RankingLoad = { status: "error" };

const recordOf = (value: unknown): Json | null =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Json) : null;
const count = (value: unknown): number | null =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
const parse = (bodyText: string | null): Json | null => {
  if (bodyText === null || bodyText.trim() === "") return null;
  try {
    return recordOf(JSON.parse(bodyText) as unknown);
  } catch {
    return null;
  }
};

function rowOf(raw: unknown): RankingRow | null {
  const row = recordOf(raw);
  const rank = count(row?.rank);
  const score = count(row?.score);
  const name = row?.name;
  const country = row?.country;
  const episode = row?.episode === null ? null : count(row?.episode);
  if (row === null || rank === null || score === null || typeof name !== "string") return null;
  if (typeof row.me !== "boolean" || (row.episode !== null && episode === null)) return null;
  return {
    rank,
    name,
    countryCode: typeof country === "string" ? country : null,
    episode,
    score,
    me: row.me,
  };
}

function nextOf(raw: unknown): { readonly name: string; readonly more: number } | null | undefined {
  if (raw === null) return null;
  const next = recordOf(raw);
  const more = count(next?.more);
  return typeof next?.name === "string" && more !== null ? { name: next.name, more } : undefined;
}

/** 서버 응답 본문을 한 보드의 결과로 풉니다. 틀리면 `error`. */
export function rankingLoadFrom(kind: RankingBoardKind, bodyText: string | null): RankingLoad {
  const raw = parse(bodyText);
  if (raw?.state === "hidden") return { status: "hidden" };
  const endsAt = typeof raw?.endsAt === "string" ? raw.endsAt : null;
  if (raw?.state === "not_joined")
    return endsAt === null ? ERROR : { status: "not-joined", endsAt };
  if (raw?.state !== "ranked" || raw.board !== SERVER_BOARD[kind] || endsAt === null) return ERROR;
  const groupSize = count(raw.groupSize);
  const reward = raw.reward === null ? null : count(raw.reward);
  const me = recordOf(raw.me);
  const myRank = count(me?.rank);
  const myScore = count(me?.score);
  const next = nextOf(raw.next);
  if (!Array.isArray(raw.rows) || groupSize === null || myRank === null || myScore === null)
    return ERROR;
  if ((raw.reward !== null && reward === null) || next === undefined) return ERROR;
  const rows: RankingRow[] = [];
  for (const item of raw.rows) {
    const row = rowOf(item);
    if (row === null) return ERROR;
    rows.push(row);
  }
  return {
    status: "ready",
    board: { kind, groupSize, endsAt, reward, rows, me: { rank: myRank, score: myScore }, next },
  };
}

/** `{hidden}` 응답을 풉니다. 틀리면 null. */
export function rankingHiddenFrom(bodyText: string | null): { readonly hidden: boolean } | null {
  const raw = parse(bodyText);
  return typeof raw?.hidden === "boolean" ? { hidden: raw.hidden } : null;
}

export function createRankingClient(deps: RankingClientDeps): RankingClient {
  /** RPC 하나를 부르고 성공 본문을 돌려줍니다. 로그인 없음 · 실패 · 던짐은 null. */
  const call = async (name: string, body: Json): Promise<string | null> => {
    try {
      const token = await deps.token();
      if (token === null) return null;
      const outcome = await deps.post((config) => ({
        url: `${config.url}/rest/v1/rpc/${name}`,
        init: { method: "POST", headers: bearerHeaders(config, token), body: JSON.stringify(body) },
      }));
      return outcome.ok && isSuccessStatus(outcome.status) ? outcome.bodyText : null;
    } catch {
      return null;
    }
  };
  return {
    load: async (kind) =>
      rankingLoadFrom(kind, await call("ranking_board", { p_board: SERVER_BOARD[kind] })),
    preferences: async () => rankingHiddenFrom(await call("ranking_preferences", {})),
    setHidden: async (hidden) =>
      rankingHiddenFrom(await call("ranking_set_hidden", { p_hidden: hidden })),
  };
}
