// 컴패니언 서버 JSON → 앱 모양입니다(ADR-0137). 순수 · 던지지 않음 — 모양이 틀린 칸은 버리고, 통째로 틀리면 null.
// 계약 패키지(`@libitums/companion-contract`)의 zod 스키마는 앱 번들에 넣지 않습니다(번들 상한) — 같은 모양을 손으로 봅니다.

import type { ChatCorrection, ChatCorrectionItem } from "./chat-feedback.contract";
import type { RemoteGreeting, RemoteHistory, RemoteSendFailure } from "./chat-remote.contract";
import type {
  ChatCorrectionChange,
  ChatCrisisResource,
  ChatMessage,
  ChatNoticeKind,
  ChatReplyIdea,
} from "./chat-source.contract";

export type RemoteSegment = {
  readonly kind: string;
  readonly text: string;
  readonly translation: string;
};
type Json = Record<string, unknown>;

const BLOCK_FALLBACK_MS = 30 * 60_000;

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
const timeOf = (value: unknown): number | null => {
  const ms = typeof value === "string" ? Date.parse(value) : Number.NaN;
  return Number.isFinite(ms) ? ms : null;
};

/** 말풍선 하나 — 말은 그대로, 행동 · 서술 지문은 「*…*」(사용자 결정 2026-11-12). 번역은 그대로. */
export function segmentText(segment: RemoteSegment): { readonly ko: string; readonly en: string } {
  if (segment.kind === "speech") return { ko: segment.text, en: segment.translation };
  return { ko: `*${segment.text}*`, en: segment.translation };
}

/** 낭독 문장 — 별표를 떼고 「이름: 지문, 번역」. */
export function actionSpoken(
  text: { readonly ko: string; readonly en: string },
  name: string,
): string {
  // 정규식 플래그(s · u)는 빌드가 변환하지 않아 기기 엔진(Android PrimJS)이 그대로 받습니다 — 문자열 함수로 뗍니다.
  const plain = (value: string) =>
    value.length >= 2 && value.startsWith("*") && value.endsWith("*") ? value.slice(1, -1) : value;
  return text.en === ""
    ? `${name}: ${plain(text.ko)}`
    : `${name}: ${plain(text.ko)}, ${plain(text.en)}`;
}

export function segmentsOf(raw: unknown): readonly RemoteSegment[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    const record = recordOf(item);
    const kind = stringOf(record?.kind);
    const text = stringOf(record?.text);
    if (kind === null || text === null || text === "") return [];
    return [{ kind, text, translation: stringOf(record?.translation) ?? "" }];
  });
}

const NOTICE_KINDS: Readonly<Record<string, ChatNoticeKind>> = {
  ai_disclosure: "ai-disclosure",
  minor_notice: "minor-notice",
  break_reminder: "break-reminder",
};

export function noticeKindOf(raw: unknown): ChatNoticeKind | null {
  return typeof raw === "string" ? (NOTICE_KINDS[raw] ?? null) : null;
}

/** 원래 글과 고친 글의 앞뒤 같은 글자를 뺀 범위 하나(고친 글 안, 코드 포인트) — 연필 카드의 강조입니다. */
function changedRange(original: string, corrected: string): readonly ChatCorrectionChange[] {
  const before = [...original];
  const after = [...corrected];
  let head = 0;
  while (head < before.length && head < after.length && before[head] === after[head]) head += 1;
  let tail = 0;
  while (
    tail < before.length - head &&
    tail < after.length - head &&
    before[before.length - 1 - tail] === after[after.length - 1 - tail]
  )
    tail += 1;
  const end = after.length - tail;
  return end > head ? [{ start: head, end }] : [];
}

const KINDS = new Set(["correction", "better", "l1_to_ko"]);

export function correctionOf(raw: unknown): ChatCorrection | null {
  const record = recordOf(raw);
  const kind = stringOf(record?.kind);
  const corrected = stringOf(record?.corrected);
  if (record?.status !== "ok" || kind === null || !KINDS.has(kind) || corrected === null)
    return null;
  if (!Array.isArray(record.items)) return null;
  const items: ChatCorrectionItem[] = [];
  for (const item of record.items) {
    const entry = recordOf(item);
    const from = stringOf(entry?.original);
    const to = stringOf(entry?.corrected);
    const reason = stringOf(entry?.reason);
    if (from === null || to === null || reason === null) return null;
    items.push({ original: from, corrected: to, reason });
  }
  const better = recordOf(record.better);
  const betterText = stringOf(better?.text);
  return {
    kind: kind as ChatCorrection["kind"],
    corrected,
    changes: changedRange(stringOf(record.original) ?? "", corrected),
    items,
    better:
      betterText === null
        ? null
        : {
            text: betterText,
            meaning: stringOf(better?.meaning) ?? "",
            explanation: stringOf(better?.explanation) ?? "",
          },
    meaning: stringOf(record.meaning),
  };
}

