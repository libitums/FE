// 순위 화면에서 지난번에 본 내 점수의 기기 사본(ADR-0170 D12) — 숫자 오름의 출발 값입니다. 계정별 칸에 이번 주(끝 시각)와 보드별
// 점수를 둡니다. 주가 바뀌면 앞 주의 점수는 버립니다. 로그인이 없으면 읽지도 쓰지도 않습니다.

import { loadAuthSession } from "./auth-session";
import { authUserIdFrom } from "./auth-user-id";
import type { RankingBoardKind } from "./ranking.contract";
import { getItem, setItem } from "./storage";

export const rankingSeenStoragePrefix = "libitum.ranking.seen.";

export type SeenScores = {
  readonly endsAt: string;
  readonly scores: Partial<Record<RankingBoardKind, number>>;
};

const KINDS: readonly RankingBoardKind[] = ["lessons", "chat-words"];

/** 저장한 글을 읽습니다 — 깨졌거나 모양이 다르면 null. */
export function parseSeenScores(raw: string | null): SeenScores | null {
  if (raw === null) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  if (typeof record["endsAt"] !== "string") return null;
  const stored = (record["scores"] ?? {}) as Record<string, unknown>;
  const scores: Partial<Record<RankingBoardKind, number>> = {};
  for (const kind of KINDS) {
    const score = typeof stored === "object" && stored !== null ? stored[kind] : undefined;
    if (typeof score === "number" && Number.isFinite(score)) scores[kind] = score;
  }
  return { endsAt: record["endsAt"], scores };
}

/** 같은 주의 그 보드에서 본 점수 — 없으면 null. */
export function seenScoreIn(
  seen: SeenScores | null,
  kind: RankingBoardKind,
  endsAt: string,
): number | null {
  if (seen === null || seen.endsAt !== endsAt) return null;
  return seen.scores[kind] ?? null;
}

export function withSeenScore(
  seen: SeenScores | null,
  kind: RankingBoardKind,
  endsAt: string,
  score: number,
): SeenScores {
  const kept = seen !== null && seen.endsAt === endsAt ? seen.scores : {};
  return { endsAt, scores: { ...kept, [kind]: score } };
}

function keyOfCurrentUser(): string | null {
  const session = loadAuthSession();
  const userId = session === null ? null : authUserIdFrom(session.accessToken);
  return userId === null ? null : `${rankingSeenStoragePrefix}${userId}`;
}

/** 지난번에 본 점수를 돌려주고(없으면 null) 지금 점수로 바꿔 둡니다. */
export function takeSeenScore(
  kind: RankingBoardKind,
  endsAt: string,
  score: number,
): number | null {
  const key = keyOfCurrentUser();
  if (key === null) return null;
  const seen = parseSeenScores(getItem(key));
  setItem(key, JSON.stringify(withSeenScore(seen, kind, endsAt, score)));
  return seenScoreIn(seen, kind, endsAt);
}
