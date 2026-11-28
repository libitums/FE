// 맞힌 뒤 저절로 넘김입니다(ADR-0201 D6 적용 2 개정 ⟨한 번에 한 목소리⟩) — 최소 2초가 지나고 내 문장 소리가 끝나야 다음 턴으로
// 넘깁니다. 끝 신호가 오지 않아도 상한 시간 뒤에는 넘기고, 앱이 뒤로 가면 소리를 멈추고 누르기를 기다립니다.

import { useEffect, useLynxGlobalEventListener, useRef, useState } from "@lynx-js/react";

import { roleplayAutoAdvanceReady } from "./roleplay-panel";

/** 맞힌 뒤 최소한 머무는 시간(시안 R3) — 내 문장 소리가 이보다 짧으면 이때 넘어갑니다. 누르면 바로 넘어갑니다. */
export const ROLEPLAY_CORRECT_ADVANCE_MS = 2000;
/** 내 문장 소리의 끝 신호를 기다리는 상한 — 호스트가 끝을 알리지 못해도 대화가 멈추지 않게 합니다. */
export const ROLEPLAY_REPLY_WAIT_CAP_MS = 10_000;

export type RoleplayAutoAdvance = {
  /** 내 문장 소리가 끝났을 때 — 그 소리를 낸 턴의 번호와 함께 부릅니다(늦게 온 이전 턴 신호는 버립니다). */
  readonly replyEnded: (turn: number) => void;
};

export function useRoleplayAutoAdvance(input: {
  readonly correct: boolean;
  readonly turn: number;
  readonly waitsForReply: boolean;
  readonly advance: () => void;
  /** 앱이 뒤로 갈 때 — 화면이 소리를 멈춥니다. */
  readonly onAway: () => void;
}): RoleplayAutoAdvance {
  const { correct, turn, waitsForReply } = input;
  // 턴 번호로 적어 둡니다 — 턴이 바뀌면 저절로 「아직」이 됩니다.
  const [minElapsedAt, setMinElapsedAt] = useState(-1);
  const [replyEndedAt, setReplyEndedAt] = useState(-1);
  const [awayAt, setAwayAt] = useState(-1);
  const latest = useRef(input);
  latest.current = input;

  useEffect(() => {
    if (!correct) return undefined;
    const min = setTimeout(() => setMinElapsedAt(turn), ROLEPLAY_CORRECT_ADVANCE_MS);
    const cap = setTimeout(() => setReplyEndedAt(turn), ROLEPLAY_REPLY_WAIT_CAP_MS);
    return () => {
      clearTimeout(min);
      clearTimeout(cap);
    };
  }, [correct, turn]);

  const ready = roleplayAutoAdvanceReady({
    correct,
    minElapsed: minElapsedAt === turn,
    replyEnded: replyEndedAt === turn,
    waitsForReply,
    away: awayAt === turn,
  });
  useEffect(() => {
    if (ready) latest.current.advance();
  }, [ready]);

  useLynxGlobalEventListener("appDidEnterBackground", () => {
    "background only";
    // 맞힌 국면에서 뒤로 갔을 때만 넘김을 붙듭니다 — 말하기 전에 다녀온 턴은 맞히면 그대로 저절로 넘어갑니다.
    if (latest.current.correct) setAwayAt(latest.current.turn);
    latest.current.onAway();
  });

  return {
    replyEnded: (ended) => {
      "background only";
      setReplyEndedAt(ended);
    },
  };
}
