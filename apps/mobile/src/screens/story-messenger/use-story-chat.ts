// 메신저 진행의 시계입니다(ADR-0088 보충) — 읽는 틈 → 입력 중 → 메시지, 답장 차례면 읽을 시간 → 시트.
// 진행 계산은 순수 함수(`storyChatProgressOf`)가 지고, 여기서는 다음 한 단계의 타이머만 겁니다.

import { useEffect, useState } from "@lynx-js/react";

import {
  storyChatProgressOf,
  storyChatReadPauseMs,
  storyChatSheetDelayMs,
  storyChatTypingMs,
} from "./story-messenger";
import type { StoryChatLogItem, StoryChatReply, StoryChatTurn } from "./story-messenger.contract";

type ChatClock = {
  readonly shown: number;
  readonly picks: readonly number[];
  /** 입력 중이 켜진 단계(쌓인 말풍선 수) — 지금 단계와 같을 때만 입력 중입니다. */
  readonly typingFor: number;
  /** 시트를 세운 답장(고른 답 수) — 지금 답장과 같을 때만 시트 차례입니다. */
  readonly sheetFor: number;
};

const START: ChatClock = { shown: 0, picks: [], typingFor: -1, sheetFor: -1 };

export type StoryChatState = {
  readonly log: readonly StoryChatLogItem[];
  readonly typing: boolean;
  /** 답장 시트가 서 있습니다 — 고를 때까지 닫히지 않습니다. */
  readonly sheetOpen: boolean;
  readonly reply: StoryChatReply | null;
  /** 시트 설명에 싣는 상대의 마지막 말입니다. */
  readonly lastIncoming: string;
  readonly done: boolean;
  readonly pick: (option: number) => void;
};

/** `running`이 false인 동안(시간 표시 화면)은 시계가 서 있습니다. */
export function useStoryChat(turns: readonly StoryChatTurn[], running: boolean): StoryChatState {
  const [clock, setClock] = useState<ChatClock>(START);
  const { log, next, awaiting } = storyChatProgressOf(turns, clock.shown, clock.picks);
  const step = log.length;
  const typing = next !== null && clock.typingFor === step;
  const sheetReady = awaiting !== null && clock.sheetFor === clock.picks.length;
  const lastItem = log[log.length - 1];
  const incoming = log.filter((item) => item.direction === "incoming");
  const lastIncoming = incoming[incoming.length - 1]?.text.ko ?? "";

  useEffect(() => {
    if (!running) return undefined;
    let fire: (() => void) | null = null;
    let ms = 0;
    if (next !== null && !typing) {
      ms = storyChatReadPauseMs(lastItem?.text.ko.length ?? 0);
      fire = () => setClock((c) => ({ ...c, typingFor: step }));
    } else if (next !== null) {
      ms = storyChatTypingMs(next.text.ko.length);
      fire = () => setClock((c) => ({ ...c, shown: c.shown + 1 }));
    } else if (awaiting !== null && !sheetReady) {
      ms = storyChatSheetDelayMs(lastIncoming.length);
      const picked = clock.picks.length;
      fire = () => setClock((c) => ({ ...c, sheetFor: picked }));
    }
    if (fire === null) return undefined;
    const timer = setTimeout(fire, ms);
    return () => clearTimeout(timer);
    // 시계의 단계가 바뀔 때만 다음 타이머를 겁니다 — 파생값(next · awaiting …)은 이 값들에서 나옵니다.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [running, clock.shown, clock.picks.length, clock.typingFor, clock.sheetFor]);

  return {
    log,
    typing: running && typing,
    sheetOpen: sheetReady,
    reply: sheetReady ? awaiting : null,
    lastIncoming,
    done: next === null && awaiting === null,
    pick: (option) => {
      setClock((c) => ({ ...c, picks: [...c.picks, option] }));
    },
  };
}
