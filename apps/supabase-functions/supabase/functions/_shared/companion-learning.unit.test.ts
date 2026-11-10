import { describe, expect, test } from "vitest";

import type { LearningExpression } from "./chat-send.contract.ts";
import { learnedTargets, learningOutcome, withLearnedUse } from "./chat-send-learning.ts";
import { topicStateFrom } from "./companion-branching.ts";
import {
  decideLearning,
  defaultLearningSettings,
  learningDirective,
  nextLearningState,
  pickOpenerExpression,
  rankExpressions,
} from "./companion-learning.ts";
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
  test("LN2. 첫 턴 · 전환 원함 · 무거운 대화 · 화제 전환 · 하루 상한 · 튜토리얼만 · 끝낸 유닛 없음은 넣지 않는다", () => {
    const ready = { ...topicStateFrom(null), turn: 10 };
    const reason = (state: typeof ready, extra: Partial<typeof input> = {}) =>
      decideLearning(state, { ...input, ...extra, random: at(0) }).reason;
    expect(reason({ ...ready, turn: 0 })).toBe("first_turn");
    expect(reason({ ...ready, wantsSwitch: true })).toBe("wants_switch");
    expect(reason({ ...ready, heavy: true })).toBe("heavy");
    expect(reason(ready, { switching: true })).toBe("switch");
    expect(reason({ ...ready, learnDay: "2026-11-10", learnToday: 6 })).toBe("daily_cap");
    expect(reason({ ...ready, learnDay: "2026-11-09", learnToday: 6 })).toBe("ok");
    expect(reason(ready, { episodes: ["u00-tutorial"] })).toBe("tutorial_only");
    expect(reason(ready, { pool: [] })).toBe("no_pool");
    expect(reason(ready, { settings: { ...defaultLearningSettings, enabled: false } })).toBe(
      "disabled",
    );
  });

  // LN3 — 표현 고르기: 아직 만난 적 없는 것 → 유저가 안 쓴 것 → 오래 안 본 것, 직전 표현은 다시 고르지 않는다.
  test("LN3. 표현 순서와 방식", () => {
    expect(rankExpressions(pool, null).map((entry) => entry.id)).toEqual([
      "expr:fine",
      "expr:offer",
      "patt:means",
    ]);
    expect(rankExpressions(pool, "expr:fine")[0]!.id).toBe("expr:offer");
    const state = { ...topicStateFrom(null), turn: 10, lastExpressionId: "expr:fine" };
    // 만난 적 있고 아직 안 쓴 표현 — 유도 비중이 높다(random 0 → 첫 칸 elicit).
    expect(decideLearning(state, { ...input, random: at(0) }).target).toMatchObject({
      expressionId: "expr:offer",
      mode: "elicit",
    });
    // 처음 만나는 표현은 노출.
    const fresh = { ...state, lastExpressionId: null };
    expect(decideLearning(fresh, { ...input, random: at(0) }).target?.mode).toBe("expose");
    // 칩 스위치가 꺼져 있으면 칩을 고르지 않는다.
    const modes = new Set(
      [0.55, 0.7, 0.79].map(
        (roll) =>
          decideLearning(state, {
            ...input,
            chipsOn: false,
            random: (() => {
              const rolls = [0, 0, roll];
              return () => rolls.shift() ?? roll;
            })(),
          }).target?.mode,
      ),
    );
    expect(modes.has("chip")).toBe(false);
  });

  test("LN4. 지시 글 · 첫 인사 표현 · 화제 상태의 학습 칸", () => {
    const target = {
      expressionId: "expr:fine",
      kind: "expr",
      surface: "괜찮아요.",
      gloss: "I'm fine",
      mode: "elicit" as const,
    };
    expect(learningDirective(target)).toContain("question");
    expect(learningDirective({ ...target, mode: "expose" })).toContain('"learned"');
    expect(learningDirective({ ...target, mode: "chip" })).toBeNull();
    expect(pickOpenerExpression([], defaultLearningSettings, at(0))).toBeNull();
    expect(pickOpenerExpression(pool, defaultLearningSettings, at(0))?.mode).toBe("expose");
    const state = { ...topicStateFrom(null), learnDay: "2026-11-10", learnToday: 2 };
    expect(nextLearningState(state, target, "2026-11-10")).toMatchObject({
      learnToday: 3,
      lastExpressionId: "expr:fine",
      recentTargets: ["expr:fine"],
    });
    expect(nextLearningState(state, target, "2026-11-11").learnToday).toBe(1);
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
    const outcome = learningOutcome({
      decision: {
        open: true,
        reason: "ok",
        target: {
          expressionId: "expr:fine",
          kind: "expr",
          surface: "괜찮아요.",
          gloss: null,
          mode: "expose",
        },
      },
      state: { intimacyDelta: 1, topic: null, userWantsSwitch: false, learned: true },
      segments: [{ kind: "speech", text: "저는 괜찮아요!" }],
      chipShown: false,
      feedback: { ...emptyFeedback("none", "x"), learnedUsed: [{ id: "patt:means", surface: "" }] },
    });
    expect(outcome.events).toEqual([
      { expressionId: "expr:fine", kind: "exposed" },
      { expressionId: "patt:means", kind: "produced" },
    ]);
    expect(outcome.meta).toMatchObject({ mode: "expose", done: true, produced: ["patt:means"] });
    // 모델이 썼다고 했어도 글에 없으면 노출로 세지 않는다.
    const missed = learningOutcome({
      decision: {
        open: true,
        reason: "ok",
        target: {
          expressionId: "expr:fine",
          kind: "expr",
          surface: "괜찮아요.",
          gloss: null,
          mode: "expose",
        },
      },
      state: { intimacyDelta: 1, topic: null, userWantsSwitch: false, learned: true },
      segments: [{ kind: "speech", text: "안녕!" }],
      chipShown: false,
      feedback: emptyFeedback("none", "x"),
    });
    expect(missed.events).toEqual([]);
  });
});
