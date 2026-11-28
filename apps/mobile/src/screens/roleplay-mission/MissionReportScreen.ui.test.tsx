import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render } from "@lynx-js/react/testing-library";

import { missionReportFixture } from "./mission-fixture";
import { MissionPreviewScreen } from "./MissionPreviewScreen";
import { MissionReportScreen } from "./MissionReportScreen";
import { cafeCard, id, insets, maybe, tapButton, tapRound } from "./mission-ui.test-support";
import type { MissionReport, MissionStartRejection } from "./roleplay-mission.contract";

// `ui` 계층(MR-UI1 ~ · MP-UI1 ~): 리포트(부록 B + 2026-11-23 새 구역) · 채점 실패 · 미리보기(값 · 거절 · 시작)를 실제 컴포넌트로 본다.

afterEach(() => {
  cleanup();
});

function mountReport(
  report: MissionReport | null,
  gradingFailure: { refunded: boolean; retryable: boolean } | null = null,
  grading = false,
) {
  const handlers = {
    onRetryGrading: vi.fn<() => void>(),
    onPlayAgain: vi.fn<() => void>(),
    onExit: vi.fn<() => void>(),
  };
  render(
    <MissionReportScreen
      insets={insets}
      card={cafeCard}
      report={report}
      gradingFailure={gradingFailure}
      grading={grading}
      {...handlers}
    />,
  );
  return handlers;
}

test("MR-UI1 부록 B 리포트 — 성공 · 73점 · 최고 기록, 목표 3/4 · 표현 1/2 · 정확도 · 힌트, 고친 문장 · 다시 해 볼 표현 · 총평", () => {
  mountReport(missionReportFixture);
  expect(id("roleplay-mission-report-outcome")).toHaveTextContent("Mission complete");
  expect(id("roleplay-mission-report-outcome")).toHaveAttribute("data-outcome", "success");
  expect(id("roleplay-mission-report-score")).toHaveTextContent("73 points");
  expect(id("roleplay-mission-report-best")).toHaveTextContent("Your best: 73");
  expect(id("roleplay-mission-report")).toHaveTextContent("Goals · 3 / 4");
  expect(id("roleplay-mission-report-goal-order")).toHaveAttribute(
    "accessibility-label",
    "Order a drink, Done",
  );
  expect(id("roleplay-mission-report-goal-price")).toHaveAttribute(
    "accessibility-label",
    "Ask how much it is, Not done",
  );
  expect(id("roleplay-mission-report")).toHaveTextContent("Target expressions · 1 / 2");
  expect(id("roleplay-mission-report-expression-patt:fbe5e354")).toHaveAttribute(
    "accessibility-label",
    "___ 얼마예요?, Not used",
  );
  expect(id("roleplay-mission-report-accuracy")).toHaveTextContent("85");
  expect(id("roleplay-mission-report-hints")).toHaveTextContent("0 hints");
  // 계약 fixture의 교정은 더 나은 표현 하나뿐 — 「Sounds more natural」에 서고 고친 문장 구역은 없다.
  expect(id("roleplay-mission-report-better")).toHaveTextContent("Sounds more natural");
  expect(id("roleplay-mission-report-better")).toHaveTextContent("포장이요");
  expect(maybe("roleplay-mission-report-corrections")).not.toBeInTheDocument();
  expect(id("roleplay-mission-report-retry")).toHaveTextContent("아메리카노 얼마예요?");
  expect(id("roleplay-mission-report-summary")).toHaveTextContent(
    "Next time, try asking the price with 얼마예요.",
  );
});

