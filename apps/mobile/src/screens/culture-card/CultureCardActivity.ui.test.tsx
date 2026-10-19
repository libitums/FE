import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, within } from "@lynx-js/react/testing-library";
import type { ReactNode } from "@lynx-js/react";
import { MotionProvider } from "@libitums/ui-lynx/motion";

import type { AnswerResult } from "../../lib/answer-result";
import type { LessonPosition } from "../learning/activity-finish";
import { CultureCardActivity } from "./CultureCardActivity";
import type { CultureCardQuestion } from "./culture-card.contract";

// `ui` 계층: 문화 카드 활동(카드 덱 + 앞 · 뒤 뒤집기). 앞면은 사진(또는 브랜드 면) 위 제목, 뒷면은 본문이다.
// 카드나 아래 버튼이 뒤집고, 뒷면의 아래 버튼이 다음 카드로 넘기며, 판정 없이 빈 결과를 한 번 올린다.
// 카드는 매핑 모듈이 내는 꼴로 손으로 세웠다(매핑 계산은 unit이 진다).

// 모든 필드가 찬 카드입니다(그림 포함).
const full: CultureCardQuestion = {
  title: "편의점 봉투",
  titleTranslation: "Convenience store bags",
  titleRomanization: "pyeonuijeom bongtu",
  body: "In Korea, shops charge a small fee for plastic bags, so many people bring their own.",
  koreanBody: "한국에서는 비닐봉투가 유료라서 장바구니를 챙겨 다니는 사람이 많아요.",
  imageUrl: "https://cdn/content/images/u01-water/cult-1.jpg",
};

// 영어 제목 · 제목 로마자 · 한국어 본문 · 그림이 없는 카드입니다.
const sparse: CultureCardQuestion = {
  title: "분리배출",
  titleTranslation: null,
  titleRomanization: null,
  body: "Trash is sorted into several bins before it is put out.",
  koreanBody: null,
  imageUrl: null,
};

const two = [full, sparse] as const;

type Finish = (results: readonly AnswerResult[], skippedCount: number) => void;

function mount(
  questions: readonly CultureCardQuestion[],
  lesson?: LessonPosition,
  wrap: (node: ReactNode) => ReactNode = (node) => node,
) {
  const onFinish = vi.fn<Finish>();
  const onExit = vi.fn<() => void>();
  render(
    wrap(
      <CultureCardActivity
        questions={questions}
        gemCount={0}
        onExit={onExit}
        onFinish={onFinish}
        lesson={lesson}
      />,
    ),
  );
  return { onFinish, onExit };
}

const reduced = (node: ReactNode) => <MotionProvider motion="reduced">{node}</MotionProvider>;
const id = (testId: string) => screen.getByTestId(testId);
const maybe = (testId: string) => screen.queryByTestId(testId);
const tapAction = (): void => void fireEvent.tap(id("learning-shell-action"), {});
const tapCard = (): void => void fireEvent.tap(id("culture-card-face"), {});
const actionLabel = () => id("learning-shell-action").getAttribute("accessibility-label");
const face = () => id("culture-card-face").getAttribute("data-face");
const faceClass = () => id("culture-card-face").getAttribute("class");
const failPhoto = (): void =>
  void fireEvent(id("culture-card-photo"), new window.Event("bindEvent:error"));

const fullFront = "Culture card 1 of 2, front. 편의점 봉투, Convenience store bags. Tap to flip.";
const fullBack =
  "Culture card 1 of 2, back. 편의점 봉투. Pronunciation: pyeonuijeom bongtu. " +
  `${full.body} In Korean: ${full.koreanBody} Tap to flip back.`;

