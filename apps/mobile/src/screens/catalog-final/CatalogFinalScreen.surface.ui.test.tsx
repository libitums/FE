import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import type { AnswerResult } from "../../lib/answer-result";
import { backHandlers } from "../../lib/back-handler";
import { CatalogFinalScreen } from "./CatalogFinalScreen";
import type { CatalogRoleplayTurn, CatalogRoleplayTurns } from "./catalog-final.contract";

// `ui` 계층: 어두운 반투명 면 — 화면이 대사 패널을 translucent로, 판 안 다섯 자리에 dark를 실제
// 부품에 넘기는지 `data-surface` 속성으로 봅니다(클래스 · 계산 스타일은 보지 않습니다).

const insets = { top: 0, bottom: 0, left: 0, right: 0 };

const turnOne: CatalogRoleplayTurn = {
  id: "RP-01",
  instruction: "What do you say?",
  line: { ko: "봉투 드릴까요?", roman: "bongtu deurilkkayo?", en: "Would you like a bag?" },
  tiles: [
    { ko: "괜찮아요.", roman: "gwaenchanayo." },
    { ko: "아니요,", roman: "aniyo," },
  ],
  accepted: ["아니요, 괜찮아요."],
  replyTranslation: "No, I'm fine.",
  imageUrl: null,
};
const turnTwo: CatalogRoleplayTurn = {
  id: "RP-02",
  instruction: "What do you say?",
  line: { ko: "삼천 원입니다.", roman: "samcheon woninnida.", en: "That's three thousand won." },
  tiles: [
    { ko: "할게요.", roman: "halgeyo." },
    { ko: "카드로", roman: "kadeuro" },
  ],
  accepted: ["카드로 할게요."],
  replyTranslation: "I'll pay by card.",
  imageUrl: null,
};
const turns: CatalogRoleplayTurns = [turnOne, turnTwo];
const wrongOrder = [0, 1] as const;

function mount() {
  render(
    <CatalogFinalScreen
      insets={insets}
      ordinal={1}
      counterpartName="편의점 점원"
      turns={turns}
      onFinish={vi.fn<(results: readonly AnswerResult[]) => void>()}
      onExit={vi.fn<() => void>()}
    />,
  );
}

const chip = (index: number) => screen.getByTestId(`sentence-order-chip-${index}`);
const actionButton = () =>
  within(screen.getByTestId("catalog-final-screen-action")).getByTestId("ui-lynx-button");
const reply = () => screen.getByTestId("catalog-final-screen-reply");
const bank = () => screen.getByTestId("catalog-final-screen-bank");

function place(order: readonly number[]): void {
  for (const tileIndex of order) {
    fireEvent.tap(chip(tileIndex), {});
  }
}

afterEach(() => {
  cleanup();
  if (backHandlers.runTop()) {
    throw new Error("뒤로가기 핸들러가 정리되지 않았습니다");
  }
});

describe("CatalogFinalScreen 어두운 면", () => {
  test("FDU1. 상대 대사 패널이 translucent 면이고 접근성 이름은 그대로다", () => {
    mount();

    const line = screen.getByTestId("catalog-final-screen-line");
    expect(within(line).getByTestId("ui-lynx-visual-novel-dialog")).toHaveAttribute(
      "data-surface",
      "translucent",
    );
    expect(line).toHaveAttribute(
      "accessibility-label",
      "편의점 점원: 봉투 드릴까요? Would you like a bag?",
    );
  });

  test("FDU2. 창고 칩 · 놓인 칩 · 빈칸 · 판정 · 정답 표시가 모두 dark 면을 받는다", () => {
    mount();

    expect(chip(0)).toHaveAttribute("data-surface", "dark");
    expect(chip(1)).toHaveAttribute("data-surface", "dark");

    fireEvent.tap(chip(1), {});
    expect(within(reply()).getByTestId("sentence-order-chip-1")).toHaveAttribute(
      "data-surface",
      "dark",
    );
    expect(within(bank()).getByTestId("sentence-order-bank-slot-1")).toHaveAttribute(
      "data-surface",
      "dark",
    );
    expect(within(bank()).getByTestId("sentence-order-chip-0")).toHaveAttribute(
      "data-surface",
      "dark",
    );

    fireEvent.tap(chip(0), {});
    fireEvent.tap(actionButton(), {});
    const correct = within(screen.getByTestId("catalog-final-screen-verdict")).getByTestId(
      "answer-verdict",
    );
    expect(correct).toHaveAttribute("data-result", "correct");
    expect(correct).toHaveAttribute("data-surface", "dark");

    fireEvent.tap(actionButton(), {});
    place(wrongOrder);
    fireEvent.tap(actionButton(), {});
    const incorrect = within(screen.getByTestId("catalog-final-screen-verdict")).getByTestId(
      "answer-verdict",
    );
    expect(incorrect).toHaveAttribute("data-result", "incorrect");
    expect(incorrect).toHaveAttribute("data-surface", "dark");
    expect(screen.getByTestId("catalog-final-screen-answer")).toHaveAttribute(
      "data-surface",
      "dark",
    );
  });
});
