import { afterEach, expect, test } from "vitest";
import { cleanup, render } from "@lynx-js/react/testing-library";

import { MissionFeedbackCard } from "./MissionFeedbackCard";
import { id, maybe } from "./mission-ui.test-support";

// `ui` 계층(MT-UI15 ~): 미션 턴의 교정 카드 — 대본형 롤플레이 판정 패널과 같은 말(ADR-0201 D6 적용 2)인가.
// 고치기는 ✕ · FIX · 고친 문장이 주인공(바뀐 낱말 밑줄), 영어로만 말한 글은 IN KOREAN · 밑줄 없음, 더 나은 표현은 ✓ · MORE NATURAL.

afterEach(cleanup);

const base = { changes: [], items: [], better: null, meaning: null };

test("MT-UI15 고치기 카드 — 대본형 오답처럼 고친 문장이 주인공(바뀐 낱말 밑줄), 제목 FIX, 고친 곳 한 줄", () => {
  render(
    <MissionFeedbackCard
      original="카드으로 할게요"
      correction={{
        ...base,
        kind: "correction",
        corrected: "카드로 할게요",
        items: [{ original: "카드으로", corrected: "카드로", reason: "Use 로 after a vowel." }],
      }}
    />,
  );
  expect(id("roleplay-mission-fix-card")).toHaveAttribute("data-kind", "correction");
  expect(id("roleplay-mission-fix-card-title")).toHaveTextContent("FIX");
  expect(id("roleplay-mission-fix-card-answer-ko")).toHaveTextContent("카드로 할게요");
  const differs = id("roleplay-mission-fix-card-answer-ko").querySelectorAll(
    '[data-differs="true"]',
  );
  expect([...differs].map((node) => node.textContent)).toEqual(["카드로"]);
  expect(id("roleplay-mission-fix-card-note")).toHaveTextContent(
    "카드으로 → 카드로 · Use 로 after a vowel.",
  );
  expect(maybe("roleplay-mission-better-card")).not.toBeInTheDocument();
});

test("MT-UI16 영어로만 말한 글(l1_to_ko)은 IN KOREAN — 견줄 낱말이 없어 밑줄 없이 한국어 · 로마자 · 뜻", () => {
  render(
    <MissionFeedbackCard
      original="one water please"
      correction={{
        ...base,
        kind: "l1_to_ko",
        corrected: "물 하나 주세요",
        meaning: "One water, please.",
      }}
    />,
  );
  expect(id("roleplay-mission-fix-card")).toHaveAttribute("data-kind", "l1_to_ko");
  expect(id("roleplay-mission-fix-card-title")).toHaveTextContent("IN KOREAN");
  expect(
    id("roleplay-mission-fix-card-answer-ko").querySelectorAll('[data-differs="true"]'),
  ).toHaveLength(0);
  expect(id("roleplay-mission-fix-card-answer-meaning")).toHaveTextContent("One water, please.");
  expect(id("roleplay-mission-fix-card")).toHaveTextContent("mul hana juseyo");
});