describe("CultureCardActivity — 앞면", () => {
  test("UCC1. 첫 카드는 앞면이고 표식 CULTURE · 한국어 제목 · 영어 제목 · Tap to flip이 서며 뒷면 줄은 없다", () => {
    mount(two);

    expect(face()).toBe("front");
    expect(id("culture-card-eyebrow")).toHaveTextContent("CULTURE");
    expect(id("culture-card-title")).toHaveTextContent("편의점 봉투");
    expect(id("culture-card-title-translation")).toHaveTextContent("Convenience store bags");
    expect(id("culture-card-flip-hint")).toHaveTextContent("Tap to flip");
    for (const back of ["culture-card-body", "culture-card-korean", "culture-card-flip-back"]) {
      expect(maybe(back)).not.toBeInTheDocument();
    }
    expect(maybe("culture-card-title-romanization")).not.toBeInTheDocument();
  });

  test("UCC1b. 셸 · 지시문 · 덱 카운터 · 점 · 덱의 두 층이 서고 아래 버튼은 Flip card다", () => {
    mount(two);

    expect(id("learning-shell-instruction")).toHaveTextContent("Learn about life in Korea.");
    expect(id("learning-shell-form")).toHaveTextContent("Culture");
    expect(id("learning-shell-chapter")).toHaveTextContent("Lesson 1 / 2");
    expect(id("culture-card-counter")).toHaveTextContent("1 / 2");
    expect(id("culture-card-layer-far")).toBeInTheDocument();
    expect(id("culture-card-layer-near")).toBeInTheDocument();
    expect(id("ui-lynx-page-indicator")).toHaveAttribute("data-count", "2");
    expect(id("ui-lynx-page-indicator")).toHaveAttribute("data-current", "1");
    expect(actionLabel()).toBe("Flip card");
    expect(maybe("answer-verdict")).not.toBeInTheDocument();
    // 덱은 셸의 흰 카드에 싸이지 않고 스스로 면을 그린다(세션 헤더도 Card라 무대 안만 센다).
    expect(
      within(id("learning-shell-stage")).queryByTestId("ui-lynx-card"),
    ).not.toBeInTheDocument();
  });

  test("UCC2. 그림이 있으면 사진이 카드를 채우고 아래 명암이 서며 브랜드 면 아이콘은 없다", () => {
    mount(two);

    expect(id("culture-card-photo")).toHaveAttribute("src", full.imageUrl ?? "");
    expect(id("culture-card-photo")).toHaveAttribute("mode", "aspectFill");
    expect(id("culture-card-scrim")).toBeInTheDocument();
    expect(maybe("culture-card-panel-icon")).not.toBeInTheDocument();
  });

  test("UCC2b. 그림이 없으면 사진 대신 브랜드 면 위 아이콘이 서고 글은 같다", () => {
    mount([sparse, full]);

    expect(maybe("culture-card-photo")).not.toBeInTheDocument();
    expect(id("culture-card-panel-icon")).toBeInTheDocument();
    expect(id("culture-card-title")).toHaveTextContent("분리배출");
    expect(maybe("culture-card-title-translation")).not.toBeInTheDocument();
    expect(id("culture-card-flip-hint")).toHaveTextContent("Tap to flip");
  });

  test("UCC2c. 그림이 실패하면 사진이 걷히고 브랜드 면 아이콘이 선다", () => {
    mount(two);

    failPhoto();

    expect(maybe("culture-card-photo")).not.toBeInTheDocument();
    expect(id("culture-card-panel-icon")).toBeInTheDocument();
    expect(id("culture-card-title")).toHaveTextContent("편의점 봉투");
  });
});

