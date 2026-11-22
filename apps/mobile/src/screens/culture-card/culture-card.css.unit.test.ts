import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

// `unit` 계층: 문화 카드 CSS 텍스트의 높이 규칙만 봅니다(선례: learning-shell.css.unit.test.ts).
//
// QA 2026-11-20(위키 QA-2026-11-20-iOS-1.2.0 1번): 뒷면 본문 · In Korean 상자가 아래가 잘리고 스크롤되지 않았습니다.
// 뒷면이 `flex: 1`(기준 크기 0)이라 카드 높이가 내용이 아니라 하한(384)에 머물렀고, 그 안에서 글줄이 줄어들어 잘렸습니다.
// 카드는 내용 높이 이상으로 자라고(넘치면 셸의 카드 스크롤이 집니다), 덱 · 카드가 남는 세로를 받아 큰 화면에 빈 띠가
// 남지 않아야 합니다.

const dir = resolve(process.cwd(), "src/screens/culture-card");

const readCss = (file: string): string => {
  const path = resolve(dir, file);
  if (!existsSync(path)) return "";
  return readFileSync(path, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
};

const bodyOf = (css: string, selector: string): string =>
  [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter((match) => (match[1] ?? "").trim() === selector)
    .map((match) => (match[2] ?? "").replace(/\s+/g, " "))
    .join(" ");

describe("문화 카드 높이 (CC-CSS1 ~ 3)", () => {
  const activity = readCss("culture-card-activity.css");
  const face = readCss("culture-card-face.css");

  test("CC-CSS1. 뒷면은 기준 크기 0의 `flex: 1`이 아니라 내용 높이에서 자란다(`flex-grow: 1`)", () => {
    const back = bodyOf(face, ".culture-card-activity-back");
    expect(back).not.toMatch(/(^|[ ;])flex: 1;/);
    expect(back).toContain("flex-grow: 1;");
  });

  test("CC-CSS2. 본문 · 한국어 상자는 줄어들지 않는다 — 넘치면 잘리지 않고 스크롤이 진다", () => {
    expect(bodyOf(face, ".culture-card-activity-body")).toContain("flex-shrink: 0;");
    expect(bodyOf(face, ".culture-card-activity-korean")).toContain("flex-shrink: 0;");
  });

  test.each([
    ".culture-card-activity-content",
    ".culture-card-activity-deck",
    ".culture-card-activity-face",
  ])("CC-CSS3. %s는 남는 세로를 받는다(flex-grow: 1)", (selector) => {
    expect(bodyOf(activity, selector)).toContain("flex-grow: 1;");
  });
});
