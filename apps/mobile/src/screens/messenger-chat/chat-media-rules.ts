// 서버 사진 · 음성의 순수 규칙입니다(ADR-0146 「앱 연결」) — 대상 메시지 · 알약 상태 · 로그 줄 · 다시 읽기 간격.
//
// 대상 = 로그의 가장 최근 캐릭터 메시지(서버 id `<uuid>#<자리>`의 말 · 지문 말풍선 묶음). 음성은 그 메시지에 말 조각이 있어야 합니다.
// 결과 줄 id = `<대상 id>~<snapshot|voice>~<media id | req | x번호>` — 대상 말풍선 뒤에 서고, 기록을 다시 합쳐도(앱 전용 줄) 그 자리에 남습니다.

import type {
  ChatMediaAvailability,
  ChatMediaTarget,
  RemoteMedia,
  RemoteMediaKind,
} from "./chat-media.contract";
import type { ChatMediaKind, ChatMessage } from "./chat-source.contract";

/** 앱 쪽 다시 읽기 상한 — 서버 만료(`media_pending_minutes` 기본 10분) + 1분. */
export const MEDIA_POLL_LIMIT_MS = 660_000;
/**
 * 다시 읽기 간격 — 일이 실제로 끝나는 구간은 촘촘히, 그 뒤로 늘립니다. 음성은 3 ~ 5초, 사진은 15 ~ 25초(검사 노드를 돌면 더)에
 * 끝납니다. 예전 간격(2 · 3 · 5 · 5 · 10 …)은 누적 15초 다음이 25초라 17초에 끝난 사진을 8초 늦게 봤습니다.
 * 40초까지 2초마다(20번) → 60초까지 5초(4번) → 90초까지 10초(3번) → 120초까지 15초(2번) → 그 뒤 30초.
 */
const POLL_DELAYS_MS: readonly number[] = [
  ...Array<number>(20).fill(2_000),
  ...Array<number>(4).fill(5_000),
  ...Array<number>(3).fill(10_000),
  ...Array<number>(2).fill(15_000),
];
const POLL_TAIL_MS = 30_000;
const DAY_MS = 86_400_000;

export const remoteKindOf = (media: ChatMediaKind): RemoteMediaKind =>
  media === "photo" ? "snapshot" : "voice";

/** 서버 캐릭터 말풍선 id(`<uuid>#<자리>`)의 메시지 id. */
const SERVER_BUBBLE = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})#\d+$/i;

const bubbleOwner = (message: ChatMessage): string | null => {
  const fromThem =
    message.kind === "action" || (message.kind === "text" && message.from === "them");
  return fromThem ? (SERVER_BUBBLE.exec(message.id)?.[1] ?? null) : null;
};

export function mediaTargetOf(
  messages: readonly ChatMessage[],
  media: ChatMediaKind,
): ChatMediaTarget | null {
  let owner: string | null = null;
  for (let i = messages.length - 1; i >= 0 && owner === null; i -= 1) {
    owner = bubbleOwner(messages[i] as ChatMessage);
  }
  if (owner === null) return null;
  const speech = messages.filter(
    (m): m is Extract<ChatMessage, { kind: "text" }> =>
      m.kind === "text" && bubbleOwner(m) === owner,
  );
  if (media === "voice" && speech.length === 0) return null;
  return {
    messageId: owner,
    text: {
      ko: speech.map((m) => m.text.ko).join(" "),
      en: speech
        .map((m) => m.text.en)
        .filter((en) => en !== "")
        .join(" "),
    },
  };
}

export function mediaLineId(targetId: string, media: ChatMediaKind, suffix: string): string {
  return `${targetId}~${remoteKindOf(media)}~${suffix}`;
}

export function mediaLineKey(
  id: string,
): { readonly targetId: string; readonly media: ChatMediaKind; readonly suffix: string } | null {
  const parts = id.split("~");
  if (parts.length !== 3) return null;
  const [targetId, kind, suffix] = parts as [string, string, string];
  if (targetId === "" || suffix === "" || (kind !== "snapshot" && kind !== "voice")) return null;
  return { targetId, media: kind === "snapshot" ? "photo" : "voice", suffix };
}

const isPending = (message: ChatMessage, media: ChatMediaKind) =>
  message.kind === (media === "photo" ? "photo-pending" : "voice-pending");
const isResult = (message: ChatMessage, media: ChatMediaKind) => message.kind === media;

