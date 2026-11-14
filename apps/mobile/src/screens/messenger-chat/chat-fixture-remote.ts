// 출처의 서버 모드입니다(ADR-0137) — 방을 열면 서버 기록을 한 번 읽고(비면 첫 인사), 보내기는 서버 턴(SSE)으로 답을 받습니다.
// 기억 · 대화 설정 · 평가 · 사진 · 음성 · 이야기 시점 · 방 지우기는 아직 앱 안에서만 돕니다(2026-11-12 결정). 던지지 않습니다.

import type { ChatCorrection } from "./chat-feedback.contract";
import type { RoomState } from "./chat-fixture-room";
import type { ChatRemote, RemoteSendFailure } from "./chat-remote.contract";
import type { ChatMessage, ChatMyNotes } from "./chat-source.contract";
import { NO_NOTES } from "./chat-source.contract";
import { bubblesOf, sendFailureOf } from "./companion-parse";
import { applyTurnEvent, endTurn, initialTurnState, type TurnState } from "./companion-turn";

export type RemoteRoomDeps = {
  readonly remote: ChatRemote;
  readonly live: (roomId: string) => RoomState | null;
  readonly changed: (room: RoomState) => void;
  readonly now: () => number;
  readonly isOpenRoom: (roomId: string) => boolean;
  readonly uuid: () => string;
};

const withCorrection = (
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

export function remoteRoomMethods(deps: RemoteRoomDeps) {
  const { remote, live, changed, now } = deps;
  const roomIdOf = (room: RoomState) => room.seed.roomId;
  const characterOf = (room: RoomState) => room.seed.counterpart.id;

  const greet = async (room: RoomState) => {
    room.typing = true;
    changed(room);
    const greeting = await remote.greet(characterOf(room));
    if (live(roomIdOf(room)) !== room) return;
    // 인사를 기다리는 사이 보낸 턴이 있으면 그 입력 중 점을 끄지 않고, 인사는 내 글 앞에 둡니다(리뷰 W5).
    room.typing = room.pendingReplies > 0;
    if (greeting !== null) {
      const known = new Set(room.messages.map((message) => message.id));
      room.messages = [...greeting.messages.filter((m) => !known.has(m.id)), ...room.messages];
      if (room.pendingReplies === 0) room.remoteIdeas = greeting.ideas;
    }
    changed(room);
  };

  /** 방을 열 때 — 서버 기록을 한 번 읽고, 비어 있으면 첫 인사를 받습니다. */
  const loadRoom = (roomId: string) => {
    const room = live(roomId);
    if (room === null || room.access.kind !== "open" || room.remoteHistory !== "idle") return;
    room.remoteHistory = "loading";
    void (async () => {
      const history = await remote.loadHistory(characterOf(room));
      if (live(roomId) !== room) return;
      if (history === null) {
        room.remoteHistory = "idle"; // 다음에 열 때 다시 읽습니다.
        return;
      }
      room.remoteHistory = "loaded";
      // 읽는 사이 보낸 글이 있으면 그 뒤에 둡니다 — 같은 id(이미 서버 id로 바뀐 내 글 · 답)는 한 번만(리뷰 W5).
      const local = new Set(room.messages.map((message) => message.id));
      room.messages = [...history.messages.filter((m) => !local.has(m.id)), ...room.messages];
      let notes = room.notes;
      for (const [id, card] of Object.entries(history.corrections))
        notes = withCorrection(notes, id, card);
      room.notes = notes;
      room.remoteIdeas = history.ideas;
      changed(room);
      if (room.messages.length === 0) await greet(room);
    })();
  };

  // 턴 상태를 로그에 그립니다 — 내 글 id를 서버 id로, 고지 · 답 말풍선 · 위기 카드를 그 뒤에.
  const render = (room: RoomState, localId: string, turn: TurnState, placed: Set<string>) => {
    const myId = turn.userMessageId ?? localId;
    const base = room.messages.filter((message) => !placed.has(message.id));
    // 기록이 start보다 먼저 와 서버 id의 내 글이 이미 있으면 그 줄을 빼고 내 줄 하나만 남깁니다(리뷰 W-a).
    const swapping = myId !== localId && base.some((message) => message.id === localId);
    const mine = (swapping ? base.filter((message) => message.id !== myId) : base).map((message) =>
      message.id === localId ? { ...message, id: myId } : message,
    );
    const at = now();
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
  };

  const finish = (room: RoomState, myId: string, failure: RemoteSendFailure | null) => {
    room.pendingReplies = Math.max(0, room.pendingReplies - 1);
    room.typing = false;
    if (failure === null) return;
    if (failure.kind === "blocked")
      room.inputBlock = { kind: "temporarily-blocked", until: failure.until };
    else if (failure.kind === "usage-limit")
      room.inputBlock = { kind: "usage-time-limit", resetsAt: failure.resetsAt };
    else if (failure.kind === "age-restricted") room.inputBlock = { kind: "age-restricted" };
    else {
      const notice =
        failure.kind === "no-credits" || failure.kind === "not-available"
          ? failure.kind
          : "send-failed";
      room.messages = [
        ...room.messages,
        { id: `${myId}~failed`, at: now(), kind: "notice", notice },
      ];
    }
  };

  const sendText = (roomId: string, text: string) => {
    const room = live(roomId);
    const trimmed = text.trim();
    if (room === null || room.access.kind !== "open" || trimmed === "") return;
    const localId = `local-${deps.uuid()}`;
    room.messages = [
      ...room.messages,
      { id: localId, at: now(), kind: "text", from: "me", text: { ko: trimmed, en: "" } },
    ];
    room.pendingReplies += 1;
    room.typing = true;
    changed(room);
    let turn = initialTurnState;
    let myId = localId;
    const placed = new Set<string>();
    remote.openTurn(
      { characterId: characterOf(room), text: trimmed, clientMessageId: deps.uuid() },
      {
        onOpen: () => undefined,
        onEvent: (event, data) => {
          if (live(roomId) !== room) return;
          const next = applyTurnEvent(turn, event, data);
          if (next === turn) return;
          const firstBubble = turn.bubbles.length === 0 && next.bubbles.length > 0;
          turn = next;
          myId = render(room, localId, turn, placed);
          if (firstBubble && !deps.isOpenRoom(roomId)) room.unread += 1;
          changed(room);
        },
        onEnd: (reason, detail) => {
          if (live(roomId) !== room) return;
          const failure =
            reason === "http-error" ? sendFailureOf(detail, now()) : { kind: "failed" as const };
          turn = endTurn(turn, reason, failure);
          finish(room, myId, turn.failure);
          changed(room);
        },
      },
    );
  };

  return { loadRoom, sendText };
}
