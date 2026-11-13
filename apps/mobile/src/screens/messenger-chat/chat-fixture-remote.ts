// 출처의 서버 모드입니다(ADR-0137) — 방을 열면 서버 기록을 읽고(비면 첫 인사), 보내기는 서버 턴(SSE)으로 답을 받습니다.
// 배달 실패(ADR-0138): 서버가 받지 못한 글은 Not sent로 남아 다시 보내고, 받은 뒤 끊긴 답은 기록을 다시 읽어 채웁니다.
// 기억 · 대화 설정 · 평가 · 사진 · 음성 · 이야기 시점 · 방 지우기는 아직 앱 안에서만 돕니다(2026-11-12 결정). 던지지 않습니다.

import type { RoomState } from "./chat-fixture-room";
import type { ChatServerControls } from "./chat-delivery.contract";
import type { ChatRemote, RemoteHistory } from "./chat-remote.contract";
import type { ChatMessage } from "./chat-source.contract";
import { renderTurn, withCorrection } from "./chat-remote-notes";
import { hasReplyAfter, mergeLog, sameIdeas, serverCopyOf } from "./chat-log-merge";
import { turnOutcomeOf, type TurnOutcome } from "./companion-outcome";
import { applyTurnEvent, initialTurnState, type TurnState } from "./companion-turn";

/** 끊긴 답 채우기 — 바로 한 번, 그 뒤 이 간격마다(누적 30초). 다 돌면 stalled. */
const RECOVERY_RETRY_MS = [2_000, 3_000, 5_000, 20_000] as const;

export type RemoteRoomDeps = {
  readonly remote: ChatRemote;
  readonly live: (roomId: string) => RoomState | null;
  readonly changed: (room: RoomState) => void;
  readonly now: () => number;
  readonly openRoomId: () => string | null;
  readonly schedule: (room: RoomState, ms: number, fn: () => void) => void;
  readonly uuid: () => string;
};

export { uuidV4 } from "./chat-remote-notes";