/**
 * 알약 상태. 가짜 출처는 늘 ready. 서버 방: 답을 기다림 · 대상 없음 → wait, 만드는 중(사진은 방 안 어디든 — 서버가 유저당 하나만 그림,
 * 음성은 같은 대상) → pending, 그 대상에 결과가 있음 → done(다시 그리기 UI는 아직 없음).
 */
export function mediaAvailabilityOf(
  room: {
    readonly messages: readonly ChatMessage[];
    readonly busy: boolean;
    readonly server: boolean;
  },
  media: ChatMediaKind,
): ChatMediaAvailability {
  if (!room.server) return "ready";
  const target = room.busy ? null : mediaTargetOf(room.messages, media);
  if (target === null) return "wait";
  let state: ChatMediaAvailability = "ready";
  for (const message of room.messages) {
    const key = mediaLineKey(message.id);
    if (key === null || key.media !== media) continue;
    const mine = key.targetId === target.messageId;
    if (isPending(message, media) && (mine || media === "photo")) return "pending";
    if (mine && isResult(message, media)) state = "done";
  }
  return state;
}

/** 줄 하나를 놓습니다 — 같은 id면 그 자리 교체, 아니면 대상 말풍선 · 그 대상의 앞 결과 줄 뒤. 대상이 로그에 없으면 그대로. */
export function placeMediaLine(messages: readonly ChatMessage[], line: ChatMessage): ChatMessage[] {
  if (messages.some((message) => message.id === line.id))
    return messages.map((message) => (message.id === line.id ? line : message));
  const targetId = mediaLineKey(line.id)?.targetId;
  if (targetId === undefined) return [...messages];
  let at = -1;
  messages.forEach((message, index) => {
    if (bubbleOwner(message) === targetId || mediaLineKey(message.id)?.targetId === targetId)
      at = index;
  });
  if (at < 0) return [...messages];
  return [...messages.slice(0, at + 1), line, ...messages.slice(at + 1)];
}

/**
 * 서버 결과 → 로그 줄. `url`은 complete면 결과 파일, pending이면 중간 그림(사진만)의 서명 URL입니다. complete인데 URL이 없으면 사진은 빈 면,
 * 음성은 재생이 꺼진 말풍선, pending인데 없으면 스켈레톤입니다.
 */
export function mediaLineOf(
  media: RemoteMedia,
  target: ChatMediaTarget,
  url: string | null,
  now: number,
): ChatMessage {
  const kind: ChatMediaKind = media.kind === "snapshot" ? "photo" : "voice";
  const id = mediaLineId(target.messageId, kind, media.id);
  const at = Number.isFinite(media.createdAt) ? media.createdAt : now;
  switch (media.status) {
    case "pending":
      return kind === "photo"
        ? { id, at, kind: "photo-pending", ...(url === null ? {} : { previewUrl: url }) }
        : { id, at, kind: "voice-pending" };
    case "complete":
      return kind === "photo"
        ? {
            id,
            at,
            kind: "photo",
            imageUrl: url,
            ...(media.aspect === null ? {} : { aspect: media.aspect }),
            aiGenerated: true,
          }
        : { id, at, kind: "voice", durationMs: 0, text: target.text, audioUrl: url };
    case "blocked":
    case "failed":
      return { id, at, kind: "media-notice", media: kind, notice: media.status, until: null };
    default: {
      const unreachable: never = media.status;
      return unreachable;
    }
  }
}

export function mediaPollDelay(step: number): number {
  return POLL_DELAYS_MS[step] ?? POLL_TAIL_MS;
}

export function nextUtcMidnight(now: number): number {
  return (Math.floor(now / DAY_MS) + 1) * DAY_MS;
}

/** 같은 대상 · 같은 종류의 결과(사진 · 음성) 줄은 가장 최근 하나만 — 옛 결과의 자리에 섭니다(ADR-0150 M7). */
export function collapseMediaResults(messages: readonly ChatMessage[]): ChatMessage[] {
  const latest = new Map<string, ChatMessage>(); // `<대상>~<종류>` → 가장 최근 결과 줄
  const keyOf = (message: ChatMessage) => {
    const key = mediaLineKey(message.id);
    return key !== null && isResult(message, key.media) ? `${key.targetId}~${key.media}` : null;
  };
  for (const message of messages) {
    const key = keyOf(message);
    const known = key === null ? undefined : latest.get(key);
    if (key !== null && (known === undefined || message.at >= known.at)) latest.set(key, message);
  }
  const placed = new Set<string>();
  return messages.flatMap((message) => {
    const key = keyOf(message);
    if (key === null) return [message];
    if (placed.has(key)) return [];
    placed.add(key);
    return [latest.get(key) ?? message];
  });
}
