// 사진 · 음성 서버 JSON → 앱 모양입니다(ADR-0146 「앱 연결」). 순수 · 던지지 않음 — 틀린 줄은 버리고, 통째로 틀리면 null · failed.
// 계약 패키지(`media.ts`)의 zod 스키마는 앱 번들에 넣지 않습니다(번들 상한) — 같은 모양을 손으로 봅니다.

import type {
  ChatMediaNotice,
  MediaRequestResult,
  RemoteMedia,
  RemoteMediaKind,
  RemoteMediaStatus,
} from "./chat-media.contract";
import { nextUtcMidnight } from "./chat-media-rules";

type Json = Record<string, unknown>;

const recordOf = (value: unknown): Json | null =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Json) : null;
const stringOf = (value: unknown): string | null => (typeof value === "string" ? value : null);
const parse = (text: string | null): unknown => {
  if (text === null || text === "") return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
};

const KINDS: readonly string[] = ["snapshot", "voice"];
const STATUSES: readonly string[] = ["pending", "complete", "blocked", "failed"];

/** 결과 한 건 — id · 메시지 id · 종류 · 상태 · 만든 시각이 맞아야 합니다. 모르는 비율은 null. */
export function remoteMediaOf(raw: unknown): RemoteMedia | null {
  const record = recordOf(raw);
  const id = stringOf(record?.id);
  const messageId = stringOf(record?.messageId);
  const kind = stringOf(record?.kind);
  const status = stringOf(record?.status);
  const createdAt = Date.parse(stringOf(record?.createdAt) ?? "");
  if (id === null || messageId === null || kind === null || status === null) return null;
  if (!KINDS.includes(kind) || !STATUSES.includes(status) || !Number.isFinite(createdAt))
    return null;
  const aspect = record?.aspect;
  return {
    id,
    messageId,
    kind: kind as RemoteMediaKind,
    status: status as RemoteMediaStatus,
    path: stringOf(record?.path),
    aspect: aspect === "3:2" || aspect === "1:1" ? aspect : null,
    failure: stringOf(record?.failure),
    createdAt,
  };
}

/** `companion_get_media` 본문(배열) — 틀린 줄은 버립니다. */
export function mediaListFrom(bodyText: string | null): readonly RemoteMedia[] | null {
  const raw = parse(bodyText);
  if (!Array.isArray(raw)) return null;
  return raw.flatMap((item) => {
    const media = remoteMediaOf(item);
    return media === null ? [] : [media];
  });
}

/** 서버 오류 코드 → 회색 줄 까닭. 표에 없는 코드는 요청 실패로 봅니다(받았는지 모름). */
const REFUSALS: Readonly<Record<string, ChatMediaNotice>> = {
  insufficient_credits: "no-coins",
  snapshot_in_progress: "busy",
  attempt_limit: "limit",
  daily_limit: "limit",
  not_eligible: "not-eligible",
  no_speech: "not-eligible",
  too_long: "not-eligible",
  message_not_found: "not-eligible",
  forbidden: "not-eligible",
  not_available: "unavailable",
  age_restricted: "unavailable",
  temporarily_blocked: "unavailable",
  usage_time_limit: "unavailable",
  not_configured: "unavailable",
  invalid_request: "unavailable",
  invalid_session: "unavailable",
  method_not_allowed: "unavailable",
};

/** 요청 응답(HTTP 상태 + 본문) → 받음 · 거절 · 실패. 상한의 풀리는 시각은 `resetsAt`, 없으면 다음 UTC 자정(서버 상한은 UTC 날짜). */
export function mediaRequestFrom(
  status: number,
  bodyText: string | null,
  now: number,
): MediaRequestResult {
  const raw = recordOf(parse(bodyText));
  if (status >= 200 && status < 300) {
    const media = remoteMediaOf(raw?.media);
    return media === null || typeof raw?.cached !== "boolean"
      ? { kind: "failed" }
      : { kind: "accepted", media, cached: raw.cached };
  }
  if (status >= 500 && status !== 503) return { kind: "failed" };
  const code = stringOf(raw?.error);
  const notice = code === null ? undefined : REFUSALS[code];
  if (notice === undefined) return { kind: "failed" };
  if (notice !== "limit") return { kind: "refused", notice, until: null };
  const resetsAt = Date.parse(stringOf(recordOf(raw?.detail)?.resetsAt) ?? "");
  return {
    kind: "refused",
    notice,
    until: Number.isFinite(resetsAt) ? resetsAt : nextUtcMidnight(now),
  };
}

/** Storage `object/sign` 본문 → 전체 서명 URL(`<Storage 주소><signedURL>`). */
export function signedUrlFrom(bodyText: string | null, storageBase: string): string | null {
  const signed = stringOf(recordOf(parse(bodyText))?.signedURL);
  return signed === null || !signed.startsWith("/") ? null : `${storageBase}${signed}`;
}

const count = (value: unknown): number | null =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;

/** `companion_get_wallet` 본문 → 잔액(sub + grant + paid). */
export function walletBalanceFrom(bodyText: string | null): number | null {
  const raw = recordOf(parse(bodyText));
  const sub = count(raw?.sub);
  const grant = count(raw?.grant);
  const paid = count(raw?.paid);
  return sub === null || grant === null || paid === null ? null : sub + grant + paid;
}
