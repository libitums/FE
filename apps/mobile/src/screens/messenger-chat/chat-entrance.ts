// 대화방 말풍선 등장 판정(메신저 움직임 1순위 — 시안 PmBPj86YS1uijqjWSMVJEn, 2026-11-14 사용자 「진행」). 순수 + 기억 하나.
//
// 화면에 **처음 나타나는** 메시지만 움직입니다:
// - 방을 열 때 이미 있던 글(첫 판)과 한 번에 셋 이상 들어온 묶음(기록 불러오기 · 다시 읽기)은 움직이지 않습니다.
// - 내 글은 서버가 받으면 id가 임시 → 서버 id로 바뀌어 줄이 다시 서므로, 보낸 시각(`at`)으로 같은 글을 알아봅니다.
// - 한 번 정한 값은 그 id에 고정합니다 — 움직이는 도중 다시 그려도 클래스가 빠지지 않습니다.

import type { ChatMessage } from "./chat-source.contract";

export type ChatEntrance = "me" | "them" | null;

/** 한 번에 이만큼 이상 새로 들어오면 불러오기로 보고 움직이지 않습니다. */
const BATCH_LIMIT = 3;

export type EntranceTracker = {
  /** 이번 판의 메시지 전부를 받아 id별 등장 값을 돌려줍니다. 같은 판을 두 번 넘겨도 결과가 같습니다. */
  readonly entrancesOf: (messages: readonly ChatMessage[]) => ReadonlyMap<string, ChatEntrance>;
};

const isMine = (message: ChatMessage): boolean => message.kind === "text" && message.from === "me";

export function createEntranceTracker(): EntranceTracker {
  const decided = new Map<string, ChatEntrance>();
  const mineAt = new Set<number>();
  let first = true;
  return {
    entrancesOf: (messages) => {
      const fresh = messages.filter((message) => !decided.has(message.id));
      const still = first || fresh.length >= BATCH_LIMIT;
      first = false;
      for (const message of fresh) {
        const mine = isMine(message);
        const seenMine = mine && mineAt.has(message.at);
        decided.set(message.id, still || seenMine ? null : mine ? "me" : "them");
        if (mine) mineAt.add(message.at);
      }
      return decided;
    },
  };
}