test("MR-UI1b 새 구역 — 결과 한 줄 · You could have said · 점수 항 · 잘한 점 · Key corrections · Next challenge", () => {
  mountReport(missionReportFixture);
  expect(id("roleplay-mission-report-headline")).toHaveTextContent(
    "You ordered and paid — mission complete!",
  );
  expect(id("roleplay-mission-report-tips")).toHaveTextContent("You could have said");
  expect(id("roleplay-mission-report-tips")).toHaveTextContent("Ask how much it is");
  expect(id("roleplay-mission-report-tips")).toHaveTextContent("아메리카노 얼마예요?");
  expect(id("roleplay-mission-report-score-parts")).toHaveTextContent("How your score adds up");
  // 정수로 반올림하되 합이 총점(73)과 맞게 — 37.5 · 25.5 · 10 → 38 · 25 · 10(QA 14).
  expect(id("roleplay-mission-report-score-parts")).toHaveTextContent("Goals+38");
  expect(id("roleplay-mission-report-score-parts")).toHaveTextContent("Accuracy+25");
  expect(id("roleplay-mission-report-score-parts")).toHaveTextContent("Target expressions+10");
  expect(id("roleplay-mission-report-score-parts")).not.toHaveTextContent("Hints");
  expect(id("roleplay-mission-report-strengths")).toHaveTextContent("What went well");
  expect(id("roleplay-mission-report-strengths")).toHaveTextContent(
    "A complete, polite order using the target pattern.",
  );
  expect(id("roleplay-mission-report-focus")).toHaveTextContent("Key corrections");
  expect(id("roleplay-mission-report-next-step")).toHaveTextContent(
    "Next challengePlay again and ask how much your drink is.",
  );
});

test("MR-UI1c 힌트 감점은 있을 때만, 고친 문장 구역은 고치기 중 Key corrections에 없는 것만", () => {
  mountReport({
    ...missionReportFixture,
    scoreParts: { task: 25, accuracy: 25.5, expression: 0, hintPenalty: 10 },
    corrections: [
      { original: "카드으로 할게요", corrected: "카드로 할게요", kind: "correction" },
      { original: "물 주세요요", corrected: "물 주세요", kind: "correction" },
      { original: "가지고 가요", corrected: "포장이요", kind: "better" },
    ],
    focus: [
      {
        examples: [{ original: "카드으로 할게요", corrected: "카드로 할게요" }],
        reason: "After a vowel, use 로.",
      },
    ],
  });
  expect(id("roleplay-mission-report-score-parts")).toHaveTextContent("Hints\u221210");
  expect(id("roleplay-mission-report-focus")).toHaveTextContent("카드로 할게요");
  expect(id("roleplay-mission-report-corrections")).toHaveTextContent("물 주세요");
  expect(id("roleplay-mission-report-corrections")).not.toHaveTextContent("카드로 할게요");
  expect(id("roleplay-mission-report-corrections")).not.toHaveTextContent("포장이요");
  expect(id("roleplay-mission-report-better")).toHaveTextContent("포장이요");
});

test("MR-UI1d 옛 결과 행(새 칸 없음)은 새 구역을 그리지 않는다", () => {
  const {
    scoreParts: _parts,
    headline: _headline,
    focus: _focus,
    strengths: _strengths,
    nextStep: _next,
    ...old
  } = missionReportFixture;
  mountReport({ ...old, goals: old.goals.map(({ tip: _tip, ...goal }) => goal) });
  for (const section of ["headline", "tips", "score-parts", "strengths", "focus", "next-step"])
    expect(maybe(`roleplay-mission-report-${section}`)).not.toBeInTheDocument();
});

test("MR-UI2 실패 리포트 · 고친 문장이 없으면 그 절이 없다", () => {
  mountReport({ ...missionReportFixture, outcome: "fail", corrections: [], retry: [] });
  expect(id("roleplay-mission-report-outcome")).toHaveTextContent("Mission failed");
  expect(maybe("roleplay-mission-report-corrections")).not.toBeInTheDocument();
  expect(maybe("roleplay-mission-report-retry")).not.toBeInTheDocument();
});

