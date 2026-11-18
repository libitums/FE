// 롤플레이 턴 로그를 서버에 남깁니다(ADR-0161). 던지지 않고, 다시 보내지 않습니다 — 실패해도 화면은 그대로입니다.
// 로그인이 없으면(`authorizedRpc`가 `null`) 아무것도 보내지 않습니다. 음성은 없고 인식기가 낸 글자뿐입니다.

import { authorizedRpc } from "./progress-api";
import type {
  LogRoleplayTurnsPath,
  RoleplayTurnLogBatch,
  RoleplayTurnLogRow,
  RoleplayTurnLogSubmission,
} from "./roleplay-turn-log.contract";
import { loadUiLanguage } from "./ui-language";

const logRoleplayTurnsPath: LogRoleplayTurnsPath = "/rest/v1/rpc/log_roleplay_turns";

/** 인식된 글자의 상한입니다(서버도 200자까지만 받습니다). */
export const roleplayTurnLogHeardMaxLength = 200;
/** 한 번에 보내는 줄 수의 상한입니다(서버도 200줄까지만 받습니다). 넘으면 앞에서부터 200줄만 보냅니다. */
export const roleplayTurnLogMaxRows = 200;
const osVersionMaxLength = 32;

// `SystemInfo`는 Lynx 런타임의 전역입니다. 테스트 · 웹 미리보기에는 없을 수 있어 조심해서 읽습니다.
export function roleplayTurnLogOsVersion(): string | null {
  try {
    const info = (globalThis as { SystemInfo?: { osVersion?: unknown } }).SystemInfo;
    const value = info?.osVersion;
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed.slice(0, osVersionMaxLength);
  } catch {
    return null;
  }
}

/** 보낼 묶음을 만듭니다. 줄이 없거나 앱 버전을 모르면 `null`(보내지 않음)입니다. */
export function roleplayTurnLogBatchOf(
  submission: RoleplayTurnLogSubmission,
  uiLanguage: string,
  osVersion: string | null,
): RoleplayTurnLogBatch | null {
  const { episodeId, log, appVersion } = submission;
  if (appVersion === null || log.length === 0 || episodeId === "") return null;
  const turns: RoleplayTurnLogRow[] = log.slice(0, roleplayTurnLogMaxRows).map((entry) => ({
    turnIndex: entry.turnIndex,
    attempt: entry.attempt,
    outcome: entry.outcome,
    reason: entry.outcome === "unavailable" ? entry.reason : null,
    heard:
      entry.outcome === "heard"
        ? (entry.heard ?? "").slice(0, roleplayTurnLogHeardMaxLength)
        : null,
    verdict: entry.outcome === "heard" ? entry.verdict : null,
    hintShown: entry.hintShown,
  }));
  return {
    episodeId,
    mode: "scripted",
    platform: appVersion.platform,
    appVersion: appVersion.name,
    appBuild: appVersion.build,
    uiLanguage,
    osVersion,
    turns,
  };
}

/** 한 판의 기록을 서버에 남깁니다. 남겼으면 `true`. 보낼 것이 없거나 로그인이 없거나 실패하면 `false`. */
export async function submitRoleplayTurnLog(
  submission: RoleplayTurnLogSubmission,
): Promise<boolean> {
  try {
    const batch = roleplayTurnLogBatchOf(submission, loadUiLanguage(), roleplayTurnLogOsVersion());
    if (batch === null) return false;
    const body = await authorizedRpc(logRoleplayTurnsPath, { p_batch: batch });
    return body !== null;
  } catch {
    return false;
  }
}
