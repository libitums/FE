// 방을 열 때의 생년 묻기입니다(ADR-0125) — `useChatRoom`에서 떼어 냈습니다(300줄). 비회원은 묻지 않습니다(ADR-0166, 2026-11-20).

import { useEffect } from "@lynx-js/react";

import type { ChatRoomAction } from "./chat-room-state";
import { asksBirthYearOnEntry } from "./guest-gate";
import type { ChatSource } from "./chat-source.contract";

/** 생년을 아직 묻지 않았으면 첫 대화 전에 묻습니다. 방을 열 때 한 번만 봅니다. */
export function useEntryBirthYear(
  source: ChatSource,
  roomId: string,
  guest: boolean,
  dispatch: (action: ChatRoomAction) => void,
): void {
  useEffect(() => {
    if (!asksBirthYearOnEntry(source.snapshot().birthYear.kind, guest)) return;
    dispatch({
      type: "open-overlay",
      overlay: { kind: "birth-year", selected: null, from: "room" },
    });
    // 방을 열 때 한 번 — 비회원 여부는 방 key(`roomId:access`)에 들어 있어 바뀌면 방이 새로 섭니다. dispatch는 리듀서의 것이라 고정입니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, roomId]);
}