export function ideasOf(raw: unknown): readonly ChatReplyIdea[] | null {
  if (!Array.isArray(raw)) return null;
  return raw.flatMap((item) => {
    const record = recordOf(item);
    const text = stringOf(record?.text);
    if (text === null || text.trim() === "") return [];
    return [{ ko: text, roman: "", en: stringOf(record?.meaning) ?? "" }];
  });
}

export function crisisOf(raw: unknown): readonly ChatCrisisResource[] | null {
  const resources = recordOf(raw)?.resources;
  if (!Array.isArray(resources)) return null;
  return resources.flatMap((item) => {
    const record = recordOf(item);
    const name = stringOf(record?.name);
    if (name === null) return [];
    return [
      {
        name,
        phone: stringOf(record?.phone),
        url: stringOf(record?.url),
        hours: stringOf(record?.hours),
      },
    ];
  });
}

/** 캐릭터 메시지 하나 → 말풍선 줄들(id = 메시지 id#자리). */
export function bubblesOf(
  messageId: string,
  at: number,
  segments: readonly RemoteSegment[],
): readonly ChatMessage[] {
  return segments.map((segment, index): ChatMessage =>
    segment.kind === "speech"
      ? { id: `${messageId}#${index}`, at, kind: "text", from: "them", text: segmentText(segment) }
      : { id: `${messageId}#${index}`, at, kind: "action", text: segmentText(segment) },
  );
}

function messagesOf(raw: Json): {
  messages: ChatMessage[];
  corrections: Record<string, ChatCorrection>;
  ideas: readonly ChatReplyIdea[] | null;
} {
  const messages: ChatMessage[] = [];
  const corrections: Record<string, ChatCorrection> = {};
  let ideas: readonly ChatReplyIdea[] | null = null;
  for (const item of [...(raw.messages as unknown[])].reverse()) {
    const record = recordOf(item);
    const id = stringOf(record?.id);
    const at = timeOf(record?.createdAt);
    if (record === null || id === null || at === null || record.hidden === true) continue;
    if (record.role === "user") {
      // 서버에서 턴이 실패한 글은 보낸 글이 아닙니다 — 앱의 Not sent 글이 그대로 남아 다시 보냅니다(ADR-0138).
      if (record.status === "failed") continue;
      const text = stringOf(record.text);
      if (text === null) continue;
      messages.push({ id, at, kind: "text", from: "me", text: { ko: text, en: "" } });
      const card = correctionOf(record.feedback);
      if (card !== null) corrections[id] = card;
    } else if (record.role === "assistant") {
      messages.push(...bubblesOf(id, at, segmentsOf(record.segments)));
      ideas = ideasOf(record.suggestions);
    } else if (record.role === "notice") {
      const notice = noticeKindOf(recordOf(record.notice)?.kind);
      if (notice !== null) messages.push({ id, at, kind: "notice", notice });
    }
  }
  return { messages, corrections, ideas };
}

export function historyFrom(bodyText: string | null): RemoteHistory | null {
  const raw = recordOf(parse(bodyText));
  if (raw === null || !Array.isArray(raw.messages)) return null;
  return messagesOf(raw);
}

export function greetingFrom(bodyText: string | null, now: number): RemoteGreeting | null {
  const raw = recordOf(parse(bodyText));
  const messageId = stringOf(raw?.messageId);
  // 이 계정은 그 인물과 대화할 수 없음 — 빈 방 대신 그 까닭을 회색 줄로(ADR-0137).
  if (raw?.status === "unavailable" && raw.reason === "not_available")
    return {
      messages: [{ id: "greet~not-available", at: now, kind: "notice", notice: "not-available" }],
      ideas: null,
    };
  if (raw?.status !== "ok" || messageId === null) return null;
  const messages = bubblesOf(messageId, now, segmentsOf(raw.segments));
  if (messages.length === 0) return null;
  return { messages, ideas: ideasOf(recordOf(raw.suggestions)?.items) };
}

/** 스트림을 열기 전 오류 본문 → 앱의 실패 갈래. */
export function sendFailureOf(detail: string | null, now: number): RemoteSendFailure {
  const raw = recordOf(parse(detail));
  const fields = recordOf(raw?.detail);
  switch (raw?.error) {
    case "temporarily_blocked":
      return { kind: "blocked", until: timeOf(fields?.until) ?? now + BLOCK_FALLBACK_MS };
    case "usage_time_limit":
      return { kind: "usage-limit", resetsAt: timeOf(fields?.resetsAt) ?? now };
    case "age_restricted":
      return { kind: "age-restricted" };
    case "insufficient_credits":
    case "trial_exhausted":
      return { kind: "no-credits" };
    case "not_available":
      return { kind: "not-available" };
    default:
      return { kind: "failed" };
  }
}
