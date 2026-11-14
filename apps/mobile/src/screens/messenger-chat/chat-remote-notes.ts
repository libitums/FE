// 서버 모드 출처의 도우미입니다(ADR-0137) — 교정 노트 붙이기 · 멱등 id · 턴을 로그에 그리기.

import type { ChatCorrection } from "./chat-feedback.contract";
import type { RoomState } from "./chat-fixture-room";
import type { ChatMessage, ChatMyNotes } from "./chat-source.contract";
import { bubblesOf } from "./companion-parse";
import type { TurnState } from "./companion-turn";
import { NO_NOTES } from "./chat-source.contract";

export const withCorrection = (
  notes: Readonly<Record<string, ChatMyNotes>>,
  messageId: string,
  card: ChatCorrection,
): Readonly<Record<string, ChatMyNotes>> => ({
  ...notes,
  [messageId]: {
    ...(notes[messageId] ?? NO_NOTES),
    correction: { kind: "available", seen: false, detail: { status: "ready", value: card } },
  },
});

/** RFC 4122 v4 — 서버 멱등 키(`client_message_id`)입니다. 보안 용도가 아닙니다. */
export function uuidV4(random: () => number = Math.random): string {
  const hex = Array.from({ length: 32 }, () => Math.floor(random() * 16).toString(16));
  hex[12] = "4";
  hex[16] = ((Number.parseInt(hex[16] as string, 16) & 0x3) | 0x8).toString(16);
  const s = hex.join("");
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

/** 턴 상태를 로그에 그립니다 — 내 글 id를 서버 id로, 고지 · 답 말풍선 · 위기 카드를 그 뒤에. 바뀐 내 글 id를 돌려줍니다. */
export function renderTurn(
  room: RoomState,
  localId: string,
  turn: TurnState,
  placed: Set<string>,
  at: number,
): string {
  const myId = turn.userMessageId ?? localId;
  const base = room.messages.filter((message) => !placed.has(message.id));
  // 기록이 start보다 먼저 와 서버 id의 내 글이 이미 있으면 그 줄을 빼고 내 줄 하나만 남깁니다(리뷰 W-a).
  const swapping = myId !== localId && base.some((message) => message.id === localId);
  const mine = (swapping ? base.filter((message) => message.id !== myId) : base).map((message) =>
    message.id === localId ? { ...message, id: myId } : message,
  );
  const added: ChatMessage[] = [
    ...turn.notices.map((notice, index): ChatMessage => ({
      id: `${myId}~n${index}`,
      at,
      kind: "notice",
      notice,
    })),
    ...(turn.assistantMessageId === null
      ? []
      : bubblesOf(turn.assistantMessageId, at, turn.segments)),
    ...(turn.crisis === null
      ? []
      : [{ id: `${myId}~crisis`, at, kind: "crisis", resources: turn.crisis } as ChatMessage]),
  ];
  placed.clear();
  for (const message of added) placed.add(message.id);
  room.messages = [...mine, ...added];
  if (turn.correction !== null)
    room.notes = withCorrection(room.notes, turn.correction.userMessageId, turn.correction.card);
  if (turn.ideas !== null) room.remoteIdeas = turn.ideas;
  if (turn.bubbles.length > 0) room.typing = false;
  return myId;
}
