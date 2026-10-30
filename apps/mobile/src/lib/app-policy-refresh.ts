import "background-only";

// 앱 정책(`app-policy.json`)을 한 번 받아 기기에 두는 한 차례입니다(ADR-0086). `audio-manifest-refresh.ts`와 같은
// 규칙 — 유효하면 저장, 서버에 없으면 저장본 제거, 그 밖 실패 · 형식 틀림은 저장본을 둡니다.
import { APP_POLICY_KEY, APP_POLICY_PATH, decodeAppPolicy } from "./app-policy";
import { ABSENT_HTTP_CODES } from "./episode-asset-sync";
import { safeGet, tryRemove, trySet } from "./episode-cache";
import type { ContentStore } from "./episode-cache";
import type { FetchText, FetchTextResult } from "./episode-remote";

export type AppPolicyRefresh =
  | "updated"
  | "unchanged"
  | "removed"
  | "absent"
  | "unavailable"
  | "invalid";

export type AppPolicyRefreshDeps = { readonly fetchText: FetchText; readonly store: ContentStore };

function storeAvailable(store: ContentStore): boolean {
  try {
    return store.available();
  } catch {
    return false;
  }
}

/** 전송 호출이 reject하면 연결 실패로 봅니다. */
async function safeFetch(fetchText: FetchText): Promise<FetchTextResult> {
  try {
    return await fetchText(APP_POLICY_PATH, { kind: "fresh" });
  } catch {
    return { ok: false, reason: "network" };
  }
}

/** 서버에 없을 때 — 저장본이 있으면 지우고(`removed`), 원래 없었으면 `absent`입니다. */
function dropStored(store: ContentStore): AppPolicyRefresh {
  if (safeGet(store, APP_POLICY_KEY) === null) return "absent";
  return tryRemove(store, APP_POLICY_KEY) ? "removed" : "unavailable";
}

/**
 * `app-policy.json`을 분 단위 키(`?m=`)로 한 번 받습니다. 유효하면 원문을 저장하고(같으면 그대로), 서버에
 * 없으면(400 · 403 · 404 · 410) 저장본을 지우며, 그 밖 실패 · 형식 틀림은 저장본을 둡니다. 던지지 않습니다.
 */
export async function refreshAppPolicy(deps: AppPolicyRefreshDeps): Promise<AppPolicyRefresh> {
  const { fetchText, store } = deps;
  if (!storeAvailable(store)) return "unavailable";
  const reply = await safeFetch(fetchText);
  if (!reply.ok) return "unavailable";
  if (ABSENT_HTTP_CODES.has(reply.status)) return dropStored(store);
  if (reply.status !== 200) return "unavailable";
  if (decodeAppPolicy(reply.text) === null) return "invalid";
  if (safeGet(store, APP_POLICY_KEY) === reply.text) return "unchanged";
  return trySet(store, APP_POLICY_KEY, reply.text) ? "updated" : "unavailable";
}
