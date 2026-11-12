import { describe, expect, test } from "vitest";

import type { LearningExpression } from "./chat-send.contract.ts";
import {
  learnedTargets,
  learningOutcome,
  resolveLearning,
  withLearnedUse,
} from "./chat-send-learning.ts";
import { nextTopicState, topicStateFrom } from "./companion-branching.ts";
import {
  decideLearning,
  defaultLearningSettings,
  type LearningDecision,
  offerDirective,
  openerOffer,
  pickOpenerExpression,
  rankExpressions,
} from "./companion-learning.ts";
import { nextLearningState } from "./companion-learning-state.ts";
import { containsExpression, matchedExpressions } from "./companion-learning-match.ts";
import { emptyFeedback } from "./companion-llm-prompts.ts";

const expr = (
  id: string,
  surface: string,
  extra: Partial<LearningExpression> = {},
): LearningExpression => ({
  id,
  kind: id.slice(0, 4),
  surface,
  roman: null,
  gloss: null,
  ...extra,
});

const pool = [
  expr("expr:fine", "괜찮아요.", { episode: "u01-water" }),
  expr("expr:offer", "드릴까요?", { episode: "u01-water", exposed: 2, lastSeenAt: "2026-11-09" }),
  expr("patt:means", "{수단}로 할게요.", { episode: "u01-water", exposed: 1, produced: 1 }),
];
const input = {
  pool,
  episodes: ["u00-tutorial", "u01-water"],
  settings: defaultLearningSettings,
  chipsOn: true,
  switching: false,
  today: "2026-11-10",
};
const at = (value: number) => () => value;

