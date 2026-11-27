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
  /** 계정의 추천 답변 설정(ADR-0156) — 끄면 열린 보기 판을 바로 접습니다(빈 판으로 남지 않게). */
  readonly enabled?: boolean;
  /** 방 안내가 섰거나 설 차례(ADR-0137 · 0190 개정 2026-11-28) — 그동안 새 보기는 판을 열지 않고 미뤘다가 끝나면 엽니다. */
  readonly guiding?: boolean;
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

/** 순수 판정 — 방 안내가 끝났을 때, 안내 동안 미뤄 둔 보기를 지금 열까. */
export function shouldOpenHeldIdeas(input: {
  readonly held: readonly ChatReplyIdea[] | null;
  readonly ideas: readonly ChatReplyIdea[] | null;
  readonly text: string;
  readonly ideasOpen: boolean;
  readonly enabled: boolean;
}): boolean {
  const { held, ideas } = input;
  return (
    held !== null && held === ideas && input.enabled && input.text.trim() === "" && !input.ideasOpen
  );
}

export function useAutoIdeas({
  ideas,
  busy,
  text,
  ideasOpen,
  enabled = true,
  guiding = false,
  dispatch,
}: AutoIdeasInput): void {
  const seen = useRef(ideas);
  const wasBusy = useRef(busy);
  // 안내 동안 「열 예정」으로 기억한 보기 묶음.
  const held = useRef<readonly ChatReplyIdea[] | null>(null);
  const latest = useRef({ ideas, text, ideasOpen, busy, enabled, guiding });
  latest.current = { ideas, text, ideasOpen, busy, enabled, guiding };
  useEffect(() => {
    const previous = seen.current;
    const arrived = latest.current.busy || wasBusy.current;
    seen.current = ideas;
    wasBusy.current = latest.current.busy;
    // 방을 열며 읽은 기록의 보기는 「새로 온」 것이 아닙니다(리뷰 W2).
    // 추천 답변을 껐으면 새로 온 보기도 열지 않습니다.
    if (!arrived || !latest.current.enabled) return;
    if (!shouldAutoOpenIdeas(previous, ideas, latest.current.text, latest.current.ideasOpen))
      return;
    // 방 안내가 서 있으면 판이 키보드 단계의 키보드를 가립니다 — 미뤘다가 안내가 끝나면 엽니다(ADR-0137 · 0190 개정 2026-11-28).
    if (latest.current.guiding) held.current = ideas;
    else dispatch({ type: "open-ideas" });
  }, [ideas, dispatch]);
  // 안내가 끝나면 미룬 보기를 엽니다. 화면에서 이 훅은 `useGuideKeyboard` 뒤에 불려, 안내 끝의 키보드 접기(close-keyboard)가
  // 먼저 가고 판 열기가 뒤에 갑니다 — 바로 접히지 않습니다.
  useEffect(() => {
    if (guiding) return;
    const open = shouldOpenHeldIdeas({ ...latest.current, held: held.current });
    held.current = null;
    if (open) dispatch({ type: "open-ideas" });
  }, [guiding, dispatch]);
  // 안내 중(전구 단계) 사용자가 판을 직접 열었으면 이미 본 것 — 안내가 끝나도 다시 열지 않습니다.
  useEffect(() => {
    if (ideasOpen) held.current = null;
  }, [ideasOpen]);
  useEffect(() => {
    if (busy) wasBusy.current = true;
  }, [busy]);
  // 끈 채로 판이 열리면(어느 경로든) 바로 접습니다.
  useEffect(() => {
    if (!enabled && ideasOpen) dispatch({ type: "close-keyboard" });
  }, [enabled, ideasOpen, dispatch]);
}
