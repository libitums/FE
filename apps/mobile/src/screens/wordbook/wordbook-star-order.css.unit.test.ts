import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { expect, test } from "vitest";

// `unit` 계층: 별 단추의 낭독 순서를 지키는 CSS(ADR-0169 즐겨찾기 개정 · 접근성 점검 C1 · M2). VoiceOver는 DOM이 아니라 프레임 위치로
// 돌므로(ADR-0016 · ADR-0023), 카드의 별은 흐름 안(절대 배치 아님)이어야 하고, 단어장 줄의 재생 · 별은 교차 크기가 같아야(44) 위치 순서가
// 뒤집히지 않습니다. CSS 선언만 봅니다(선례: letters-screen.css.unit.test.ts).

const bodyOf = (path: string, selector: string): string => {
  const css = readFileSync(resolve(process.cwd(), path), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter((match) => (match[1] ?? "").trim() === selector)
    .map((match) => (match[2] ?? "").replace(/\s+/g, " "))
    .join(" ");
};

test("SO-U1. 카드의 별 자리는 절대 배치가 아니다(보이는 순서 = 낭독 순서)", () => {
  const star = bodyOf(
    "src/screens/vocab-card/vocab-card-activity.css",
    ".vocab-card-activity-star",
  );
  expect(star).not.toBe("");
  expect(star).not.toMatch(/position:\s*absolute/);
});

test("SO-U2. 단어장 줄의 재생 단추는 별 단추와 같은 44 × 44(교차축 위치가 같아 순서가 뒤집히지 않음)", () => {
  const play = bodyOf("src/screens/wordbook/wordbook-screen.css", ".wordbook-play");
  const star = bodyOf("src/components/word-star-button.css", ".word-star-button");
  expect(play).toMatch(/width:\s*44px/);
  expect(play).toMatch(/height:\s*44px/);
  expect(star).toMatch(/width:\s*44px/);
  expect(star).toMatch(/height:\s*44px/);
});