describe("학습 표현 넣기 판정(PRD §3.7)", () => {
  // LN1 — 주기: 최소 간격 전에는 닫히고, 열린 뒤 확률이 오르다가 강제 턴에는 반드시 넣는다.
  test("LN1. 최소 간격 · 확률 오름 · 강제 턴", () => {
    const base = { ...topicStateFrom(null), turn: 4, lastInsertTurn: 3 };
    expect(decideLearning(base, { ...input, random: at(0) })).toMatchObject({
      open: false,
      reason: "cooldown",
    });
    const opened = { ...base, turn: 5 };
    expect(decideLearning(opened, { ...input, random: at(0.5) })).toMatchObject({
      open: true,
      reason: "chance",
      target: null,
    });
    expect(decideLearning(opened, { ...input, random: at(0.1) }).reason).toBe("ok");
    const forced = { ...base, turn: 8 };
    expect(decideLearning(forced, { ...input, random: at(0.99) }).reason).toBe("ok");
  });

  // LN2 — 넣지 않는 턴과 대상 유저.
  test("LN2. 첫 턴 · 전환 원함 · 무거운 대화 · 화제 전환 · 하루 상한 · 튜토리얼만 · 끝낸 유닛 없음 · 수동 범위 비어 있음은 넣지 않는다", () => {
    const ready = { ...topicStateFrom(null), turn: 10 };
    const reason = (
      state: typeof ready,
      extra: Partial<typeof input> & { manualEmpty?: boolean } = {},
    ) => decideLearning(state, { ...input, ...extra, random: at(0) }).reason;
    expect(reason({ ...ready, turn: 0 })).toBe("first_turn");
    expect(reason({ ...ready, wantsSwitch: true })).toBe("wants_switch");
    expect(reason({ ...ready, heavy: true })).toBe("heavy");
    expect(reason(ready, { switching: true })).toBe("switch");
    expect(reason({ ...ready, learnDay: "2026-11-10", learnToday: 6 })).toBe("daily_cap");
    expect(reason({ ...ready, learnDay: "2026-11-09", learnToday: 6 })).toBe("ok");
    expect(reason(ready, { episodes: ["u00-tutorial"] })).toBe("tutorial_only");
    expect(reason(ready, { pool: [] })).toBe("no_pool");
    // 수동 범위인데 고른 에피소드가 없으면(20261126) 따로 센다.
    expect(reason(ready, { pool: [], manualEmpty: true })).toBe("manual_empty");
    expect(reason(ready, { settings: { ...defaultLearningSettings, enabled: false } })).toBe(
      "disabled",
    );
  });

  // LN3 — 후보: 아직 만난 적 없는 것 → 유저가 안 쓴 것 → 오래 안 본 것, 직전 표현은 빼고, 많이 건너뛴 표현은 뒤로. 칩만 코드가 고른다.
  test("LN3. 후보 순서 · 후보 방식 · 칩", () => {
    expect(rankExpressions(pool, null).map((entry) => entry.id)).toEqual([
      "expr:fine",
      "expr:offer",
      "patt:means",
    ]);
    expect(rankExpressions(pool, "expr:fine")[0]!.id).toBe("expr:offer");
    expect(rankExpressions(pool, null, { "expr:fine": 3 }).map((entry) => entry.id)).toEqual([
      "expr:offer",
      "patt:means",
      "expr:fine",
    ]);
    expect(rankExpressions(pool, null, { "expr:fine": 2 })[0]!.id).toBe("expr:fine");
    const state = { ...topicStateFrom(null), turn: 10, lastExpressionId: "expr:fine" };
    // 답 방식 — 후보를 준다: 아직 안 쓴 표현은 유도 먼저, 써 본 표현은 노출 먼저.
    const offered = decideLearning(state, { ...input, random: at(0) });
    expect(offered.target).toBeNull();
    expect(offered.offer?.candidates).toEqual([
      expect.objectContaining({
        ref: "e1",
        expressionId: "expr:offer",
        modes: ["elicit", "expose"],
      }),
      expect.objectContaining({
        ref: "e2",
        expressionId: "patt:means",
        modes: ["expose", "elicit"],
      }),
    ]);
    // 처음 만나는 표현은 노출만.
    const fresh = { ...state, lastExpressionId: null };
    expect(decideLearning(fresh, { ...input, random: at(0) }).offer?.candidates[0]).toMatchObject({
      expressionId: "expr:fine",
      modes: ["expose"],
    });
    // 칩 — 앞쪽 셋에서 고른 표현의 칩 비중에 걸리면 그 표현 하나를 칩으로(확률 0 · 첫 칸 · 방식 0.6).
    const rolls =
      (...values: number[]) =>
      () =>
        values.shift() ?? 0;
    expect(decideLearning(state, { ...input, random: rolls(0, 0, 0.6) })).toMatchObject({
      target: { expressionId: "expr:offer", mode: "chip" },
      offer: null,
    });
    // 칩 스위치가 꺼져 있으면 칩은 없다.
    expect(
      decideLearning(state, { ...input, chipsOn: false, random: rolls(0, 0, 0.6) }).target,
    ).toBeNull();
  });

  test("LN4. 후보 지시 글 · 첫 인사 표현 · 화제 상태의 학습 칸", () => {
    const decision = decideLearning(
      { ...topicStateFrom(null), turn: 10 },
      { ...input, random: at(0) },
    );
    const directive = offerDirective(decision.offer!);
    expect(directive).toContain('- e1: "괜찮아요." — say it only');
    expect(directive).toContain("use none");
    expect(directive).toContain('"learned"');
    // forceTurns 가 지나면 웬만하면 넣어 보라는 한 줄(강제는 아님).
    expect(directive).toContain("It has been a while");
    const early = decideLearning(
      { ...topicStateFrom(null), turn: 4, lastInsertTurn: 2 },
      { ...input, random: at(0) },
    );
    expect(offerDirective(early.offer!)).not.toContain("It has been a while");
    expect(pickOpenerExpression([], defaultLearningSettings, at(0))).toBeNull();
    const opener = pickOpenerExpression(pool, defaultLearningSettings, at(0))!;
    expect(opener.mode).toBe("expose");
    expect(offerDirective(openerOffer(opener))).toContain('- e1: "괜찮아요." — say it only');
    const target = {
      expressionId: "expr:fine",
      kind: "expr",
      surface: "괜찮아요.",
      gloss: null,
      mode: "elicit" as const,
    };
    const state = {
      ...topicStateFrom(null),
      learnDay: "2026-11-10",
      learnToday: 2,
      learnSkips: { "expr:fine": 2 },
    };
    expect(
      nextLearningState(state, { target, skipped: false, offered: [] }, "2026-11-10"),
    ).toMatchObject({
      inserted: true,
      learnToday: 3,
      lastExpressionId: "expr:fine",
      recentTargets: ["expr:fine"],
      learnSkips: {},
    });
    expect(
      nextLearningState(state, { target, skipped: false, offered: [] }, "2026-11-11").learnToday,
    ).toBe(1);
  });

  // LN5 — 넘기면 간격 · 하루 수를 쓰지 않고 다음 턴에 다시 연다. 이어 넘기면 그때 간격을 새로 센다.
  test("LN5. 건너뜀 — 간격 · 하루 수 그대로, 후보마다 건너뜀, 이어 넘기면 간격을 새로", () => {
    const state = {
      ...topicStateFrom(null),
      turn: 6,
      lastInsertTurn: 3,
      learnDay: "2026-11-10",
      learnToday: 1,
    };
    const skip = { target: null, skipped: true, offered: ["expr:fine", "expr:offer"] };
    const after = nextTopicState(state, {
      userText: "오늘 날씨가 좋네요",
      turnState: null,
      action: null,
      learning: skip,
      today: "2026-11-10",
    });
    expect(after).toMatchObject({
      lastInsertTurn: 3,
      learnToday: 1,
      learnSkipStreak: 1,
      learnSkips: { "expr:fine": 1, "expr:offer": 1 },
    });
    // 다음 턴에도 열린다(간격이 그대로라).
    expect(decideLearning(after, { ...input, random: at(0) }).reason).toBe("ok");
    const third = nextTopicState(
      { ...after, learnSkipStreak: defaultLearningSettings.maxSkipStreak - 1 },
      { userText: "음", turnState: null, action: null, learning: skip, today: "2026-11-10" },
    );
    expect(third).toMatchObject({
      lastInsertTurn: after.turn + 1,
      learnSkipStreak: 0,
      learnToday: 1,
    });
    expect(decideLearning(third, { ...input, random: at(0) }).reason).toBe("cooldown");
    // 옛 상태(칸 없음)도 읽는다.
    expect(topicStateFrom({ turn: 2, learnSkips: { a: 1, b: "x" } as never })).toMatchObject({
      learnSkipStreak: 0,
      learnSkips: { a: 1 },
    });
  });
});

