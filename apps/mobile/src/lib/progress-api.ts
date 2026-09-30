// 학습 진행 · 연속 학습의 서버 요청입니다(ADR-0035). 모두 로그인한 사용자의 액세스 토큰으로 RPC를 부르고, 만료가
// 가까우면 먼저 갱신합니다. **던지지 않고 실패는 `null` · `false`입니다** — 진행 저장은 학습을 막지 않습니다.

import { sessionNeedsRefresh } from "./account-deletion";
import { refreshAuthSession } from "./api-client";
import { bearerHeaders } from "./auth-request";
import { loadAuthSession, saveAuthSession } from "./auth-session";
import type { HttpRequestInit, SupabaseConfig } from "./auth-session.contract";
import type {
  LearningStreakPath,
  LoadLearningProgressPath,
  LocalDay,
  RecordLearningDayPath,
  RecordLearningDaysPath,
  SaveLearningProgressPath,
} from "./learning-progress.contract";
import type { SubmitFeedbackPath } from "./feedback.contract";
import { isSuccessStatus, send } from "./supabase-transport";

type RpcPath =
  | LoadLearningProgressPath
  | SaveLearningProgressPath
  | RecordLearningDayPath
  | RecordLearningDaysPath
  | LearningStreakPath
  | SubmitFeedbackPath;

export function learningRpcRequest(
  config: SupabaseConfig,
  accessToken: string,
  path: RpcPath,
  body: Record<string, unknown>,
): { url: string; init: HttpRequestInit } {
  return {
    url: `${config.url}${path}`,
    init: {
      method: "POST",
      headers: bearerHeaders(config, accessToken),
      body: JSON.stringify(body),
    },
  };
}

// 진행 중인 갱신입니다. 불러오기 · 저장 · 날짜 기록이 한꺼번에 갱신을 부르면 **같은 refresh 토큰으로 여러 번**
// 요청하게 되고, Auth가 재사용으로 보아 세션을 끊을 수 있습니다. 같은 세션만 공유하고 계정 전환 뒤 요청은 분리합니다.
const pendingRefreshes = new Map<string, Promise<string | null>>();

/** 로그인해 있으면 쓸 수 있는 액세스 토큰입니다. 만료가 가까우면 갱신해 저장합니다. 없거나 갱신이 실패하면 `null`. */
export async function currentAccessToken(nowMs: number = Date.now()): Promise<string | null> {
  try {
    const session = loadAuthSession();
    if (session === null) return null;
    if (!sessionNeedsRefresh(session, nowMs)) return session.accessToken;
    const key = session.refreshToken;
    let pending = pendingRefreshes.get(key);
    if (pending === undefined) {
      pending = (async () => {
        try {
          const refreshed = await refreshAuthSession(session.refreshToken);
          // 응답을 기다리는 동안 로그아웃하거나 다른 세션으로 바뀌었으면 저장도 RPC도 하지 않습니다.
          if (refreshed.status !== "refreshed" || loadAuthSession()?.refreshToken !== key)
            return null;
          saveAuthSession(refreshed.session);
          return refreshed.session.accessToken;
        } finally {
          pendingRefreshes.delete(key);
        }
      })();
      pendingRefreshes.set(key, pending);
    }
    return await pending;
  } catch {
    return null;
  }
}

/** 로그인한 사용자로 RPC 하나를 부릅니다. 2xx면 본문, 그 밖(로그인 없음 · 실패 · 연결 실패)은 `null`. */
export async function authorizedRpc(
  path: RpcPath,
  body: Record<string, unknown>,
): Promise<string | null> {
  try {
    const accessToken = await currentAccessToken();
    if (accessToken === null || loadAuthSession()?.accessToken !== accessToken) return null;
    const outcome = await send(
      (config) => learningRpcRequest(config, accessToken, path, body),
      true,
    );
    return outcome.ok && isSuccessStatus(outcome.status) ? outcome.bodyText : null;
  } catch {
    return null;
  }
}

function jsonFrom(bodyText: string | null): unknown {
  if (bodyText === null || bodyText === "") return null;
  try {
    return JSON.parse(bodyText) as unknown;
  } catch {
    return null;
  }
}

function countFrom(bodyText: string | null): number | null {
  const value = jsonFrom(bodyText);
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

/**
 * 서버의 진행 스냅숏(검증 전)입니다. 저장된 적이 없으면 `raw: null`로 **성공**이고, 요청이 실패하면 `ok: false`입니다 —
 * 둘을 가려야 실패를 「빈 진행」으로 읽어 서버의 진행을 덮어쓰지 않습니다.
 */
export async function loadLearningProgress(): Promise<
  { readonly ok: true; readonly raw: unknown } | { readonly ok: false }
> {
  const bodyText = await authorizedRpc("/rest/v1/rpc/load_learning_progress", {});
  if (bodyText === null) return { ok: false };
  try {
    return { ok: true, raw: JSON.parse(bodyText) as unknown };
  } catch {
    return { ok: false };
  }
}

export async function saveLearningProgress(snapshot: object): Promise<boolean> {
  return (
    (await authorizedRpc("/rest/v1/rpc/save_learning_progress", { p_progress: snapshot })) !== null
  );
}

/** 오늘을 학습한 날로 적고 새 연속 일수를 받습니다. */
export async function recordLearningDay(day: LocalDay): Promise<number | null> {
  return countFrom(await authorizedRpc("/rest/v1/rpc/record_learning_day", { p_day: day }));
}

/** 원래 학습 날짜들을 멱등 저장하고 현재 기기 날짜 기준의 연속 일수를 받습니다. */
export async function recordLearningDays(
  days: readonly LocalDay[],
  today: LocalDay,
): Promise<number | null> {
  return countFrom(
    await authorizedRpc("/rest/v1/rpc/record_learning_days", { p_days: days, p_today: today }),
  );
}

export async function fetchLearningStreak(today: LocalDay): Promise<number | null> {
  return countFrom(await authorizedRpc("/rest/v1/rpc/learning_streak", { p_today: today }));
}

/** 기기 시간대의 날짜입니다. */
export function localDayFrom(date: Date): LocalDay {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
