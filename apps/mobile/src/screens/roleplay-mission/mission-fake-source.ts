// 미션 출처의 가짜 구현입니다 — 계약 fixture의 6화 「커피 주문」 한 판을 끝까지 결정적으로 돌립니다.
// 학습자 글의 낱말로 목표를 이루고(서버 상태 줄의 흉내), 점수는 PRD §3.7의 식으로 계산합니다. 테스트는 가지를 고릅니다 —
// 시작 거절(엽전 부족 등) · 채점 실패(한 번 / 늘) · 턴 오류. 서버 구현은 같은 포트(`MissionSource`)로 나중에 붙습니다.

import { buildFakeReport, fakeReplyOf, goalsReachedBy } from "./mission-fake-rules";
import { missionHintExamples, missionListFixture, missionStartFixture } from "./mission-fixture";
import type {
  MissionFinishResponse,
  MissionList,
  MissionSource,
  MissionStartRejection,
} from "./roleplay-mission.contract";

export type FakeMissionOptions = {
  readonly list?: MissionList;
  /** 시작의 결과 — 거절 코드를 주면 늘 그 코드로 거절합니다. */
  readonly start?: "ok" | MissionStartRejection;
  /** 채점 — `fail-once`는 첫 채점만 실패하고 다시 시도하면 리포트를 줍니다. */
  readonly grading?: "graded" | "fail-once" | "fail-always";
  /** 이 낱말이 든 턴은 스트림 오류로 끝납니다(배달 실패 가지). */
  readonly failTurnOn?: string;
  /** 비동기 한 걸음 — 앱은 지연 있는 타이머, 테스트는 즉시 실행하는 스케줄러를 줍니다. */
  readonly schedule?: (task: () => void) => void;
};

type Play = {
  readonly id: string;
  readonly done: Map<string, string>;
  readonly utterances: string[];
  readonly corrections: { original: string; corrected: string }[];
  turnsLeft: number;
  hintsLeft: number;
  hintsUsed: number;
  closed: boolean;
  gradingAttempts: number;
};

const FAKE_DELAY_MS = 450;
const defaultSchedule = (task: () => void): void => {
  setTimeout(task, FAKE_DELAY_MS);
};

const BASE_ID = 0x3e4f5a6b7c81;
const conversationIdOf = (index: number): string =>
  `6c2d8f3b-5d2e-4a8f-8b62-${(BASE_ID + index).toString(16).padStart(12, "0")}`;
const messageIdOf = (play: Play, turn: number, who: "u" | "a"): string =>
  `${play.id.slice(0, 24)}${(turn * 2 + (who === "u" ? 0 : 1)).toString(16).padStart(12, "0")}`;

