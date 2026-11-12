// 가짜 출처의 내 글 노트(뜻 · 교정)입니다(messenger-chat-1-5 spec §5.1). 타이머는 출처가 주입한 schedule로만 겁니다 —
// 맨 식별자 setTimeout을 여기서 직접 부르지 않습니다(배경 스레드, chat-fixture-room.defaultTimers).

import type { RoomState } from "./chat-fixture-room";
import { CHAT_PLACEHOLDERS } from "./chat-placeholders";
import {
  NO_NOTES,
  type ChatCorrection,
  type ChatFixtureCorrection,
  type ChatFixtureMessage,
  type ChatFixtureSeed,
  type ChatMeaning,
  type ChatMessage,
  type ChatMyNotes,
} from "./chat-source.contract";

const EMPTY_MEANING: ChatMeaning = { romanization: "", meaning: "" };

export type FixtureNotesDeps = {
  readonly seed: ChatFixtureSeed;
  readonly schedule: (room: RoomState, ms: number, fn: () => void) => void;
  /** 방 상태가 바뀜 — 캐시를 비우고 구독자에게 한 번 알린다. */
  readonly changed: (room: RoomState) => void;
  readonly live: (roomId: string) => RoomState | null;
};

export type FixtureNotes = {
  /** 씨앗 메시지(와 같은 순서의 만들어진 메시지)에서 교정이 붙은 내 글의 노트를 만든다. */
  readonly seedNotes: (
    seedMessages: readonly ChatFixtureMessage[],
    messages: readonly ChatMessage[],
  ) => Readonly<Record<string, ChatMyNotes>>;
  /** 정해 둔 답장이 도착했을 때, 직전에 보낸 내 글이 교정 표에 있으면 교정을 단다(알림은 부른 쪽이 한다). */
  readonly onReplyArrived: (room: RoomState, sentMessageId: string) => void;
  readonly requestMeaning: (roomId: string, messageId: string) => void;
  readonly openCorrection: (roomId: string, messageId: string) => void;
};

export function createFixtureNotes(deps: FixtureNotesDeps): FixtureNotes {
  const { seed, schedule, changed, live } = deps;
  const timing = CHAT_PLACEHOLDERS.timing;
  const corrections = new Map<string, ChatCorrection>(); // 메시지 id → 열면 받을 교정

  const putNote = (room: RoomState, id: string, next: ChatMyNotes) => {
    room.notes = { ...room.notes, [id]: next };
  };
  const textOf = (room: RoomState, id: string) => {
    const message = room.messages.find((candidate) => candidate.id === id);
    return message?.kind === "text" && message.from === "me" ? message : null;
  };
  const tableFix = (ko: string): ChatFixtureCorrection | undefined =>
    seed.corrections?.find((entry) => entry.original === ko.trim());

  return {
    seedNotes: (seedMessages, messages) => {
      const notes: Record<string, ChatMyNotes> = {};
      seedMessages.forEach((seedMessage, index) => {
        const message = messages[index];
        if (
          message === undefined ||
          seedMessage.kind !== "text" ||
          seedMessage.from !== "me" ||
          seedMessage.correction === undefined
        ) {
          return;
        }
        corrections.set(message.id, seedMessage.correction);
        notes[message.id] = {
          ...NO_NOTES,
          correction: { kind: "available", seen: false, detail: { status: "idle" } },
        };
      });
      return notes;
    },
    onReplyArrived: (room, sentMessageId) => {
      const sent = textOf(room, sentMessageId);
      const fix = sent === null ? undefined : tableFix(sent.text.ko);
      if (fix === undefined || room.notes[sentMessageId]?.correction.kind === "available") return;
      corrections.set(sentMessageId, fix);
      putNote(room, sentMessageId, {
        ...(room.notes[sentMessageId] ?? NO_NOTES),
        correction: { kind: "available", seen: false, detail: { status: "idle" } },
      });
    },
    requestMeaning: (roomId, messageId) => {
      const room = live(roomId);
      const mine = room === null ? null : textOf(room, messageId);
      if (room === null || mine === null) return;
      const current = room.notes[messageId] ?? NO_NOTES;
      if (current.meaning.status !== "idle") return;
      putNote(room, messageId, { ...current, meaning: { status: "loading" } });
      changed(room);
      schedule(room, timing.meaningMs, () => {
        const value =
          seed.meanings?.find((entry) => entry.ko === mine.text.ko.trim()) ??
          seed.fallbackMeaning ??
          EMPTY_MEANING;
        const now = room.notes[messageId] ?? NO_NOTES;
        putNote(room, messageId, {
          ...now,
          meaning: {
            status: "ready",
            value: { romanization: value.romanization, meaning: value.meaning },
          },
        });
        changed(room);
      });
    },
    openCorrection: (roomId, messageId) => {
      const room = live(roomId);
      if (room === null) return;
      const current = room.notes[messageId];
      if (current === undefined) return;
      const note = current.correction;
      if (note.kind !== "available" || (note.seen && note.detail.status !== "idle")) return;
      const starts = note.detail.status === "idle";
      putNote(room, messageId, {
        ...current,
        correction: {
          kind: "available",
          seen: true,
          detail: starts ? { status: "loading" } : note.detail,
        },
      });
      changed(room);
      if (!starts) return;
      schedule(room, timing.correctionMs, () => {
        const value = corrections.get(messageId);
        const latest = room.notes[messageId];
        if (value === undefined || latest === undefined) return;
        putNote(room, messageId, {
          ...latest,
          correction: {
            kind: "available",
            seen: true,
            detail: {
              status: "ready",
              value: {
                corrected: value.corrected,
                changes: value.changes,
                explanation: value.explanation,
              },
            },
          },
        });
        changed(room);
      });
    },
  };
}
