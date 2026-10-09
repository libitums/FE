import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { motion } from "@libitums/design-tokens";
import { describe, expect, test } from "vitest";

import { rewardBadgeClassName, rewardMotionFor } from "./lesson-complete-reward";

// `unit` 계층: 순수 함수의 입출력만 봅니다 (ADR-0006 D4).
describe("rewardMotionFor", () => {
  test("RW1. 통과 + standard는 expressive다", () => {
    expect(rewardMotionFor("passed", "standard")).toBe("expressive");
  });

  test("RW2. 통과 + reduced는 fade다", () => {
    expect(rewardMotionFor("passed", "reduced")).toBe("fade");
  });

  // 스텁이 늘 "none"이라 logic-scaffold에서는 green인 가드입니다. 구현 뒤 변이(failed → fade)로 red가 됩니다.
  test("RW3. 미통과는 움직임 정책과 무관하게 none이다", () => {
    expect(rewardMotionFor("failed", "standard")).toBe("none");
    expect(rewardMotionFor("failed", "reduced")).toBe("none");
  });
});

describe("rewardBadgeClassName", () => {
  test("RB1. 통과 보상 클래스는 base + 보상 변형 전체 문자열이다", () => {
    expect(rewardBadgeClassName("passed", "expressive")).toBe(
      "lesson-complete-screen-badge lesson-complete-screen-badge-motion-reward",
    );
    expect(rewardBadgeClassName("passed", "fade")).toBe(
      "lesson-complete-screen-badge lesson-complete-screen-badge-motion-fade",
    );
  });

  // 스텁이 verdict 변형만 내므로 logic-scaffold에서는 green인 가드입니다.
  test("RB2. 보상이 없으면 지금 화면의 클래스와 byte 같다", () => {
    expect(rewardBadgeClassName("failed", "none")).toBe(
      "lesson-complete-screen-badge lesson-complete-screen-badge-failed",
    );
    expect(rewardBadgeClassName("passed", "none")).toBe("lesson-complete-screen-badge");
  });
});

// 이 describe는 ui 계층 소유입니다(CSS 텍스트 — 파일을 읽어 정규식으로 봅니다). unit 명령(`*.unit.test.ts`)으로 돌 뿐입니다.
describe("lesson-complete-screen.css", () => {
  const raw = readFileSync(
    resolve(process.cwd(), "src/screens/lesson-complete/lesson-complete-screen.css"),
    "utf8",
  );
  const css = raw.replace(/\/\*[\s\S]*?\*\//g, "");

  /** `@keyframes name { from { … } to { … } }`의 한쪽 끝 본문. 없으면 빈 문자열이라 단언이 값 불일치로 실패합니다. */
  const keyframe = (name: string, edge: "from" | "to"): string =>
    new RegExp(`@keyframes\\s+${name}\\s*\\{[\\s\\S]*?${edge}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ??
    "";

  /** 선택자 정규식에 맞는 첫 규칙의 본문. */
  const ruleBody = (selector: RegExp): string =>
    new RegExp(`(?:^|[}/])\\s*${selector.source}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? "";

  const declarations = (body: string): string[] =>
    body
      .split(";")
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter((line) => line !== "");

  test("LCR-css1. 보상 keyframe은 opacity 0 · scale 축소에서 opacity 1 · scale(1)로 간다", () => {
    const from = keyframe("lesson-complete-screen-badge-reward", "from");
    const to = keyframe("lesson-complete-screen-badge-reward", "to");
    expect(from).toMatch(/opacity:\s*0/);
    expect(from).toMatch(/transform:\s*scale\(([\d.]+)\)/);
    expect(to).toMatch(/opacity:\s*1/);
    expect(to).toMatch(/transform:\s*scale\(1\)/);
  });

  test("LCR-css2. from의 scale은 motion.scale.reward이고 scale 리터럴은 그것 하나뿐이다", () => {
    const from = keyframe("lesson-complete-screen-badge-reward", "from");
    expect(Number(/scale\(([\d.]+)\)/.exec(from)?.[1] ?? Number.NaN)).toBe(motion.scale.reward);
    const literals = (css.match(/scale\(([\d.]+)\)/g) ?? []).filter(
      (literal) => literal !== "scale(1)",
    );
    expect(literals).toHaveLength(1);
  });

  test("LCR-css3. -motion-reward는 reward 시간 · enter-expressive easing으로 both 재생한다", () => {
    expect(css).toMatch(
      /\.lesson-complete-screen-badge-motion-reward\s*\{[^}]*animation:\s*lesson-complete-screen-badge-reward\s+var\(--libitum-motion-duration-reward\)\s+var\(--libitum-motion-easing-enter-expressive\)\s+both/,
    );
  });

  test("LCR-css4. fade는 opacity만 0 → 1이고 d2 · linear로 재생한다", () => {
    const from = keyframe("lesson-complete-screen-badge-fade", "from");
    const to = keyframe("lesson-complete-screen-badge-fade", "to");
    expect(from).toMatch(/opacity:\s*0/);
    expect(to).toMatch(/opacity:\s*1/);
    expect(from).not.toMatch(/transform/);
    expect(to).not.toMatch(/transform/);
    expect(css).toMatch(
      /\.lesson-complete-screen-badge-motion-fade\s*\{[^}]*animation:\s*lesson-complete-screen-badge-fade\s+var\(--libitum-motion-duration-d2\)\s+var\(--libitum-motion-easing-linear\)\s+both/,
    );
  });

  // 파일에 아직 모션이 없는 logic-scaffold에서도 green인 가드입니다(lint:motion과 같은 뜻의 로컬 가드).
  test("LCR-css5. exit-expressive · @media · 시간 리터럴이 없다", () => {
    expect(raw).not.toContain("exit-expressive");
    expect(raw).not.toMatch(/@media/);
    expect(raw).not.toMatch(/\d+ms/);
  });

  // 정적 블록 byte 불변 가드: 선언 목록이 지금과 같고 animation · opacity가 없다.
  test("LCR-css6. 정적 배지 블록과 -failed 블록은 그대로다", () => {
    const base = ruleBody(/\.lesson-complete-screen-badge/);
    expect(declarations(base)).toEqual([
      "width: 126px",
      "height: 126px",
      "display: flex",
      "align-items: center",
      "justify-content: center",
      "border: 3px solid var(--libitum-color-feedback-correct-surface)",
      "border-radius: var(--libitum-radius-full)",
      "background-color: var(--libitum-color-feedback-correct)",
      "flex-shrink: 0",
    ]);
    const failed = ruleBody(/\.lesson-complete-screen-badge-failed/);
    expect(declarations(failed)).toEqual([
      "border-color: var(--libitum-color-feedback-incorrect-surface)",
      "background-color: var(--libitum-color-feedback-incorrect)",
    ]);
    expect(base + failed).not.toMatch(/animation|opacity/);
  });
});
