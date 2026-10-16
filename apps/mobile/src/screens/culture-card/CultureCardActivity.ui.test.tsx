import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import type { AnswerResult } from "../../lib/answer-result";
import type { LessonPosition } from "../learning/activity-finish";
import { CultureCardActivity } from "./CultureCardActivity";
import type { CultureCardQuestion } from "./culture-card.contract";

// `ui` 계층: 문화 카드 활동 — 카드를 한 장씩 보이고 넘기며, 판정 없이 빈 결과를 한 번 올린다.
// 카드는 매핑 모듈이 내는 꼴로 손으로 세웠다(매핑 계산은 unit이 진다). 로마자는 제목에만 선다.

// 모든 필드가 찬 카드입니다.
const full: CultureCardQuestion = {
  title: "편의점 봉투",
  titleTranslation: "Convenience store bags",
  titleRomanization: "pyeonuijeom bongtu",
  body: "In Korea, shops charge a small fee for plastic bags, so many people bring their own.",
  koreanBody: "한국에서는 비닐봉투가 유료라서 장바구니를 챙겨 다니는 사람이 많아요.",
};

// 영어 제목 · 제목 로마자 · 한국어 본문이 없는 카드입니다.
const sparse: CultureCardQuestion = {
  title: "분리배출",
  titleTranslation: null,
  titleRomanization: null,
  body: "Trash is sorted into several bins before it is put out.",
  koreanBody: null,
};

const two = [full, sparse] as const;

type Finish = (results: readonly AnswerResult[], skippedCount: number) => void;

function mount(questions: readonly CultureCardQuestion[], lesson?: LessonPosition) {
  const onFinish = vi.fn<Finish>();
  const onExit = vi.fn<() => void>();
  render(
    <CultureCardActivity
      questions={questions}
      gemCount={0}
      onExit={onExit}
      onFinish={onFinish}
      lesson={lesson}
    />,
  );
  return { onFinish, onExit };
}

const id = (testId: string) => screen.getByTestId(testId);
const maybe = (testId: string) => screen.queryByTestId(testId);
const tapAction = (): void => void fireEvent.tap(id("learning-shell-action"), {});
const actionLabel = () => id("learning-shell-action").getAttribute("accessibility-label");

