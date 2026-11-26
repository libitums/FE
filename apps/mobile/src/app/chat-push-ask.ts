// 채팅 첫 답장 뒤 알림 권한 카드(ADR-0197 D2)의 판정과 계정 · 기기 기록입니다. 판정은 순수, 기록은 기기 저장소.
//
// 기록은 카드가 **설 때** 적습니다(횟수 · 시각). Not now는 기록을 바꾸지 않습니다 — 보고 답하지 않고 나간 것도 한 번으로 셉니다.

import type { PushPermission } from "../lib/push-notifications.contract";
import { pushAllowed } from "../lib/push-notifications";
import { getItem, setItem } from "../lib/storage";

export const chatPushAskStorageKey = (userId: string): string => `libitum.chat-push-ask.${userId}`;

/** 카드가 서는 최대 횟수. */
export const CHAT_PUSH_ASK_MAX = 2;
/** 다시 서기까지의 간격 — 3일. */
export const CHAT_PUSH_ASK_GAP_MS = 3 * 24 * 60 * 60 * 1000;

export type ChatPushAskRecord = {
  readonly shown: number;
  readonly lastShownAtMs: number | null;
};

export const emptyChatPushAskRecord: ChatPushAskRecord = { shown: 0, lastShownAtMs: null };

export type ChatPushAskDecision = "card" | "register" | "none";

export type ChatPushAskInput = {
  readonly signedIn: boolean;
  readonly permission: PushPermission | null;
  readonly record: ChatPushAskRecord;
  readonly nowMs: number;
};

export function chatPushAskDecision(input: ChatPushAskInput): ChatPushAskDecision {
  const { signedIn, permission, record, nowMs } = input;
  if (!signedIn || permission === null) return "none";
  if (pushAllowed(permission)) return "register";
  if (permission !== "not-determined" || record.shown >= CHAT_PUSH_ASK_MAX) return "none";
  const last = record.lastShownAtMs;
  // 시계가 뒤로 갔으면(마지막이 미래) 간격 안으로 봅니다.
  if (last !== null && (nowMs < last || nowMs - last < CHAT_PUSH_ASK_GAP_MS)) return "none";
  return "card";
}

export function chatPushAskRecordFrom(raw: string | null): ChatPushAskRecord {
  if (raw === null || raw.trim() === "") return emptyChatPushAskRecord;
  try {
    const value = JSON.parse(raw) as Record<string, unknown> | null;
    const shown = value?.["shown"];
    const last = value?.["lastShownAtMs"];
    if (typeof shown !== "number" || !Number.isInteger(shown) || shown < 0)
      return emptyChatPushAskRecord;
    return { shown, lastShownAtMs: typeof last === "number" ? last : null };
  } catch {
    return emptyChatPushAskRecord;
  }
}

/** 카드가 선 뒤의 기록. */
export function chatPushAskShown(record: ChatPushAskRecord, nowMs: number): ChatPushAskRecord {
  return { shown: record.shown + 1, lastShownAtMs: nowMs };
}

export function readChatPushAsk(userId: string): ChatPushAskRecord {
  "background only";
  try {
    return chatPushAskRecordFrom(getItem(chatPushAskStorageKey(userId)));
  } catch {
    return emptyChatPushAskRecord;
  }
}

export function writeChatPushAsk(userId: string, record: ChatPushAskRecord): void {
  "background only";
  try {
    setItem(chatPushAskStorageKey(userId), JSON.stringify(record));
  } catch {
    // 적지 못해도 카드는 이번 입장에서 한 번뿐입니다.
  }
}
