// 답할 문장 추천(보기 판)의 보임 · 누름 이벤트입니다(ADR-0194). 모양은 순수 조각(`chat-suggestion-events`)이 정하고, 이 훅은
// 언제 낼지만 봅니다 — 보임은 판이 그 묶음으로 처음 그려질 때 방 화면 마운트당 묶음마다 한 번, 누름은 같은 묶음 같은 자리에 한 번.

import { useEffect, useRef } from "@lynx-js/react";

import { useChatEvents } from "./chat-events";
import { suggestionEventOf, suggestionsKeyOf } from "./chat-suggestion-events";
import type { ChatThread } from "./chat-source.contract";

/** 판이 그려졌는지(`visible`)를 받아 보임을 내고, 보기를 누를 때 부를 함수를 돌려줍니다. */
export function useSuggestionEvents(thread: ChatThread, visible: boolean): (index: number) => void {
  const { emit, roomId } = useChatEvents();
  const key = suggestionsKeyOf(thread.ideas);
  const room = {
    characterId: roomId ?? thread.counterpart.id,
    ideas: thread.ideas,
    ...(thread.ideasOrigin === undefined ? {} : { ideasOrigin: thread.ideasOrigin }),
    messages: thread.messages,
  };
  const latest = useRef(room);
  latest.current = room;
  const shown = useRef<string | null>(null);
  const tapped = useRef<string | null>(null);

  useEffect(() => {
    if (!visible || key === "" || shown.current === key) return;
    shown.current = key;
    emit(suggestionEventOf(latest.current));
  }, [visible, key]);

  return (index) => {
    "background only";
    const tap = `${key}#${index}`;
    if (tapped.current === tap) return; // 판이 접히기 전 같은 자리를 거듭 누름
    tapped.current = tap;
    emit(suggestionEventOf(latest.current, index));
  };
}
