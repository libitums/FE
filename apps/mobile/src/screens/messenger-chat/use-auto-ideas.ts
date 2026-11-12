// 상대 답이 오며 추천 답변이 새로 서면 보기 판을 저절로 엽니다(사용자 결정 2026-11-12, ADR-0137). 입력 칸에 쓰던 글이 있거나
// 이미 열려 있으면 그대로 둡니다. 방에 들어올 때 이미 있던 보기는 열지 않습니다 — 새로 온 보기만.

import { useEffect, useRef } from "@lynx-js/react";

import type { ChatRoomAction } from "./chat-room-state";
import type { ChatReplyIdea } from "./chat-source.contract";

export type AutoIdeasInput = {
  readonly ideas: readonly ChatReplyIdea[] | null;
  /** 답 · 첫 인사를 기다리는 중 — 그때(또는 막 끝났을 때) 바뀐 보기만 엽니다. */
  readonly busy: boolean;
  readonly text: string;
  readonly ideasOpen: boolean;
  readonly dispatch: (action: ChatRoomAction) => void;
};

/** 순수 판정 — 보기 묶음이 바뀌었고 비어 있지 않으며, 쓰던 글이 없고 판이 닫혀 있으면 연다. */
export function shouldAutoOpenIdeas(
  previous: readonly ChatReplyIdea[] | null,
  next: readonly ChatReplyIdea[] | null,
  text: string,
  ideasOpen: boolean,
): boolean {
  return next !== previous && next !== null && next.length > 0 && text.trim() === "" && !ideasOpen;
}

export function useAutoIdeas({ ideas, busy, text, ideasOpen, dispatch }: AutoIdeasInput): void {
  const seen = useRef(ideas);
  const wasBusy = useRef(busy);
  const latest = useRef({ text, ideasOpen, busy });
  latest.current = { text, ideasOpen, busy };
  useEffect(() => {
    const previous = seen.current;
    const arrived = latest.current.busy || wasBusy.current;
    seen.current = ideas;
    wasBusy.current = latest.current.busy;
    // 방을 열며 읽은 기록의 보기는 「새로 온」 것이 아닙니다(리뷰 W2).
    if (!arrived) return;
    if (shouldAutoOpenIdeas(previous, ideas, latest.current.text, latest.current.ideasOpen))
      dispatch({ type: "open-ideas" });
  }, [ideas, dispatch]);
  useEffect(() => {
    if (busy) wasBusy.current = true;
  }, [busy]);
}