describe("학습 표현 글자 판정", () => {
  test("LM1. 고정 표현 · 용언 · 자리 있는 문형", () => {
    expect(containsExpression(expr("expr:a", "괜찮아요."), "아 괜찮아!")).toBe(true);
    expect(containsExpression(expr("voca:a", "따뜻하다"), "오늘 따뜻해요")).toBe(true);
    expect(containsExpression(expr("patt:a", "{수단}로 할게요."), "카드로 할게요")).toBe(true);
    expect(containsExpression(expr("patt:a", "{수단}로 할게요."), "카드 주세요")).toBe(false);
  });

  test("LM2. 유저 산출 — 한 글자 어휘는 글자 판정에서 뺀다 · 칩 전송은 세지 않는다", () => {
    const list = [expr("voca:water", "물"), expr("expr:fine", "괜찮아요.")];
    expect(matchedExpressions(list, "물 괜찮아요").map((entry) => entry.id)).toEqual(["expr:fine"]);
    const card = emptyFeedback("none", "괜찮아요");
    expect(withLearnedUse(card, list, "괜찮아요", { inputSource: "manual" }).learnedUsed).toEqual([
      { id: "expr:fine", surface: "괜찮아요." },
    ]);
    expect(
      withLearnedUse(card, list, "괜찮아요", { inputSource: "suggestion" }).learnedUsed,
    ).toBeUndefined();
  });

  test("LM3. 피드백 판정 후보는 최근 지시한 문형만 · 턴 결과의 기록", () => {
    const state = { ...topicStateFrom(null), recentTargets: ["expr:fine", "patt:means"] };
    expect(learnedTargets(pool, state)).toEqual([
      { ref: "t1", id: "patt:means", surface: "{수단}로 할게요.", gloss: null },
    ]);
    const decision = decideLearning(
      { ...topicStateFrom(null), turn: 10 },
      { ...input, random: at(0) },
    ) as LearningDecision;
    const said = (learned: unknown, text: string, how?: string) =>
      resolveLearning(
        decision,
        {
          intimacyDelta: 1,
          topic: null,
          userWantsSwitch: false,
          ...(learned === undefined ? {} : { learned: learned as string }),
          ...(how ? { learnedHow: how as "say" } : {}),
        },
        [{ kind: "speech", text }],
        false,
      );
    const outcome = learningOutcome({
      decision,
      result: said("e1", "저는 괜찮아요!", "say"),
      feedback: { ...emptyFeedback("none", "x"), learnedUsed: [{ id: "patt:means", surface: "" }] },
    });
    expect(outcome.events).toEqual([
      { expressionId: "expr:fine", kind: "exposed" },
      { expressionId: "patt:means", kind: "produced" },
    ]);
    expect(outcome.meta).toMatchObject({
      reason: "ok",
      offered: ["괜찮아요.", "드릴까요?", "{수단}로 할게요."],
      mode: "expose",
      done: true,
      produced: ["patt:means"],
    });
    // 질문으로 썼으면 유도(보고만).
    expect(said("e2", "물 드릴까요?", "ask")).toMatchObject({
      target: { expressionId: "expr:offer", mode: "elicit" },
      done: true,
    });
    // 넘기면(learned 없음 · 없는 id) 건너뜀 — meta.reason skipped, 방식 없음.
    const skipped = learningOutcome({
      decision,
      result: said(undefined, "안녕!"),
      feedback: emptyFeedback("none", "x"),
    });
    expect(skipped.meta).toMatchObject({ open: true, reason: "skipped" });
    expect(skipped.meta).not.toHaveProperty("mode");
    expect(said("e9", "안녕!")).toMatchObject({ skipped: true, target: null });
    // 칩 방식은 표현을 넣은 칩이 보였는가.
    const chip: LearningDecision = {
      open: true,
      reason: "ok",
      target: {
        expressionId: "expr:offer",
        kind: "expr",
        surface: "드릴까요?",
        gloss: null,
        mode: "chip",
      },
      offer: null,
    };
    expect(resolveLearning(chip, null, [], true)).toMatchObject({ done: true, skipped: false });
    // 모델이 썼다고 했어도 글에 없으면 노출로 세지 않는다.
    const missed = learningOutcome({
      decision,
      result: said("e1", "안녕!", "say"),
      feedback: emptyFeedback("none", "x"),
    });
    expect(missed.events).toEqual([]);
  });
});
