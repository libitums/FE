import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { motion } from "@libitums/design-tokens";
import { motionDurationMs } from "@libitums/ui-lynx/motion";
import { describe, expect, test } from "vitest";

import {
  initialQuestionTransitionPhase,
  questionTransitionClassName,
  questionTransitionDurationMs,
  questionTransitionKey,
  questionTransitionReducer,
  type QuestionTransitionEvent,
  type QuestionTransitionPhase,
} from "./question-transition";

// `unit` 계층: 순수 함수의 입출력만 봅니다 (ADR-0006 D4).
describe("question-transition", () => {
  // 스텁(key "0" · idle · base 클래스)과 같은 값이라 logic-scaffold에서 green인 가드입니다.
  test("QT0. 첫 문항 · idle은 전환 표지가 없다", () => {
    expect(questionTransitionKey(0, false)).toBe("0");
    expect(initialQuestionTransitionPhase(0)).toBe("idle");
    expect(questionTransitionClassName("learning-shell-stage", [], "idle", "standard")).toBe(
      "learning-shell-stage",
    );
    // idle에서는 reduced여도 토큰이 붙지 않는다.
    expect(
      questionTransitionClassName(
        "learning-shell-scroll",
        ["learning-shell-card-scroll"],
        "idle",
        "reduced",
      ),
    ).toBe("learning-shell-scroll learning-shell-card-scroll");
  });

  test("QT1. 키는 문항 순번이고 완료 장면이면 complete다", () => {
    expect(questionTransitionKey(2, false)).toBe("2");
    expect(questionTransitionKey(2, true)).toBe("complete");
    expect(questionTransitionKey(0, true)).toBe("complete");
  });

  test("QT2. 0보다 큰 순번으로 마운트하면 primed다", () => {
    expect(initialQuestionTransitionPhase(1)).toBe("primed");
    expect(initialQuestionTransitionPhase(7)).toBe("primed");
  });

  test("QT3. idle → primed → entering → idle로 돈다", () => {
    expect(questionTransitionReducer("idle", "change")).toBe("primed");
    expect(questionTransitionReducer("primed", "tick")).toBe("entering");
    expect(questionTransitionReducer("entering", "end")).toBe("idle");
  });

  // 스텁이 phase를 그대로 돌려줘 logic-scaffold에서는 green인 가드입니다.
  // 구현 뒤 변이(entering + change → primed)로 red가 되어 「재입력은 되돌리지 않는다」를 지킵니다.
  test("QT4. 나머지 여섯 조합은 phase를 바꾸지 않는다", () => {
    const stay: readonly (readonly [QuestionTransitionPhase, QuestionTransitionEvent])[] = [
      ["entering", "change"],
      ["primed", "change"],
      ["idle", "tick"],
      ["idle", "end"],
      ["primed", "end"],
      ["entering", "tick"],
    ];
    for (const [phase, event] of stay) {
      expect(questionTransitionReducer(phase, event), `${phase}+${event}`).toBe(phase);
    }
  });

  test("QT5. 전환 시간은 standard page 300 · reduced d2 100이고 토큰에서 읽은 값과 같다", () => {
    expect(questionTransitionDurationMs("standard")).toBe(300);
    expect(questionTransitionDurationMs("reduced")).toBe(100);
    expect(questionTransitionDurationMs("standard")).toBe(motionDurationMs(motion.duration.page));
    expect(questionTransitionDurationMs("reduced")).toBe(motionDurationMs(motion.duration.d2));
  });

  test("QT6. primed · entering은 phase 클래스를 붙이고 reduced는 reduced 토큰을 더한다", () => {
    expect(questionTransitionClassName("learning-shell-stage", [], "entering", "standard")).toBe(
      "learning-shell-stage learning-shell-stage-page-entering",
    );
    expect(questionTransitionClassName("learning-shell-stage", [], "primed", "reduced")).toBe(
      "learning-shell-stage learning-shell-stage-page-primed learning-shell-stage-motion-reduced",
    );
    expect(
      questionTransitionClassName(
        "learning-shell-scroll",
        ["learning-shell-card-scroll"],
        "entering",
        "reduced",
      ),
    ).toBe(
      "learning-shell-scroll learning-shell-card-scroll learning-shell-scroll-page-entering learning-shell-scroll-motion-reduced",
    );
  });
});

