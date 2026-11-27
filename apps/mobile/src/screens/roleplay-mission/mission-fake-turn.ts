// 가짜 출처의 턴 하나 — 학습자 글로 목표를 이루고(서버 상태 줄의 흉내) SSE 이벤트 줄을 만듭니다. 모든 목표를 이루면 `goals`로 닫고,
// 필수만 이뤘으면 판을 열어 둔 채 `requiredDone`을 싣습니다(계속하기 / 끝내기). 턴 상한이면 `turn_limit`.

import { fakeFixOf, fakeReplyOf, goalsReachedBy } from "./mission-fake-rules";
import type { FakeCorrection } from "./mission-fake-rules";
import type { FakeMissionScript } from "./mission-fake-scripts";
import type { MissionEndReason } from "./roleplay-mission.contract";

export type FakePlay = {
  readonly id: string;
  /** 이 판이 돌리는 미션 대본. */
  readonly script: FakeMissionScript;
  readonly done: Map<string, string>;
  readonly utterances: string[];
  readonly corrections: FakeCorrection[];
  turnsLeft: number;
  hintsLeft: number;
  hintsUsed: number;
  /** 턴으로 닫힌 까닭(모든 목표 · 턴 상한). 끝내기 · 그만두기로 닫히면 `closed`만 섭니다. */
  ended: MissionEndReason | null;
  closed: boolean;
  gradingAttempts: number;
};

export type FakeTurnEvent = readonly [string, unknown];

export const requiredDoneOf = (play: FakePlay): boolean =>
  play.script.start.goals.every((goal) => !goal.required || play.done.has(goal.id));

export const messageIdOf = (play: FakePlay, turn: number, who: "u" | "a"): string =>
  `${play.id.slice(0, 24)}${(turn * 2 + (who === "u" ? 0 : 1)).toString(16).padStart(12, "0")}`;

/** 턴 하나를 판에 적용하고 이벤트 줄을 돌려줍니다(판을 바꿉니다). */
export function fakeTurn(play: FakePlay, text: string, balance: number | null): FakeTurnEvent[] {
  play.turnsLeft -= 1;
  play.utterances.push(text);
  const turn = play.utterances.length;
  const goalOrder = play.script.start.goals;
  const reached = goalsReachedBy(play.script, text).filter((id) => !play.done.has(id));
  for (const id of reached) play.done.set(id, text);
  const allDone = goalOrder.every((goal) => play.done.has(goal.id));
  const ended: MissionEndReason | null = allDone
    ? "goals"
    : play.turnsLeft === 0
      ? "turn_limit"
      : null;
  if (ended !== null) {
    play.ended = ended;
    play.closed = true;
  }
  const reply = fakeReplyOf(play.script, reached, ended);
  const userMessageId = messageIdOf(play, turn, "u");
  const assistantMessageId = messageIdOf(play, turn, "a");
  const fix = fakeFixOf(play.script, text);
  const corrected = fix === null ? null : text.replace(fix.from, fix.to);
  if (fix !== null && corrected !== null) {
    play.corrections.push({
      original: text,
      corrected,
      kind: fix.kind,
      items: [{ original: fix.from, corrected: fix.to, reason: fix.reason }],
    });
  }
  return [
    [
      "start",
      {
        contractVersion: 1,
        conversationId: play.id,
        userMessageId,
        assistantMessageId,
        speechLevel: "polite",
      },
    ],
    ["delta", { segment: 0, kind: "speech", text: reply.ko }],
    ["translation", { segment: 0, text: reply.en }],
    [
      "correction",
      fix === null
        ? {
            userMessageId,
            status: "none",
            kind: null,
            original: text,
            corrected: null,
            items: [],
            better: null,
            meaning: null,
          }
        : {
            userMessageId,
            status: "ok",
            kind: fix.kind,
            original: text,
            corrected,
            items: [{ original: fix.from, corrected: fix.to, reason: fix.reason }],
            better: null,
            meaning: null,
          },
    ],
    [
      "mission",
      {
        conversationId: play.id,
        goals: goalOrder.map((goal) => ({ id: goal.id, done: play.done.has(goal.id) })),
        turnsLeft: play.turnsLeft,
        ended,
        requiredDone: requiredDoneOf(play),
      },
    ],
    ["done", { assistantMessageId, creditsSpent: 0, balance }],
  ];
}