describe("CultureCardActivity — 뒤집기 · 넘기기", () => {
  test("UCC3. 카드를 누르면 뒷면이 서고(제목 · 로마자 · 영어 본문 · In Korean 상자 · 뒤집기 아이콘) 다시 누르면 앞면이다", () => {
    mount(two);

    tapCard();

    expect(face()).toBe("back");
    expect(id("culture-card-title")).toHaveTextContent("편의점 봉투");
    expect(id("culture-card-title-romanization")).toHaveTextContent("pyeonuijeom bongtu");
    expect(id("culture-card-body")).toHaveTextContent(full.body);
    expect(id("culture-card-korean-title")).toHaveTextContent("In Korean");
    expect(id("culture-card-korean-text")).toHaveTextContent(full.koreanBody ?? "");
    expect(id("culture-card-flip-back")).toBeInTheDocument();
    for (const front of ["culture-card-photo", "culture-card-eyebrow", "culture-card-flip-hint"]) {
      expect(maybe(front)).not.toBeInTheDocument();
    }
    expect(actionLabel()).toBe("Next card");

    tapCard();

    expect(face()).toBe("front");
    expect(id("culture-card-photo")).toBeInTheDocument();
    expect(actionLabel()).toBe("Flip card");
  });

  test("UCC4. 아래 버튼이 앞면에서는 뒤집고, 뒷면에서는 다음 카드의 앞면으로 넘긴다", () => {
    const { onFinish } = mount(two);

    tapAction();
    expect(face()).toBe("back");
    expect(id("culture-card-content")).toHaveAttribute("data-card-index", "0");

    tapAction();

    expect(id("culture-card-content")).toHaveAttribute("data-card-index", "1");
    expect(face()).toBe("front");
    expect(id("culture-card-counter")).toHaveTextContent("2 / 2");
    expect(id("ui-lynx-page-indicator")).toHaveAttribute("data-current", "2");
    expect(id("learning-shell-chapter")).toHaveTextContent("Lesson 2 / 2");
    expect(actionLabel()).toBe("Flip card");
    expect(onFinish).toHaveBeenCalledTimes(0);
  });

  test("UCC4b. 빈 줄은 뒷면에도 서지 않는다(로마자 · In Korean 상자 없음)", () => {
    mount([sparse]);

    tapCard();

    expect(id("culture-card-body")).toHaveTextContent(sparse.body);
    expect(maybe("culture-card-title-romanization")).not.toBeInTheDocument();
    expect(maybe("culture-card-korean")).not.toBeInTheDocument();
  });

  test("UCC5. 마지막 카드의 뒷면 버튼은 See results이고 연타해도 빈 결과가 한 번만 올라간다", () => {
    const { onFinish } = mount([full]);

    expect(actionLabel()).toBe("Flip card");
    tapAction();
    expect(actionLabel()).toBe("See results");
    expect(onFinish).toHaveBeenCalledTimes(0);

    tapAction();
    tapAction();

    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledWith([], 0);
    expect(maybe("learning-activity-complete")).not.toBeInTheDocument();
  });

  test("UCC6. 레슨 중간 활동의 마지막 카드 뒷면 버튼은 Next이고 눌러 곧바로 빈 결과를 올린다", () => {
    const { onFinish } = mount([full], { offset: 4, total: 10, last: false });

    expect(id("learning-shell-chapter")).toHaveTextContent("Lesson 5 / 10");
    tapCard();
    expect(actionLabel()).toBe("Next");

    tapAction();

    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledWith([], 0);
  });

  test("UCC6b. 레슨의 마지막 활동이면 마지막 카드 뒷면 버튼이 See results다", () => {
    mount([full], { offset: 4, total: 6, last: true });

    tapCard();

    expect(actionLabel()).toBe("See results");
  });
});

describe("CultureCardActivity — 접근성 · 움직임", () => {
  test("UCC7. 카드는 버튼 하나의 접근성 요소이고 이름이 면 · 위치 · 뒤집을 수 있음을 말한다", () => {
    mount(two);

    const card = id("culture-card-face");
    expect(card).toHaveAttribute("accessibility-element", "true");
    expect(card).toHaveAttribute("accessibility-traits", "button");
    expect(card).toHaveAttribute("accessibility-label", fullFront);

    tapCard();

    expect(id("culture-card-face")).toHaveAttribute("accessibility-label", fullBack);
  });

  test("UCC7b. 빈 줄은 이름에도 들지 않는다", () => {
    mount([full, sparse]);
    tapAction();
    tapAction();

    expect(id("culture-card-face")).toHaveAttribute(
      "accessibility-label",
      "Culture card 2 of 2, front. 분리배출. Tap to flip.",
    );
    tapCard();
    expect(id("culture-card-face")).toHaveAttribute(
      "accessibility-label",
      `Culture card 2 of 2, back. 분리배출. ${sparse.body} Tap to flip back.`,
    );
  });

  test("UCC7c. 카운터 글자는 낭독에서 빠지고 점은 장식이다(셸의 Lesson n / N이 위치를 말한다)", () => {
    mount(two);

    expect(id("culture-card-counter")).toHaveAttribute("accessibility-element", "false");
    expect(id("ui-lynx-page-indicator")).toHaveAttribute("accessibility-element", "false");
    expect(id("ui-lynx-page-indicator")).not.toHaveAttribute("accessibility-label");
  });

  test("UCC8. 표준 움직임: 처음 선 면은 움직이지 않고, 뒤집어 선 면에만 뒤집기 클래스가 붙으며 다음 카드는 다시 움직이지 않는다", () => {
    mount(two);

    expect(faceClass()).toBe("culture-card-activity-face");
    expect(id("culture-card-face")).not.toHaveAttribute("data-motion");

    tapCard();
    expect(faceClass()).toBe("culture-card-activity-face culture-card-activity-face-flip");

    tapAction();
    expect(face()).toBe("front");
    expect(faceClass()).toBe("culture-card-activity-face");
  });

  test("UCC9. 동작 줄이기: 뒤집어도 클래스가 붙지 않아 면이 즉시 바뀌고 data-motion=reduced가 선다", () => {
    mount(two, undefined, reduced);

    tapCard();

    expect(face()).toBe("back");
    expect(faceClass()).toBe("culture-card-activity-face");
    expect(id("culture-card-face")).toHaveAttribute("data-motion", "reduced");
  });
});