// a가 b보다 앞에 서는가(DOM 순서 = 낭독 순서).
const precedes = (a: string, b: string): boolean =>
  (id(a).compareDocumentPosition(id(b)) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;

describe("CultureCardActivity", () => {
  test("UCC1. 첫 카드는 한국어 제목 · 영어 제목 · 영어 본문 · 한국어 상자 · 제목 로마자 · 표식을 보이고 머리 라벨 · 지시문 · 카운터가 서며 판정 배지가 없다", () => {
    mount(two);

    expect(id("culture-card-title")).toHaveTextContent("편의점 봉투");
    expect(id("culture-card-title-translation")).toHaveTextContent("Convenience store bags");
    expect(id("culture-card-body")).toHaveTextContent(full.body);
    expect(id("culture-card-title-romanization")).toHaveTextContent("pyeonuijeom bongtu");
    expect(id("culture-card-korean")).toBeInTheDocument();
    expect(id("culture-card-korean-text")).toHaveTextContent(full.koreanBody ?? "");
    expect(id("culture-card-badge")).toHaveTextContent("Culture");
    expect(id("learning-shell-instruction")).toHaveTextContent("Learn about life in Korea.");
    expect(id("learning-shell-form")).toHaveTextContent("Culture");
    expect(id("learning-shell-chapter")).toHaveTextContent("Lesson 1 / 2");
    expect(maybe("answer-verdict")).not.toBeInTheDocument();
    expect(maybe("learning-activity-complete")).not.toBeInTheDocument();
  });

  test("UCC1b. 본문 로마자 줄은 서지 않는다(로마자는 제목에만)", () => {
    mount(two);

    expect(maybe("culture-card-korean-romanization")).not.toBeInTheDocument();
  });

  test("UCC2. 영어 제목 · 한국어 본문이 없는 카드는 영어 제목 줄 · 한국어 상자 · 제목 로마자가 없다", () => {
    mount(two);

    tapAction();

    expect(id("culture-card-content")).toHaveAttribute("data-card-index", "1");
    expect(id("culture-card-title")).toHaveTextContent("분리배출");
    expect(id("culture-card-body")).toHaveTextContent(sparse.body);
    expect(maybe("culture-card-title-translation")).not.toBeInTheDocument();
    expect(maybe("culture-card-title-romanization")).not.toBeInTheDocument();
    expect(maybe("culture-card-korean")).not.toBeInTheDocument();
    expect(maybe("culture-card-korean-text")).not.toBeInTheDocument();
  });

  test("UCC3. Next가 다음 카드로 넘기고 마지막 카드의 버튼은 See results이며 연타해도 빈 결과가 한 번만 올라간다", () => {
    const { onFinish } = mount(two);

    expect(actionLabel()).toBe("Next");
    expect(id("culture-card-content")).toHaveAttribute("data-card-index", "0");
    tapAction();
    expect(id("culture-card-content")).toHaveAttribute("data-card-index", "1");
    expect(id("learning-shell-chapter")).toHaveTextContent("Lesson 2 / 2");
    expect(actionLabel()).toBe("See results");
    expect(onFinish).toHaveBeenCalledTimes(0);

    tapAction();
    tapAction();

    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledWith([], 0);
    expect(maybe("learning-activity-complete")).not.toBeInTheDocument();
  });

  test("UCC3b. 카드가 한 장이면 처음부터 See results이고 한 번 올라간다", () => {
    const { onFinish } = mount([full]);

    expect(actionLabel()).toBe("See results");
    tapAction();

    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledWith([], 0);
  });

  test("UCC4. 낭독 순서는 DOM 순서이고 한국어 소제목은 가려지며 제목 로마자만 발음 라벨을 지고 한국어 제목 · 본문은 라벨이 없다", () => {
    mount(two);

    expect(precedes("culture-card-badge", "culture-card-title")).toBe(true);
    expect(precedes("culture-card-title", "culture-card-title-translation")).toBe(true);
    expect(precedes("culture-card-title-translation", "culture-card-body")).toBe(true);
    expect(precedes("culture-card-body", "culture-card-korean-text")).toBe(true);
    expect(precedes("culture-card-korean-title", "culture-card-korean-text")).toBe(true);

    expect(id("culture-card-korean-title")).toHaveAttribute(
      "accessibility-elements-hidden",
      "true",
    );
    expect(id("culture-card-title-romanization")).toHaveAttribute(
      "accessibility-label",
      "Pronunciation: pyeonuijeom bongtu",
    );
    expect(id("culture-card-title")).not.toHaveAttribute("accessibility-label");
    expect(id("culture-card-korean-text")).not.toHaveAttribute("accessibility-label");
  });

  test("UCC5. 레슨 중간 활동은 카운터가 오프셋을 더하고 마지막 카드의 버튼이 Next이며 눌러 곧바로 빈 결과를 올린다", () => {
    const { onFinish } = mount(two, { offset: 4, total: 10, last: false });

    expect(id("learning-shell-chapter")).toHaveTextContent("Lesson 5 / 10");
    tapAction();
    expect(id("learning-shell-chapter")).toHaveTextContent("Lesson 6 / 10");
    expect(actionLabel()).toBe("Next");
    expect(onFinish).toHaveBeenCalledTimes(0);

    tapAction();

    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledWith([], 0);
  });

  test("UCC5b. 레슨의 마지막 활동이면 마지막 카드의 버튼이 See results다", () => {
    mount(two, { offset: 4, total: 6, last: true });

    tapAction();

    expect(actionLabel()).toBe("See results");
  });
});
