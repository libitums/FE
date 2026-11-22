// 방 머리 아래 「N chat words this week · #R in your group」의 값(ADR-0170). 방을 열 때 채팅 단어 보드를 한 번 읽고, 이 방에서
// 새로 센 단어의 이번 주 합(`weekTotal`)이 오면 그 값이 앞섭니다. 이 방에서 새로 얻은 단어는 분석 이벤트로 한 번씩 냅니다.

import { useEffect, useRef, useState } from "@lynx-js/react";

import { emitCompanionEvent } from "../../lib/companion-events";
import type { RankingLoad } from "../../lib/ranking.contract";
import type { EpisodeIntroEventSink } from "../episode-intro/episode-intro.contract";
import { chatStripOf } from "../ranking/ranking-rules";
import type { ChatThread } from "./chat-source.contract";

/** 머리 아래 이번 주 채팅 단어 줄의 결선 — 서버 방 · 회원만, 없으면 줄이 없습니다. 방 화면 props에 더해집니다. */
export type ChatWordsProps = { readonly chatWords?: ChatWordsStripWiring | null };

export type ChatWordsStripWiring = {
  readonly load: () => Promise<RankingLoad>;
  readonly onOpen: () => void;
  readonly eventSink: EpisodeIntroEventSink;
};

/** 이 방의 내 글 노트 가운데 가장 늦은 채팅 단어의 이번 주 합 — 없으면 null. 순수. */
export function latestWeekTotal(thread: ChatThread): number | null {
  let total: number | null = null;
  for (const message of thread.messages) {
    const words = thread.notes[message.id]?.chatWords;
    if (words !== undefined) total = words.weekTotal;
  }
  return total;
}

export function useChatWordsStrip(
  wiring: ChatWordsStripWiring | null,
  thread: ChatThread | null,
): { readonly words: number; readonly rank: number | null } | null {
  const [load, setLoad] = useState<RankingLoad | null>(null);
  const known = useRef<Set<string> | null>(null);
  const server = thread !== null && thread.server !== null;

  useEffect(() => {
    if (wiring === null || !server) return;
    let live = true;
    void wiring.load().then((result) => {
      if (live) setLoad(result);
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wiring === null, server]);

  // 처음 본 노트(기록)는 세지 않고, 그 뒤 새로 붙은 채팅 단어만 이벤트로.
  useEffect(() => {
    if (thread === null || wiring === null) return;
    const ids = Object.keys(thread.notes).filter((id) => thread.notes[id]?.chatWords !== undefined);
    if (known.current === null) {
      known.current = new Set(ids);
      return;
    }
    for (const id of ids) {
      if (known.current.has(id)) continue;
      known.current.add(id);
      const words = thread.notes[id]?.chatWords;
      if (words === undefined) continue;
      emitCompanionEvent(wiring.eventSink, {
        name: "chat_words_earned",
        surface: "chat",
        count: String(words.counted.length),
        pending: String(words.pending.length),
        weekTotal: String(words.weekTotal),
      });
    }
  }, [thread, wiring]);

  if (wiring === null || thread === null || !server) return null;
  const loaded = chatStripOf(load);
  const live = latestWeekTotal(thread);
  if (loaded === null && live === null) return null;
  return {
    words: Math.max(loaded?.words ?? 0, live ?? 0),
    rank: loaded?.rank ?? null,
  };
}
