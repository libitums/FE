// 덕수쌤 방 첫 입장 코치마크의 상태입니다(2026-11-13). 첫 인사가 도착하고 입력 중이 아니며 방 위에 다른 겹침(생년 시트 ·
// 사이드바 · 대화상자)이 없을 때 한 번 뜹니다 — 로그가 비어 있으면 무엇을 가리키는지 모르고, 생년 시트가 먼저 뜨면 그 뒤에
// 묻혔습니다(기기 확인). 겹침이 다시 열리면 숨었다가 닫히면 같은 단계로 돌아옵니다. 끝내거나 Skip하면 기기에 남깁니다.

import { useState } from "@lynx-js/react";

import type { ChatThread } from "./chat-source.contract";
import {
  GUIDE_ROOM_ID,
  guideSteps,
  MESSENGER_MEDIA_READY,
  type GuideStep,
  type GuideStore,
} from "./messenger-guide";

export type RoomGuide = {
  readonly steps: readonly GuideStep[];
  readonly index: number;
  /** 지금 가리키는 단계 — 안내가 없으면 null. */
  readonly step: GuideStep | null;
  readonly next: () => void;
  readonly skip: () => void;
};

export function useRoomGuide(
  roomId: string,
  thread: ChatThread | null,
  store: GuideStore,
  /** 방 위에 다른 겹침이 열려 있음 — 그동안 코치마크를 숨깁니다. */
  covered: boolean,
  mediaReady: boolean = MESSENGER_MEDIA_READY,
): RoomGuide {
  const steps = guideSteps({ mediaReady });
  const [unseen, setUnseen] = useState(() => roomId === GUIDE_ROOM_ID && store.unseen("room"));
  const [index, setIndex] = useState(0);
  const greeted =
    thread !== null &&
    !thread.typing &&
    thread.messages.some((m) => m.kind === "text" && m.from === "them");
  const shown = unseen && !covered && thread !== null && thread.server !== null && greeted;
  const end = () => {
    store.markSeen("room");
    // 푸시 · 새 친구 시트로 덕수쌤 방에 먼저 온 사용자가 목록에서 「Chat with 덕수쌤」을 또 보지 않게.
    store.markSeen("list");
    setUnseen(false);
  };
  return {
    steps,
    index,
    step: shown ? (steps[index] ?? null) : null,
    next: () => {
      if (index >= steps.length - 1) end();
      else setIndex(index + 1);
    },
    skip: end,
  };
}
