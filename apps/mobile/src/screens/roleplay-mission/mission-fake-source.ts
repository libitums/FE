// 미션 출처의 가짜 구현입니다 — 계약 fixture의 6화 「커피 주문」 한 판을 끝까지 결정적으로 돌립니다.
// 학습자 글의 낱말로 목표를 이루고(서버 상태 줄의 흉내, `mission-fake-turn.ts`), 점수는 PRD §3.7의 식으로 계산합니다. 필수를 이룬
// 판은 끝내기 · 그만두기 모두 채점하고(ADR-0177), 채점 대기 판(`pendingReports`)도 하나 만들 수 있습니다. 받아 적기 · 합성은 대본의
// 말을 차례로 돌려줍니다. 테스트는 가지를 고릅니다 — 시작 거절 · 채점 실패(한 번 / 늘) · 턴 오류 · 받아 적기 · 합성 실패.

import { buildFakeReport, FAKE_CAFE_SCRIPT, fakeHeard } from "./mission-fake-rules";
import { fakeTurn, requiredDoneOf } from "./mission-fake-turn";
import type { FakePlay, FakeTurnEvent } from "./mission-fake-turn";
import { missionHintExamples, missionListFixture, missionStartFixture } from "./mission-fixture";
import type { MissionSpeech, MissionTranscript } from "./mission-voice.contract";
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
  /** 필수를 이룬 채 방치된 판 하나를 채점 대기(`pendingReports`)로 둡니다. */
  readonly pendingReport?: boolean;
  /** 받아 적기 결과를 차례로(끝나면 처음부터). 없으면 대본의 말(`FAKE_CAFE_SCRIPT.heard`). */
  readonly heard?: readonly MissionTranscript[];
  /** 합성이 늘 실패합니다(조용히 — 글자만). */
  readonly ttsFails?: boolean;
  /** 비동기 한 걸음 — 앱은 지연 있는 타이머, 테스트는 즉시 실행하는 스케줄러를 줍니다. */
  readonly schedule?: (task: () => void) => void;
};

const FAKE_DELAY_MS = 450;
const defaultSchedule = (task: () => void): void => {
  setTimeout(task, FAKE_DELAY_MS);
};

const BASE_ID = 0x3e4f5a6b7c81;
const conversationIdOf = (index: number): string =>
  `6c2d8f3b-5d2e-4a8f-8b62-${(BASE_ID + index).toString(16).padStart(12, "0")}`;

const newPlay = (id: string): FakePlay => ({
  id,
  done: new Map(),
  utterances: [],
  corrections: [],
  turnsLeft: missionStartFixture.turnLimit,
  hintsLeft: missionStartFixture.hintsLeft,
  hintsUsed: 0,
  ended: null,
  closed: false,
  gradingAttempts: 0,
});

/** 채점 대기 판 — 주문 · 결제(필수 둘)를 이룬 채 방치돼 닫힌 판. */
function pendingPlay(id: string): FakePlay {
  const play = newPlay(id);
  const lines = [FAKE_CAFE_SCRIPT.orderRetry.ko, missionHintExamples.pay?.ko ?? ""];
  play.done.set("order", lines[0] ?? "");
  play.done.set("pay", lines[1] ?? "");
  play.utterances.push(...lines);
  play.turnsLeft -= lines.length;
  play.closed = true;
  return play;
}

