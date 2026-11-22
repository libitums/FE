// 푸시 캠페인 보상(ADR-0175)의 판정과 기기 기록입니다. 지급의 정본은 서버(`push_campaign_reward_claims` · 원장 · `ticket_passes`)이고,
// 이 기록은 「아직 보지 않은 보상 모달」과 「보상 무제한 티켓의 끝 시각」만 계정마다 적습니다. 판정은 순수, 기록은 기기 저장소.

import type { CatalogProgress } from "../lib/catalog-progress";
import type { PushRewardClaim } from "../lib/push-reward-api";
import { getItem, isStorageAvailable, setItem } from "../lib/storage";
import type { UnlimitedPass } from "../lib/unlimited-pass";
import { catalogActivityCount } from "./learning-progress";
import { progressUserId } from "./pending-learning-progress";

export const pushRewardStorageKey = (userId: string): string => `libitum.push-reward.${userId}`;

/** 아직 보지 않은 보상 모달 — 엽전 수 또는 무제한 티켓 시간. */
export type PushRewardModal =
  | { readonly kind: "coins"; readonly amount: number }
  | { readonly kind: "tickets"; readonly hours: number };

/** 보상 무제한 티켓의 기간(이어 붙였으면 처음 시작부터). */
export type PushRewardPass = { readonly startedAtMs: number; readonly untilMs: number };

export type PushRewardRecord = {
  readonly modal: PushRewardModal | null;
  readonly pass: PushRewardPass | null;
};

export const emptyPushRewardRecord: PushRewardRecord = { modal: null, pass: null };

const HOUR_MS = 3_600_000;

const positive = (value: unknown): number | null =>
  typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null;

function modalFrom(raw: unknown): PushRewardModal | null {
  const value = raw as Record<string, unknown> | null | undefined;
  const amount = positive(value?.["amount"]);
  const hours = positive(value?.["hours"]);
  if (value?.["kind"] === "coins" && amount !== null) return { kind: "coins", amount };
  if (value?.["kind"] === "tickets" && hours !== null) return { kind: "tickets", hours };
  return null;
}

function passFrom(raw: unknown): PushRewardPass | null {
  const value = raw as Record<string, unknown> | null | undefined;
  const startedAtMs = value?.["startedAtMs"];
  const untilMs = value?.["untilMs"];
  return typeof startedAtMs === "number" && typeof untilMs === "number" && untilMs > startedAtMs
    ? { startedAtMs, untilMs }
    : null;
}

export function pushRewardRecordFrom(raw: string | null): PushRewardRecord {
  if (raw === null || raw.trim() === "") return emptyPushRewardRecord;
  try {
    const value = JSON.parse(raw) as Record<string, unknown> | null;
    return { modal: modalFrom(value?.["modal"]), pass: passFrom(value?.["pass"]) };
  } catch {
    return emptyPushRewardRecord;
  }
}

/**
 * claim 응답 뒤의 기록. 받았으면 모달 대기(티켓은 이용권도 — 살아 있는 이용권이면 시작은 그대로 · 끝은 늦은 쪽). 이미 받은 티켓은
 * 모달 없이 이용권만 되살립니다(다른 기기 · 재설치에서 같은 알림을 다시 누른 경우). 그 밖의 판정은 바꾸지 않습니다.
 */
export function pushRewardRecordAfter(
  record: PushRewardRecord,
  claim: PushRewardClaim,
  nowMs: number,
): PushRewardRecord {
  const reward = claim.reward;
  if (reward === null || (claim.status !== "granted" && claim.status !== "already_claimed"))
    return record;
  if (reward.kind === "coins")
    return claim.status === "granted" ? { ...record, modal: reward } : record;
  if (reward.untilMs <= nowMs) return record;
  const live = record.pass !== null && record.pass.untilMs > nowMs ? record.pass : null;
  const startedAtMs =
    live?.startedAtMs ??
    (claim.status === "granted" ? nowMs : reward.untilMs - reward.hours * HOUR_MS);
  const pass = { startedAtMs, untilMs: Math.max(live?.untilMs ?? 0, reward.untilMs) };
  return claim.status === "granted"
    ? { modal: { kind: "tickets", hours: reward.hours }, pass }
    : { ...record, pass };
}

/** 모달을 그릴 때인가 — 지도가 한가하고 첫 유닛 안내가 꺼졌고 아직 보지 않은 보상이 있음. */
export function pushRewardStep(input: {
  readonly signedIn: boolean;
  readonly record: PushRewardRecord;
  readonly idle: boolean;
  readonly guideOn: boolean;
}): "modal" | null {
  return input.signedIn && input.idle && !input.guideOn && input.record.modal !== null
    ? "modal"
    : null;
}

/** 첫 유닛 안내(활동 0)가 지도를 덮는 동안인가 — 그동안은 모달을 미룹니다(`firstUnitGuideEnabled`와 같은 기준). */
export function pushRewardGuideOn(progress: CatalogProgress, legacyPassed: boolean): boolean {
  return !legacyPassed && catalogActivityCount(progress) === 0;
}

/** 엽전 출시 · 업데이트 · Letters 안내를 미루나 — 묻는 중 · 모달 대기 · 날기 동안. */
export function pushRewardHoldsLater(input: {
  readonly claiming: boolean;
  readonly record: PushRewardRecord;
  readonly flying: boolean;
}): boolean {
  return input.claiming || input.flying || input.record.modal !== null;
}

/** 실패 이유(이벤트) — 받았으면 null, 응답이 없으면 error. */
export function pushRewardFailure(claim: PushRewardClaim | null): string | null {
  if (claim === null) return "error";
  if (claim.status === "granted") return null;
  return claim.status;
}

/** 머리 칩 · 무제한 모달이 그릴 보상 이용권 — 끝났으면 undefined. */
export function pushRewardPassOf(
  record: PushRewardRecord,
  nowMs: number,
): UnlimitedPass | undefined {
  const pass = record.pass;
  return pass !== null && pass.untilMs > nowMs
    ? { kind: "timed", startedAtMs: pass.startedAtMs, endsAtMs: pass.untilMs }
    : undefined;
}

export type PushRewardStore = {
  readonly read: () => PushRewardRecord;
  readonly write: (record: PushRewardRecord) => void;
};

/** 지금 로그인한 계정의 기록 — background(효과 · 핸들러)에서만 부릅니다. 로그인이 없으면 읽지도 쓰지도 않습니다. */
export const devicePushRewardStore: PushRewardStore = {
  read: () => {
    "background only";
    try {
      const userId = progressUserId();
      return userId !== null && isStorageAvailable()
        ? pushRewardRecordFrom(getItem(pushRewardStorageKey(userId)))
        : emptyPushRewardRecord;
    } catch {
      return emptyPushRewardRecord;
    }
  },
  write: (record) => {
    "background only";
    try {
      const userId = progressUserId();
      if (userId !== null && isStorageAvailable())
        setItem(pushRewardStorageKey(userId), JSON.stringify(record));
    } catch {
      // 저장 실패가 화면을 막지 않습니다 — 이번 실행의 상태로 모달 · 칩은 그대로 섭니다.
    }
  },
};