test("MR-UI3 다시 하기 · 목록으로", () => {
  const handlers = mountReport(missionReportFixture);
  tapButton("roleplay-mission-report-play-again");
  tapButton("roleplay-mission-report-exit");
  expect(handlers.onPlayAgain).toHaveBeenCalledTimes(1);
  expect(handlers.onExit).toHaveBeenCalledTimes(1);
});

test("MR-UI4 채점 실패 — 「채점하지 못했어요」 · 값을 돌려줬다는 안내 · 다시 시도", () => {
  const handlers = mountReport(null, { refunded: true, retryable: true });
  expect(id("roleplay-mission-report-failed")).toHaveTextContent("We couldn't score this");
  expect(id("roleplay-mission-report-failed")).toHaveTextContent(
    "We gave back what you paid for this play.",
  );
  expect(maybe("roleplay-mission-report-play-again")).not.toBeInTheDocument();
  tapButton("roleplay-mission-report-retry-grading");
  expect(handlers.onRetryGrading).toHaveBeenCalledTimes(1);
});

test("MR-UI5 돌려주지 않은 실패(연결)는 환불 안내가 없고, 다시 채점 중이면 단추가 잠긴다", () => {
  mountReport(null, { refunded: false, retryable: true });
  expect(id("roleplay-mission-report-failed")).not.toHaveTextContent("We gave back");
  cleanup();
  const handlers = mountReport(null, null, true);
  expect(id("roleplay-mission-report-failed")).toHaveTextContent("Scoring your conversation…");
  tapButton("roleplay-mission-report-retry-grading");
  expect(handlers.onRetryGrading).not.toHaveBeenCalled();
});

function mountPreview(
  card = cafeCard,
  startError: MissionStartRejection | null = null,
  starting = false,
) {
  const onStart = vi.fn<() => void>();
  const onExit = vi.fn<() => void>();
  render(
    <MissionPreviewScreen
      insets={insets}
      card={card}
      starting={starting}
      startError={startError}
      onStart={onStart}
      onExit={onExit}
    />,
  );
  return { onStart, onExit };
}

test("MP-UI1 미리보기 — 제목 · 에피소드 · 최고 기록, 알약(상대역 · 턴 · 목표 수), 목표 목록, 엽전 정액 · 잔액", () => {
  mountPreview();
  expect(id("roleplay-mission-preview-title")).toHaveTextContent("Order a coffee");
  expect(id("roleplay-mission-preview")).toHaveTextContent("Episode 6. · Mission · Best 73");
  expect(id("roleplay-mission-preview-chips")).toHaveTextContent("with 카페 직원");
  expect(id("roleplay-mission-preview-chips")).toHaveTextContent("10 turns");
  expect(id("roleplay-mission-preview-chips")).toHaveTextContent("4 goals");
  expect(id("roleplay-mission-preview-goals")).toHaveTextContent("Say how you'll pay");
  expect(id("roleplay-mission-preview-price")).toHaveTextContent("5 Yeopjeon · You have 42");
});

test("MP-UI2 무료가 남았으면 무료 줄 · 시작과 나가기", () => {
  const handlers = mountPreview({ ...cafeCard, price: { freeLeft: 1, cost: 5, balance: 0 } });
  expect(id("roleplay-mission-preview-price")).toHaveTextContent("Free today · 1 left");
  tapButton("roleplay-mission-preview-start");
  tapRound("roleplay-mission-preview-back");
  expect(handlers.onStart).toHaveBeenCalledTimes(1);
  expect(handlers.onExit).toHaveBeenCalledTimes(1);
});

test("MP-UI3 시작 거절(엽전 부족)이면 까닭이 서고, 시작 중이면 단추가 시작 중", () => {
  mountPreview(cafeCard, "insufficient_credits");
  expect(id("roleplay-mission-preview-error")).toHaveTextContent("You don't have enough Yeopjeon");
  cleanup();
  mountPreview(cafeCard, null, true);
  expect(id("roleplay-mission-preview-start")).toHaveTextContent("Starting…");
});