export function createFakeMissionSource(options: FakeMissionOptions = {}): MissionSource {
  const schedule = options.schedule ?? defaultSchedule;
  const later = <T>(value: () => T): Promise<T> =>
    new Promise((resolve) => schedule(() => resolve(value())));
  const list = options.list ?? missionListFixture;
  const plays = new Map<string, Play>();
  let best = list.missions.find((item) => item.id === "u06-cafe")?.best?.totalScore ?? null;

  const goalOrder = missionStartFixture.goals;

  return {
    list: () => later(() => list),
    start: (missionId) =>
      later(() => {
        const item = list.missions.find((entry) => entry.id === missionId);
        if (options.start !== undefined && options.start !== "ok")
          return { kind: "rejected", code: options.start };
        // 가짜는 6화 한 편만 돌립니다. 다른 미션 · 잠긴 미션은 서버처럼 `not_available`.
        if (item === undefined || !item.unlocked || missionId !== missionStartFixture.missionId)
          return { kind: "rejected", code: "not_available" };
        const play: Play = {
          id: conversationIdOf(plays.size),
          done: new Map(),
          utterances: [],
          corrections: [],
          turnsLeft: missionStartFixture.turnLimit,
          hintsLeft: missionStartFixture.hintsLeft,
          hintsUsed: 0,
          closed: false,
          gradingAttempts: 0,
        };
        plays.set(play.id, play);
        return {
          kind: "started",
          value: {
            ...missionStartFixture,
            conversationId: play.id,
            charge:
              list.price.freeLeft > 0
                ? { source: "free", credits: 0 }
                : { source: "credits", credits: list.price.cost },
          },
        };
      }),
    sendTurn: (request, listener) => {
      const play = plays.get(request.conversationId);
      let cancelled = false;
      const queue: (readonly [string, unknown])[] = [];
      if (play === undefined || play.closed || play.turnsLeft === 0) {
        queue.push(["error", { code: "conversation_closed", retryable: false }]);
      } else if (options.failTurnOn !== undefined && request.text.includes(options.failTurnOn)) {
        queue.push(["error", { code: "upstream_unavailable", retryable: true }]);
      } else {
        play.turnsLeft -= 1;
        play.utterances.push(request.text);
        const turn = play.utterances.length;
        const reached = goalsReachedBy(request.text).filter((id) => !play.done.has(id));
        for (const id of reached) play.done.set(id, request.text);
        const allRequired = goalOrder.every((goal) => !goal.required || play.done.has(goal.id));
        const ended = allRequired ? "goals" : play.turnsLeft === 0 ? "turn_limit" : null;
        if (ended !== null) play.closed = true;
        const reply = fakeReplyOf(reached, ended);
        const userMessageId = messageIdOf(play, turn, "u");
        const assistantMessageId = messageIdOf(play, turn, "a");
        const better = request.text.includes("가지고 가요");
        if (better) play.corrections.push({ original: "가지고 가요", corrected: "포장이요" });
        queue.push(
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
            better
              ? {
                  userMessageId,
                  status: "ok",
                  kind: "better",
                  original: request.text,
                  corrected: request.text.replace("가지고 가요", "포장이요"),
                  items: [],
                  better: null,
                  meaning: "To go, please.",
                }
              : {
                  userMessageId,
                  status: "none",
                  kind: null,
                  original: request.text,
                  corrected: null,
                  items: [],
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
            },
          ],
          ["done", { assistantMessageId, creditsSpent: 0, balance: list.price.balance }],
        );
      }
      const step = (): void => {
        if (cancelled) return;
        const next = queue.shift();
        if (next === undefined) {
          listener.onEnd();
          return;
        }
        listener.onEvent(next[0], JSON.stringify(next[1]));
        schedule(step);
      };
      schedule(step);
      return () => {
        cancelled = true;
      };
    },
    hint: (conversationId) =>
      later(() => {
        const play = plays.get(conversationId);
        const ordered = [...goalOrder].sort((a, b) => Number(b.required) - Number(a.required));
        const goal = ordered.find((entry) => play !== undefined && !play.done.has(entry.id));
        const example = goal === undefined ? undefined : missionHintExamples[goal.id];
        if (
          play === undefined ||
          play.closed ||
          play.hintsLeft === 0 ||
          goal === undefined ||
          example === undefined
        )
          return { kind: "unavailable" };
        play.hintsLeft -= 1;
        play.hintsUsed += 1;
        return {
          kind: "hint",
          value: { goalId: goal.id, ...example, hintsLeft: play.hintsLeft },
        };
      }),
    finish: (conversationId, abandon) =>
      later((): MissionFinishResponse => {
        const play = plays.get(conversationId);
        if (play === undefined || abandon) {
          if (play !== undefined) play.closed = true;
          return { status: "abandoned", conversationId };
        }
        play.closed = true;
        play.gradingAttempts += 1;
        const failing =
          options.grading === "fail-always" ||
          (options.grading === "fail-once" && play.gradingAttempts === 1);
        if (failing)
          return { status: "grading_failed", conversationId, retryable: true, refunded: true };
        const report = buildFakeReport(
          {
            conversationId,
            done: play.done,
            hintsUsed: play.hintsUsed,
            corrections: play.corrections,
            utterances: play.utterances,
          },
          best,
        );
        best = report.bestScore;
        return { status: "graded", report };
      }),
  };
}