export function remoteRoomMethods(deps: RemoteRoomDeps) {
  const { remote, live, changed, now, schedule } = deps;
  const roomIdOf = (room: RoomState) => room.seed.roomId;
  const characterOf = (room: RoomState) => room.seed.counterpart.id;
  const clientIds = new Map<string, string>(); // 내 글 id → client_message_id(다시 보내기 멱등)
  // 채우기가 끝났는지 — stalled에서 다시 시작하거나 다른 다시 읽기가 채웠는지 볼 때도 씁니다.
  const recoveryTargets = new WeakMap<RoomState, (log: readonly ChatMessage[]) => boolean>();
  const isOpen = (roomId: string) => deps.openRoomId() === roomId;
  const busy = (room: RoomState) =>
    room.pendingReplies > 0 || room.recovery === "fetching" || room.remoteHistory === "loading";

  /** 서버 기록을 로그에 합칩니다. 서버에 이미 있는 Not sent 글은 서버 판으로 바꾸고 그 서버 id들을 돌려줍니다(리뷰 W4). */
  const applyHistory = (room: RoomState, history: RemoteHistory): string[] => {
    const shown = new Set(room.messages.map((message) => message.id));
    const confirmed: string[] = [];
    for (const id of room.unsent) {
      const local = room.messages.find((message) => message.id === id);
      const copy = local === undefined ? null : serverCopyOf(local, history.messages, shown);
      if (copy === null) continue;
      confirmed.push(copy);
      shown.add(copy);
      room.unsent = room.unsent.filter((other) => other !== id);
      room.messages = room.messages.filter((m) => m.id !== id && m.id !== `${id}~failed`);
    }
    room.messages = mergeLog(room.messages, history.messages);
    let notes = room.notes;
    for (const [id, card] of Object.entries(history.corrections))
      notes = withCorrection(notes, id, card);
    room.notes = notes;
    if (room.pendingReplies === 0 && !sameIdeas(room.remoteIdeas, history.ideas))
      room.remoteIdeas = history.ideas;
    if (room.recovery === "stalled" && recoveryTargets.get(room)?.(history.messages) === true)
      room.recovery = "none";
    return confirmed;
  };

  /** 첫 인사 — 받았으면(인사가 없다는 답 포함) true, 못 받았으면 false. */
  const greet = async (room: RoomState): Promise<boolean> => {
    room.typing = true;
    changed(room);
    const greeting = await remote.greet(characterOf(room));
    if (live(roomIdOf(room)) !== room) return true;
    // 인사를 기다리는 사이 보낸 턴이 있으면 그 입력 중 점을 끄지 않고, 인사는 내 글 앞에 둡니다(ADR-0137).
    room.typing = room.pendingReplies > 0;
    if (greeting === null) return false;
    const known = new Set(room.messages.map((message) => message.id));
    room.messages = [...greeting.messages.filter((m) => !known.has(m.id)), ...room.messages];
    if (room.pendingReplies === 0) room.remoteIdeas = greeting.ideas;
    return true;
  };

  /** 방을 열 때 — 서버 기록을 읽고, 비어 있으면 첫 인사를 받습니다. 못 받으면 failed(다시 시도 안내). */
  const loadRoom = (roomId: string) => {
    const room = live(roomId);
    if (room === null || room.access.kind !== "open") return;
    if (room.remoteHistory !== "idle" && room.remoteHistory !== "failed") return;
    room.remoteHistory = "loading";
    changed(room);
    void (async () => {
      const history = await remote.loadHistory(characterOf(room));
      if (live(roomId) !== room) return;
      if (history !== null) applyHistory(room, history);
      const ok = history !== null && (room.messages.length > 0 || (await greet(room)));
      if (live(roomId) !== room) return;
      room.remoteHistory = ok ? "loaded" : "failed";
      changed(room);
    })();
  };

  const replies = (room: RoomState) =>
    room.messages.filter((m) => (m.kind === "text" && m.from === "them") || m.kind === "action")
      .length;

  // 서버가 받은 뒤 끊긴 답 — 기록에 그 답이 설 때까지 다시 읽습니다(바로 · 2 · 5 · 10 · 30초, 다 돌면 stalled).
  const recover = (room: RoomState, isDone: (log: readonly ChatMessage[]) => boolean) => {
    recoveryTargets.set(room, isDone);
    room.recovery = "fetching";
    changed(room);
    const attempt = async (step: number) => {
      const history = await remote.loadHistory(characterOf(room));
      if (live(roomIdOf(room)) !== room || room.recovery !== "fetching") return;
      const before = replies(room);
      if (history !== null) applyHistory(room, history);
      // 닫힌 방에 채워진 답은 보통 턴처럼 안 읽음을 하나 올립니다(리뷰 W2).
      if (replies(room) > before && !isOpen(roomIdOf(room))) room.unread += 1;
      const wait = RECOVERY_RETRY_MS[step];
      if (history !== null && isDone(history.messages)) room.recovery = "none";
      else if (wait === undefined) room.recovery = "stalled";
      else schedule(room, wait, () => void attempt(step + 1));
      changed(room);
    };
    void attempt(0);
  };

  // 받았는지 모르는 Not sent 글 — 기록을 한 번 읽어 서버에 있으면 서버 판으로, 답이 아직 없으면 채웁니다(리뷰 W4).
  const check = (room: RoomState) => {
    void (async () => {
      const history = await remote.loadHistory(characterOf(room));
      if (live(roomIdOf(room)) !== room || history === null || busy(room)) return;
      const waiting = applyHistory(room, history).filter(
        (id) => !hasReplyAfter(history.messages, id),
      );
      if (waiting.length > 0) recover(room, (log) => waiting.every((id) => hasReplyAfter(log, id)));
      changed(room);
    })();
  };

  const removeNotice = (room: RoomState, myId: string) => {
    room.messages = room.messages.filter((message) => message.id !== `${myId}~failed`);
  };
  // 실패 줄은 그 글 바로 아래에 섭니다 — 뒤에 쌓인 Not sent 글 뒤로 밀리지 않게(리뷰 S3).
  const addNotice = (room: RoomState, myId: string, notice: TurnOutcome & { kind: "notice" }) => {
    removeNotice(room, myId);
    const line: ChatMessage = {
      id: `${myId}~failed`,
      at: now(),
      kind: "notice",
      notice: notice.notice,
    };
    const index = room.messages.findIndex((message) => message.id === myId);
    const at = index < 0 ? room.messages.length : index + 1;
    room.messages = [...room.messages.slice(0, at), line, ...room.messages.slice(at)];
  };

  const settle = (room: RoomState, myId: string, outcome: TurnOutcome, turn: TurnState) => {
    room.pendingReplies = Math.max(0, room.pendingReplies - 1);
    room.typing = false;
    switch (outcome.kind) {
      case "ok":
        return;
      case "unsent":
        room.unsent = [myId, ...room.unsent.filter((id) => id !== myId)];
        if (outcome.notice !== null)
          addNotice(room, myId, { kind: "notice", notice: outcome.notice });
        if (outcome.check) check(room);
        return;
      case "recover": {
        const assistantId = turn.assistantMessageId;
        recover(room, (log) => log.some((m) => m.id.startsWith(`${assistantId}#`)));
        return;
      }
      case "notice":
        addNotice(room, myId, outcome);
        return;
      case "block":
        room.inputBlock = outcome.block;
        return;
    }
  };

  /** 내 글 하나의 턴 — 끝나면 결과대로 방을 고치고, 성공했고 이어 보낼 글이 있으면 다음 것을 보냅니다. */
  const startTurn = (room: RoomState, localId: string, text: string) => {
    const roomId = roomIdOf(room);
    room.pendingReplies += 1;
    room.typing = true;
    changed(room);
    let turn = initialTurnState;
    let myId = localId;
    const placed = new Set<string>();
    const clientMessageId = clientIds.get(localId) ?? deps.uuid();
    clientIds.set(localId, clientMessageId);
    remote.openTurn(
      { characterId: characterOf(room), text, clientMessageId },
      {
        onOpen: () => undefined,
        onEvent: (event, data) => {
          if (live(roomId) !== room) return;
          const next = applyTurnEvent(turn, event, data);
          if (next === turn) return;
          const firstBubble = turn.bubbles.length === 0 && next.bubbles.length > 0;
          turn = next;
          myId = renderTurn(room, localId, turn, placed, now());
          if (firstBubble && !isOpen(roomId)) room.unread += 1;
          changed(room);
        },
        onEnd: (reason, detail) => {
          if (live(roomId) !== room) return;
          const outcome = turnOutcomeOf(turn, reason, detail, now());
          settle(room, myId, outcome, turn);
          changed(room);
          if (outcome.kind === "ok") sendNextUnsent(room);
        },
      },
    );
  };

  const textOf = (room: RoomState, id: string): string | null => {
    const message = room.messages.find((m) => m.id === id);
    return message?.kind === "text" ? message.text.ko : null;
  };

  // 보내지 못한 글을 맨 앞부터 하나 — 서버는 한 대화에 한 턴만 돌립니다.
  const sendNextUnsent = (room: RoomState) => {
    const next = room.unsent[0];
    if (next === undefined || busy(room)) return;
    const text = textOf(room, next);
    room.unsent = room.unsent.slice(1);
    removeNotice(room, next);
    if (text === null) return sendNextUnsent(room);
    startTurn(room, next, text);
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
    // 앞에 보내지 못한 글이 있으면 순서가 섞이지 않게 그 뒤에 쌓습니다.
    if (room.unsent.length > 0) {
      room.unsent = [...room.unsent, localId];
      changed(room);
      return;
    }
    startTurn(room, localId, trimmed);
  };

  /** 열린 방을 조용히 다시 읽습니다 — 답을 기다리는 중이면 읽지 않습니다. */
  const refresh = (room: RoomState) => {
    if (busy(room)) return;
    if (room.remoteHistory !== "loaded") return loadRoom(roomIdOf(room));
    void (async () => {
      const history = await remote.loadHistory(characterOf(room));
      if (live(roomIdOf(room)) !== room || history === null || busy(room)) return;
      applyHistory(room, history);
      changed(room);
    })();
  };

  const controls: ChatServerControls = {
    resend: (roomId) => {
      const room = live(roomId);
      if (room !== null) sendNextUnsent(room);
    },
    discard: (roomId, messageId) => {
      const room = live(roomId);
      if (room === null || !room.unsent.includes(messageId)) return;
      room.unsent = room.unsent.filter((id) => id !== messageId);
      room.messages = room.messages.filter(
        (m) => m.id !== messageId && m.id !== `${messageId}~failed`,
      );
      clientIds.delete(messageId);
      changed(room);
    },
    reload: (roomId) => {
      const room = live(roomId);
      if (room === null) return;
      const isDone = recoveryTargets.get(room);
      if (room.recovery === "stalled" && isDone !== undefined) recover(room, isDone);
      else refresh(room);
    },
    refreshOpenRoom: () => {
      const id = deps.openRoomId();
      const room = id === null ? null : live(id);
      if (room !== null && room.access.kind === "open") refresh(room);
    },
  };

  return { loadRoom, sendText, controls };
}
