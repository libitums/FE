// 미션 한 판의 결선입니다 — 출처 포트(`MissionSource`)를 부르고 결과를 순수 리듀서에 넣습니다.
// 화면이 떠 있는 동안에만 결과를 올립니다(늦게 온 응답이 떠난 화면의 상태를 바꾸지 않게). 마지막 턴 · 끝내기면 채점을 스스로 부릅니다.
// 필수를 이룬 판의 그만두기는 끝내기와 같습니다(채점 · 리포트, ADR-0177). 채점 대기 판은 `openPending`으로 곧장 채점합니다.

import { useEffect, useReducer, useRef } from "@lynx-js/react";

import {
  canAskHint,
  canFinishMission,
  canSendMission,
  initialMissionSession,
  missionSessionReducer,
} from "./mission-session";
import type {
  MissionInputMode,
  MissionSessionState,
  MissionSource,
} from "./roleplay-mission.contract";

export type MissionSessionControl = {
  readonly state: MissionSessionState;
  readonly start: () => void;
  readonly send: (text: string, inputMode: MissionInputMode) => void;
  readonly hint: () => void;
  readonly dismissHint: () => void;
  /** 「Mission success!」 카드의 Keep going — 카드만 닫습니다. */
  readonly keepGoing: () => void;
  /** 끝내기 — 필수를 이룬 열린 판을 닫고 채점합니다(`abandon` 없이). */
  readonly finish: () => void;
  /** 채점 대기 판(`pendingReports`)의 리포트를 엽니다 — 미리보기에서 곧장 채점. */
  readonly openPending: (conversationId: string) => void;
  readonly retryGrading: () => void;
  /** 그만두기 — 필수 전이면 서버에 그만둠을 알리고(응답을 기다리지 않음) 판을 닫고, 필수를 이뤘으면 끝내기입니다. */
  readonly quit: () => void;
  readonly reset: () => void;
};

export function useMissionSession(source: MissionSource, missionId: string): MissionSessionControl {
  const [state, dispatch] = useReducer(missionSessionReducer, missionId, initialMissionSession);
  const mounted = useRef(true);
  const cancelTurn = useRef<(() => void) | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      cancelTurn.current?.();
    };
  }, []);
  const safe = (action: Parameters<typeof dispatch>[0]) => {
    if (mounted.current) dispatch(action);
  };

  const grade = (conversationId: string) => {
    dispatch({ type: "grading-requested" });
    source.finish(conversationId, false).then(
      (value) => safe({ type: "finished", value }),
      () => safe({ type: "finish-failed" }),
    );
  };

  // 판이 닫히면(모든 목표 · 턴 상한 · 끝내기) 곧장 채점합니다(PRD §3.6 「자동으로」).
  useEffect(() => {
    if (state.phase === "ended" && state.conversationId !== null) grade(state.conversationId);
  }, [state.phase]);

  return {
    state,
    start: () => {
      "background only";
      if (state.phase !== "preview") return;
      dispatch({ type: "start-requested" });
      source.start(missionId).then(
        (result) =>
          safe(
            result.kind === "started"
              ? { type: "started", value: result.value }
              : { type: "start-rejected", code: result.code },
          ),
        () => safe({ type: "start-rejected", code: "network" }),
      );
    },
    send: (text, inputMode) => {
      "background only";
      const conversationId = state.conversationId;
      if (!canSendMission(state) || conversationId === null || text.trim() === "") return;
      dispatch({ type: "send", text, inputMode });
      cancelTurn.current = source.sendTurn(
        { conversationId, text: text.trim(), inputMode },
        {
          onEvent: (event, data) => safe({ type: "turn-event", event, data }),
          onEnd: () => {
            cancelTurn.current = null;
            safe({ type: "turn-closed" });
          },
        },
      );
    },
    hint: () => {
      "background only";
      const conversationId = state.conversationId;
      if (!canAskHint(state) || conversationId === null) return;
      dispatch({ type: "hint-requested" });
      source.hint(conversationId).then(
        (result) =>
          safe(
            result.kind === "hint"
              ? { type: "hint-received", value: result.value }
              : { type: "hint-unavailable" },
          ),
        () => safe({ type: "hint-unavailable" }),
      );
    },
    dismissHint: () => dispatch({ type: "hint-dismissed" }),
    keepGoing: () => dispatch({ type: "continue" }),
    finish: () => {
      "background only";
      if (!canFinishMission(state)) return;
      dispatch({ type: "finish-requested" });
    },
    openPending: (conversationId) => {
      "background only";
      if (state.phase !== "preview") return;
      dispatch({ type: "pending-opened", conversationId });
      source.finish(conversationId, false).then(
        (value) => safe({ type: "finished", value }),
        () => safe({ type: "finish-failed" }),
      );
    },
    retryGrading: () => {
      "background only";
      if (state.phase === "grading-failed" && state.conversationId !== null)
        grade(state.conversationId);
    },
    quit: () => {
      "background only";
      cancelTurn.current?.();
      cancelTurn.current = null;
      if (state.requiredDone && state.endReason === null && state.conversationId !== null) {
        dispatch({ type: "finish-requested" });
        return;
      }
      if (state.conversationId !== null)
        void source.finish(state.conversationId, true).catch(() => undefined);
      dispatch({ type: "abandoned" });
    },
    reset: () => dispatch({ type: "reset" }),
  };
}
