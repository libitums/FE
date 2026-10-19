import { afterEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import type { AnswerResult } from "../../lib/answer-result";
import type { LessonPosition } from "../learning/activity-finish";
import { SyllableBuildActivity } from "./SyllableBuildActivity";
import type { SyllableBuildQuestion } from "./syllable-build.contract";

// `ui` 계층: 음절 조립 활동 — 칸 · 창고 · 놓기 · 되돌리기 · 확인 · 판정 · 다음 · 완료 · 낭독을 실제 컴포넌트로
// 본다. 문항은 매핑이 내는 꼴로 손으로 세웠다(철자 탐색 · 섞기는 unit이 진다). 정답 상자는 타자 입력과 같이
// 맞혀도 보인다.

// 만들 낱말 「카드」 — 창고 순서는 정답 순서가 아니다(타일 2 = 카, 타일 1 = 드).
const card: SyllableBuildQuestion = {
  meaning: "card",
  tiles: ["현", "드", "카", "찮"],
  slotCount: 2,
  answers: ["카드"],
};

// 같은 음절이 두 장인 「일주일」 — 타일 1 · 2가 모두 「일」이다.
const week: SyllableBuildQuestion = {
  meaning: "week",
  tiles: ["주", "일", "일", "찮"],
  slotCount: 3,
  answers: ["일주일"],
};

type Finish = (results: readonly AnswerResult[], skippedCount: number) => void;

afterEach(() => {
  vi.unstubAllGlobals();
});

function mount(questions: readonly SyllableBuildQuestion[], lesson?: LessonPosition) {
  const onFinish = vi.fn<Finish>();
  render(
    <SyllableBuildActivity
      questions={questions}
      gemCount={0}
      onExit={() => {}}
      onFinish={onFinish}
      lesson={lesson}
    />,
  );
  return { onFinish };
}

type AnnounceCall = { content: string };

// 채점(builtin)과 완료(custom) 두 낭독 채널의 대역입니다. `lib/accessibility.ts` 자체는 mock하지 않는다.
function stubAnnounceHost(): { builtin: AnnounceCall[]; completion: AnnounceCall[] } {
  const builtin: AnnounceCall[] = [];
  const completion: AnnounceCall[] = [];
  vi.stubGlobal("NativeModules", {
    LynxAccessibilityModule: {
      accessibilityAnnounce: (args: { content: string }, callback: (result: unknown) => void) => {
        builtin.push({ content: args.content });
        callback("announced");
      },
    },
    CompletionAnnouncementModule: {
      announce: (args: { content: string }, callback: (result: unknown) => void) => {
        completion.push({ content: args.content });
        callback("announced");
      },
    },
  });
  return { builtin, completion };
}

const id = (testId: string) => screen.getByTestId(testId);
const maybe = (testId: string) => screen.queryByTestId(testId);
const tile = (index: number) => id(`syllable-build-tile-${index}`);
const slot = (position: number) => id(`syllable-build-slot-${position}`);
const tapTile = (index: number): void => void fireEvent.tap(tile(index), {});
const tapAction = (label: string): void => {
  const action = id("learning-shell-action");
  expect(action).toHaveAttribute("accessibility-label", label);
  fireEvent.tap(action, {});
};

describe("SyllableBuildActivity", () => {
  test("USB1. 첫 화면은 뜻 · 빈 칸 둘 · 창고 타일 넷을 보이고 아래 버튼이 없으며 지시문 · 머리 라벨이 선다", () => {
    mount([card, week]);

    expect(id("syllable-build-meaning")).toHaveTextContent("card");
    expect(slot(0)).toHaveAttribute("data-filled", "false");
    expect(slot(1)).toHaveAttribute("data-filled", "false");
    expect(maybe("syllable-build-slot-2")).not.toBeInTheDocument();
    for (const index of [0, 1, 2, 3]) {
      expect(tile(index)).toHaveAttribute("data-placed", "none");
      expect(tile(index)).toHaveAttribute("data-interaction", "tappable");
    }
    expect(tile(2)).toHaveTextContent("카");
    expect(maybe("learning-shell-action")).not.toBeInTheDocument();
    expect(id("learning-shell-instruction")).toHaveTextContent(
      "Tap the syllables to spell the word.",
    );
    expect(id("learning-shell-form")).toHaveTextContent("Spelling");
    expect(id("learning-shell-chapter")).toHaveTextContent("Lesson 1 / 2");
  });

  test("USB1b. 문항의 지시문이 있으면 기본 지시문 대신 선다", () => {
    mount([{ ...card, instruction: "Spell the word for a card." }]);

    expect(id("learning-shell-instruction")).toHaveTextContent("Spell the word for a card.");
  });

  test("USB2. 창고 타일을 누르면 다음 빈 칸에 서고 창고엔 빈 자리가 남으며 칸이 차면 창고 타일이 잠기고 Check가 선다", () => {
    mount([card]);

    tapTile(2);
    expect(slot(0)).toHaveAttribute("data-filled", "true");
    expect(tile(2)).toHaveAttribute("data-placed", "1");
    expect(id("syllable-build-bank-slot-2")).toBeInTheDocument();
    expect(maybe("learning-shell-action")).not.toBeInTheDocument();

    tapTile(1);
    expect(slot(1)).toHaveAttribute("data-filled", "true");
    expect(tile(1)).toHaveAttribute("data-placed", "2");
    expect(tile(0)).toHaveAttribute("data-interaction", "locked");
    expect(tile(3)).toHaveAttribute("data-interaction", "locked");
    expect(id("learning-shell-action")).toHaveAttribute("accessibility-label", "Check");
  });

  test("USB2b. 칸이 찬 뒤 창고 타일을 눌러도 칸이 늘지 않는다", () => {
    mount([card]);

    tapTile(2);
    tapTile(1);
    tapTile(0);

    expect(tile(0)).toHaveAttribute("data-placed", "none");
    expect(tile(2)).toHaveAttribute("data-placed", "1");
    expect(tile(1)).toHaveAttribute("data-placed", "2");
  });

  test("USB3. 칸의 타일을 누르면 창고로 돌아가고 뒤의 타일이 앞 칸으로 당겨지며 Check가 사라진다", () => {
    mount([card]);

    tapTile(2);
    tapTile(1);
    tapTile(2);

    expect(tile(2)).toHaveAttribute("data-placed", "none");
    expect(maybe("syllable-build-bank-slot-2")).not.toBeInTheDocument();
    expect(tile(1)).toHaveAttribute("data-placed", "1");
    expect(slot(0)).toHaveAttribute("data-filled", "true");
    expect(slot(1)).toHaveAttribute("data-filled", "false");
    expect(tile(0)).toHaveAttribute("data-interaction", "tappable");
    expect(maybe("learning-shell-action")).not.toBeInTheDocument();
  });

  test("USB4. 정답으로 Check하면 정답 배지 · 모든 타일 잠김 · Next · 정답 상자가 서고 오답이면 오답 배지에 정답 상자가 함께 선다", () => {
    mount([card, week]);

    tapTile(2);
    tapTile(1);
    tapAction("Check");

    expect(id("answer-verdict")).toHaveAttribute("data-result", "correct");
    for (const index of [0, 1, 2, 3]) {
      expect(tile(index)).toHaveAttribute("data-interaction", "locked");
    }
    // 맞혀도 정답 상자가 보인다 — 타자 입력과 같은 규칙.
    expect(id("syllable-build-reveal")).toHaveTextContent("Answer: 카드");
    tapAction("Next");

    // 둘째 문항 — 타일을 정답과 다르게 놓는다(주 · 일 · 일).
    tapTile(0);
    tapTile(1);
    tapTile(2);
    tapAction("Check");

    expect(id("answer-verdict")).toHaveAttribute("data-result", "incorrect");
    expect(id("syllable-build-reveal")).toHaveTextContent("Answer: 일주일");
    expect(id("learning-shell-action")).toHaveAttribute("accessibility-label", "Next");
  });

  test("USB4b. 같은 음절이 두 장이면 어느 장을 먼저 놓아도 정답이다", () => {
    mount([week]);

    tapTile(2);
    tapTile(0);
    tapTile(1);
    tapAction("Check");

    expect(id("answer-verdict")).toHaveAttribute("data-result", "correct");
  });

  test("USB4c. 채점 전에는 판정 배지 · 정답 상자가 없다", () => {
    mount([card]);

    tapTile(2);
    tapTile(1);

    expect(maybe("answer-verdict")).not.toBeInTheDocument();
    expect(maybe("syllable-build-reveal")).not.toBeInTheDocument();
  });

  test("USB4d. 채점 뒤에는 타일을 눌러도 움직이지 않는다", () => {
    mount([card]);

    tapTile(2);
    tapTile(1);
    tapAction("Check");
    tapTile(2);
    tapTile(0);

    expect(tile(2)).toHaveAttribute("data-placed", "1");
    expect(tile(1)).toHaveAttribute("data-placed", "2");
    expect(tile(0)).toHaveAttribute("data-placed", "none");
  });

  test("USB5. 낱말 줄은 비었을 때 줄 하나가 요소이고 놓이는 중에는 요소가 아니며 놓인 타일이 위치 라벨을 진다 · 채점 뒤 다시 줄이 요소다", () => {
    mount([card]);

    const word = id("syllable-build-word");
    expect(word).toHaveAttribute("accessibility-element", "true");
    expect(word).toHaveAttribute("accessibility-label", "Your word, empty, 2 syllables");

    tapTile(2);
    expect(id("syllable-build-word").getAttribute("accessibility-element")).not.toBe("true");
    expect(tile(2)).toHaveAttribute("accessibility-label", "카, position 1 of 2");

    tapTile(1);
    expect(tile(1)).toHaveAttribute("accessibility-label", "드, position 2 of 2");

    tapAction("Check");
    expect(id("syllable-build-word")).toHaveAttribute("accessibility-element", "true");
    expect(id("syllable-build-word")).toHaveAttribute("accessibility-label", "Your word: 카드");
  });

  test("USB5b. 뜻 줄은 접두어를 붙여 읽는다", () => {
    mount([card]);

    expect(id("syllable-build-meaning")).toHaveAttribute("accessibility-label", "Meaning: card");
  });

  test("USB5c. 되돌려 다시 비우면 낱말 줄이 다시 빈 줄을 말한다", () => {
    mount([card]);

    tapTile(2);
    tapTile(2);

    expect(id("syllable-build-word")).toHaveAttribute(
      "accessibility-label",
      "Your word, empty, 2 syllables",
    );
  });

  test("USB6. 채점은 판정을 한 번 낭독하고 마지막 Next는 완료를 custom 채널로 한 번 낭독한다", () => {
    const { builtin, completion } = stubAnnounceHost();
    mount([card]);

    tapTile(2);
    tapTile(1);
    tapAction("Check");

    expect(builtin.map((call) => call.content)).toEqual(["Result, correct"]);

    tapAction("Next");

    expect(completion.map((call) => call.content)).toEqual(["All questions done, See results"]);
    expect(builtin.map((call) => call.content)).toEqual(["Result, correct"]);
  });

  test("USB7. 두 문항을 마치면 완료 카드가 서고 See results가 판정 배열을 한 번 올린다", () => {
    const { onFinish } = mount([card, week]);

    tapTile(2);
    tapTile(1);
    tapAction("Check");
    tapAction("Next");
    tapTile(0);
    tapTile(1);
    tapTile(2);
    tapAction("Check");
    tapAction("Next");

    expect(id("syllable-build-complete")).toBeInTheDocument();
    expect(onFinish).toHaveBeenCalledTimes(0);

    tapAction("See results");

    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledWith(["correct", "incorrect"], 0);
  });

  test("USB7b. 레슨 중간 활동은 마지막 Next에서 완료 카드 없이 곧바로 결과를 올린다", () => {
    const { onFinish } = mount([card], { offset: 0, total: 5, last: false });

    tapTile(2);
    tapTile(1);
    tapAction("Check");
    tapAction("Next");

    expect(maybe("syllable-build-complete")).not.toBeInTheDocument();
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledWith(["correct"], 0);
  });

  test("USB7d. 레슨의 끝이면 완료 카드가 레슨 순번 · 전체 문항 수 · 활동 수를 보인다", () => {
    mount([card], { offset: 3, total: 9, last: true, activityCount: 3, ordinal: 3 });

    tapTile(2);
    tapTile(1);
    tapAction("Check");
    tapAction("Next");

    expect(id("syllable-build-complete")).toBeInTheDocument();
    expect(id("learning-activity-complete-lesson")).toHaveTextContent("Lesson 3");
    expect(id("learning-activity-complete-questions")).toHaveTextContent("9");
    expect(id("learning-activity-complete-activities")).toHaveTextContent("3");
  });

  test("USB7c. 레슨 안에서는 카운터가 오프셋을 더한다", () => {
    mount([card], { offset: 3, total: 9, last: true });

    expect(id("learning-shell-chapter")).toHaveTextContent("Lesson 4 / 9");
  });
});