export function createFakeMissionSource(options: FakeMissionOptions = {}): MissionSource {
  const schedule = options.schedule ?? defaultSchedule;
  function later<T>(value: () => T): Promise<T> {
    return new Promise((resolve) => schedule(() => resolve(value())));
  }
  const list = options.list ?? missionListFixture;
  const plays = new Map<string, FakePlay>();
  const pending = new Set<string>();
  let best = list.missions.find((item) => item.id === "u06-cafe")?.best?.totalScore ?? null;
  let heardIndex = 0;
  if (options.pendingReport === true) {
    const play = pendingPlay(conversationIdOf(0));
    plays.set(play.id, play);
    pending.add(play.id);
  }

  const grade = (play: FakePlay): MissionFinishResponse => {
    play.closed = true;
    pending.delete(play.id);
    play.gradingAttempts += 1;
    const failing =
      options.grading === "fail-always" ||
      (options.grading === "fail-once" && play.gradingAttempts === 1);
    if (failing)
      return { status: "grading_failed", conversationId: play.id, retryable: true, refunded: true };
    const report = buildFakeReport(
      {
        conversationId: play.id,
        done: play.done,
        hintsUsed: play.hintsUsed,
        corrections: play.corrections,
        utterances: play.utterances,
        endReason: play.ended ?? "finish",
      },
      best,
    );
    best = report.bestScore;
    return { status: "graded", report };
  };

  return {
    list: () =>
      later(() =>
        pending.size === 0
          ? list
          : {
              ...list,
              pendingReports: [...pending].map((conversationId) => ({
                conversationId,
                missionId: missionStartFixture.missionId,
                endedAt: "2026-11-23T09:30:00+09:00",
              })),
            },
      ),
    start: (missionId) =>
      later(() => {
        const item = list.missions.find((entry) => entry.id === missionId);
        if (options.start !== undefined && options.start !== "ok")
          return { kind: "rejected", code: options.start };
        // 가짜는 6화 한 편만 돌립니다. 다른 미션 · 잠긴 미션은 서버처럼 `not_available`.
        if (item === undefined || !item.unlocked || missionId !== missionStartFixture.missionId)
          return { kind: "rejected", code: "not_available" };
        const play = newPlay(conversationIdOf(plays.size));
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
      const queue: FakeTurnEvent[] = [];
      if (play === undefined || play.closed || play.turnsLeft === 0) {
        queue.push(["error", { code: "conversation_closed", retryable: false }]);
      } else if (options.failTurnOn !== undefined && request.text.includes(options.failTurnOn)) {
        queue.push(["error", { code: "upstream_unavailable", retryable: true }]);
      } else {
        queue.push(...fakeTurn(play, request.text, list.price.balance));
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
        const ordered = [...missionStartFixture.goals].sort(
          (a, b) => Number(b.required) - Number(a.required),
        );
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
          value: { goalId: goal.id, ...example, hintsLeft: play.hintsLeft, hintNo: play.hintsUsed },
        };
      }),
    finish: (conversationId, abandon) =>
      new Promise<MissionFinishResponse>((resolve, reject) =>
        schedule(() => {
          const play = plays.get(conversationId);
          if (play === undefined) {
            resolve({ status: "abandoned", conversationId });
            return;
          }
          // 필수를 이룬 판은 끝내기 · 그만두기 모두 채점(ADR-0177). 필수 전이면 그만둠, 열린 판을 그냥 채점하려 하면 거절.
          if (requiredDoneOf(play) || play.ended !== null) {
            resolve(grade(play));
            return;
          }
          if (abandon) {
            play.closed = true;
            resolve({ status: "abandoned", conversationId });
            return;
          }
          reject(new Error("mission_not_ended"));
        }),
      ),
    transcribe: () =>
      later((): MissionTranscript => {
        const script =
          options.heard ??
          FAKE_CAFE_SCRIPT.heard.map((line) => fakeHeard(line.text, line.autoSend, line.reason));
        const next = script[heardIndex % Math.max(1, script.length)];
        heardIndex += 1;
        return next ?? { kind: "failed", error: "speech_empty" };
      }),
    speak: (_conversationId, request) =>
      later((): MissionSpeech =>
        options.ttsFails === true
          ? { kind: "failed" }
          : {
              kind: "audio",
              url: `fake://tts/${request.kind === "message" ? request.message_id : `hint-${String(request.hint_no)}`}`,
              expiresAt: "2099-01-01T00:00:00+09:00",
              cached: false,
              mime: "audio/mpeg",
            },
      ),
  };
}
