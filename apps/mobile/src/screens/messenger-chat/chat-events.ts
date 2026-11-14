// 메신저 화면들의 제품 사용 이벤트 자리입니다(ADR-0029 「D3 목적 구분」). 결선(`render-messenger-chat.tsx`)이 sink와 방 id를
// 내리고, 보내기 관문 · 안내 · 미디어 요청 훅이 읽습니다 — 화면 props를 늘리지 않습니다. 없으면(테스트 · 수집 안 함) 아무것도 보내지 않습니다.

import { createContext, useContext } from "@lynx-js/react";

import { emitCompanionEvent } from "../../lib/companion-events";
import type { CompanionEventInput } from "../../lib/companion-event.contract";
import type { EpisodeIntroEventSink } from "../episode-intro/episode-intro.contract";

export type ChatEvents = {
  readonly sink: EpisodeIntroEventSink;
  /** 지금 방(= 인물 id) — 목록이면 null. */
  readonly roomId: string | null;
};

export const ChatEventsContext = createContext<ChatEvents>({ sink: null, roomId: null });

export type ChatEmit = (event: CompanionEventInput) => void;

/** 이벤트 핸들러 · 효과에서만 부르는 보내기 함수를 돌려줍니다. */
export function useChatEvents(): ChatEvents & { readonly emit: ChatEmit } {
  const events = useContext(ChatEventsContext);
  return {
    ...events,
    emit: (event) => {
      "background only";
      emitCompanionEvent(events.sink, event);
    },
  };
}
