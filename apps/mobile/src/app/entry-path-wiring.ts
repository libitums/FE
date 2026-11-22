// 여정 입장의 두 길과 입장 전 기초 세 걸음의 결선입니다(ADR-0176). 진행 · 티켓 · 엽전 · 자모표 기록에 쓰지 않습니다 —
// 활동으로 세면 첫 유닛 안내가 꺼집니다.

import type { Dispatch } from "@lynx-js/react";

import {
  entryBasicsSkippedEvent,
  entryBasicsStepCompletedEvent,
  entryCompletedEvent,
  entryPathSelectedEvent,
  entryScreenViewedEvent,
} from "../lib/entry-flow";
import type {
  EntryBasicsSkippableStep,
  EntryBasicsStep,
  EntryEventSink,
  EntryPath,
} from "../lib/entry-flow";
import type { NavAction } from "./nav-state";
import { syncPushDevice } from "./push-wiring";

export type EntryPathWiringArgs = {
  readonly entryEventSink: EntryEventSink;
  readonly dispatch: Dispatch<NavAction>;
};

export type EntryPathWiring = {
  readonly onSelectEntryPath: (path: EntryPath) => void;
  readonly onCompleteBasicsStep: (step: EntryBasicsStep) => void;
  readonly onSkipBasics: (step: EntryBasicsSkippableStep) => void;
  readonly onBasicsBack: () => void;
};

export function entryPathWiring({
  entryEventSink,
  dispatch,
}: EntryPathWiringArgs): EntryPathWiring {
  // 완주 이벤트 → `enterApp`. 진입 구간을 비우는 순간이 바텀 네비게이션이 처음 보이는 순간입니다. 알림 권한은 여기서
  // 묻지 않고 첫 스토리 뒤에 묻습니다(`use-push-prompt.ts`) — 이미 허용한 기기는 바로 토큰을 올립니다.
  const enterJourney = () => {
    entryEventSink?.(entryCompletedEvent());
    dispatch({ type: "enterApp" });
    void syncPushDevice({ ask: false });
  };
  const open = (name: "entry-basics-letters" | "entry-basics-compose" | "entry-basics-ready") => {
    entryEventSink?.(entryScreenViewedEvent(name));
    dispatch({ type: "push", screen: { name } });
  };
  return {
    onSelectEntryPath: (path) => {
      entryEventSink?.(entryPathSelectedEvent(path));
      if (path === "story") enterJourney();
      else open("entry-basics-letters");
    },
    onCompleteBasicsStep: (step) => {
      entryEventSink?.(entryBasicsStepCompletedEvent(step));
      switch (step) {
        case "letters":
          return open("entry-basics-compose");
        case "compose":
          return open("entry-basics-ready");
        case "ready":
          return enterJourney();
      }
    },
    onSkipBasics: (step) => {
      entryEventSink?.(entryBasicsSkippedEvent(step));
      enterJourney();
    },
    onBasicsBack: () => {
      dispatch({ type: "back" });
    },
  };
}