// 이 describe는 ui 계층 소유입니다(CSS 텍스트 — 파일을 읽어 정규식으로 봅니다). unit 명령(`*.unit.test.ts`)으로 돌 뿐입니다.
describe("learning-shell.css", () => {
  const raw = readFileSync(
    resolve(process.cwd(), "src/screens/learning/learning-shell.css"),
    "utf8",
  );
  const css = raw.replace(/\/\*[\s\S]*?\*\//g, "");

  type Rule = { readonly selectors: readonly string[]; readonly body: string; readonly at: number };

  /** 최상위 규칙을 순서대로 읽습니다(선택자 목록은 쉼표로 나눠 공백을 접습니다). */
  const rules: readonly Rule[] = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => ({
    selectors: (match[1] ?? "")
      .split(",")
      .map((selector) => selector.replace(/\s+/g, " ").trim())
      .filter((selector) => selector !== ""),
    body: match[2] ?? "",
    at: match.index ?? 0,
  }));

  /** 선택자 목록이 정확히 `selectors`인 규칙. 없으면 본문이 빈 규칙이라 단언이 값 불일치로 실패합니다. */
  const ruleFor = (...selectors: string[]): Rule =>
    rules.find(
      (rule) =>
        rule.selectors.length === selectors.length &&
        selectors.every((selector) => rule.selectors.includes(selector)),
    ) ?? { selectors: [], body: "", at: -1 };

  const standardPrimed = () =>
    ruleFor(".learning-shell-stage-page-primed", ".learning-shell-scroll-page-primed");
  const standardEntering = () =>
    ruleFor(".learning-shell-stage-page-entering", ".learning-shell-scroll-page-entering");
  const reducedPrimed = () =>
    ruleFor(
      ".learning-shell-stage-motion-reduced.learning-shell-stage-page-primed",
      ".learning-shell-scroll-motion-reduced.learning-shell-scroll-page-primed",
    );
  const reducedEntering = () =>
    ruleFor(
      ".learning-shell-stage-motion-reduced.learning-shell-stage-page-entering",
      ".learning-shell-scroll-motion-reduced.learning-shell-scroll-page-entering",
    );

  test("LST-css1. primed는 두 요소가 한 규칙에서 투명 · 오른쪽 · transition 없음이다", () => {
    const { body } = standardPrimed();
    expect(body).toMatch(/opacity:\s*0/);
    expect(body).toMatch(/transform:\s*translateX\(var\(--libitum-spacing-16\)\)/);
    expect(body).toMatch(/transition:\s*none/);
  });

  test("LST-css2. entering은 두 요소가 한 규칙에서 불투명 · 제자리 · page · enter로 전환한다", () => {
    const { body } = standardEntering();
    expect(body).toMatch(/opacity:\s*1/);
    expect(body).toMatch(/transform:\s*translateX\(0\)/);
    expect(body).toMatch(
      /transition:\s*opacity\s+var\(--libitum-motion-duration-page\)\s+var\(--libitum-motion-easing-enter\)\s*,\s*transform\s+var\(--libitum-motion-duration-page\)\s+var\(--libitum-motion-easing-enter\)/,
    );
  });

  test("LST-css3. reduced는 이동을 없애고 entering은 opacity만 d2 · linear로 전환한다", () => {
    expect(reducedPrimed().body).toMatch(/transform:\s*none/);
    const { body } = reducedEntering();
    expect(body).toMatch(/transform:\s*none/);
    expect(body).toMatch(
      /transition:\s*opacity\s+var\(--libitum-motion-duration-d2\)\s+var\(--libitum-motion-easing-linear\)/,
    );
    expect(body).not.toMatch(/transform\s+var\(/);
  });

  test("LST-css4. reduced 규칙은 같은 단계의 standard 규칙보다 뒤에 있다", () => {
    expect(standardPrimed().at).toBeGreaterThanOrEqual(0);
    expect(standardEntering().at).toBeGreaterThanOrEqual(0);
    expect(reducedPrimed().at).toBeGreaterThan(standardPrimed().at);
    expect(reducedEntering().at).toBeGreaterThan(standardEntering().at);
  });

  // 파일에 전환이 아직 없는 logic-scaffold에서도 green인 가드입니다.
  test("LST-css5. 정적 블록에 opacity · transition이 없고 @media · 시간 리터럴이 없다", () => {
    for (const selector of [
      ".learning-shell-stage",
      ".learning-shell-scroll",
      ".learning-shell-card-scroll",
    ]) {
      const rule = ruleFor(selector);
      expect(rule.at, selector).toBeGreaterThanOrEqual(0);
      expect(rule.body, selector).not.toMatch(/opacity|transition|animation/);
    }
    expect(raw).not.toMatch(/@media/);
    expect(raw).not.toMatch(/\d+ms/);
  });

  test("LSP-css1. 진행 바 채움은 progress 시간 · enter easing으로 너비를 전환한다", () => {
    const { body } = ruleFor(".learning-shell-progress-fill");
    expect(body).toMatch(
      /transition:\s*width var\(--libitum-motion-duration-progress\)\s+var\(--libitum-motion-easing-enter\)/,
    );
  });

  test("LSP-css2. reduced 채움은 transition none이고 base 규칙보다 뒤에 있다", () => {
    const base = ruleFor(".learning-shell-progress-fill");
    const reduced = ruleFor(".learning-shell-progress-fill-motion-reduced");
    expect(reduced.body).toMatch(/transition:\s*none/);
    expect(base.at).toBeGreaterThanOrEqual(0);
    expect(reduced.at).toBeGreaterThan(base.at);
  });
});
