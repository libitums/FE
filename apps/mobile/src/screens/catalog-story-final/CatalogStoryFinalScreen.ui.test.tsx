import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import type { AnswerResult } from "../../lib/answer-result";
import { backHandlers } from "../../lib/back-handler";
import { CatalogStoryFinalScreen } from "./CatalogStoryFinalScreen";
import type {
  StoryFinalChoiceTurn,
  StoryFinalTilesTurn,
  StoryFinalTurns,
  StoryFinalWriteTurn,
} from "./catalog-story-final.contract";

// `ui` 계층: 여정맵 이야기 파이널 화면(시안 ①~⑤) — RP 최종 테스트 껍데기 그대로에 보기 고르기 · 타일 · 따라 쓰기.
// 판정 배지 · 해설 자리는 판정 전에도 서 있어 판 높이가 흔들리지 않습니다. 판정 규칙은 unit이 지므로 렌더만 봅니다.
// 이 시험 환경에는 손글씨 모듈이 없어 따라 쓰기 음절은 막지 않고 통과합니다(`storyTracePassed`).

const insets = { top: 0, bottom: 0, left: 0, right: 0 };
const base = {
  speakerName: "점원",
  imageUrl: null,
  replyTranslation: null,
  correctNote: null,
};

const choice: StoryFinalChoiceTurn = {
  ...base,
  id: "S8-01",
  kind: "choice",
  instruction: "How do you reply?",
  line: { ko: "봉투 드릴까요?", roman: null, en: "Would you like a bag?" },
  template: null,
  replyTranslation: "No, I'm fine.",
  answer: "아니요, 괜찮아요.",
  correctNote: "Here you say “No, I'm fine.”",
  options: [
    { ko: "영수증 드릴까요?", roman: null },
    { ko: "아니요, 괜찮아요.", roman: null },
  ],
  correctIndex: 1,
};
const tiles: StoryFinalTilesTurn = {
  ...base,
  id: "S8-04",
  kind: "tiles",
  instruction: "Fill in the blank.",
  line: { ko: "영수증 드릴까요?", roman: null, en: null },
  template: "아니요, ___.",
  answer: "아니요, 영수증은 괜찮아요.",
  tiles: [
    { ko: "괜찮아요", roman: "" },
    { ko: "영수증은", roman: "" },
  ],
  accepted: ["영수증은 괜찮아요"],
  joiner: " ",
};
const write: StoryFinalWriteTurn = {
  ...base,
  id: "S8-03",
  kind: "write",
  instruction: "Trace it.",
  line: { ko: "삼천 원입니다.", roman: null, en: null },
  template: "___ 할게요.",
  answer: "카드로 할게요.",
  syllables: ["카", "드"],
  replyAudioSource: "https://cdn/audio/u01/d-04.m4a",
};

function mount(turns: StoryFinalTurns = [choice, tiles, write]) {
  const onFinish = vi.fn<(results: readonly AnswerResult[]) => void>();
  const onExit = vi.fn<() => void>();
  render(
    <CatalogStoryFinalScreen
      insets={insets}
      ordinal={1}
      turns={turns}
      onFinish={onFinish}
      onExit={onExit}
    />,
  );
  return { onFinish, onExit };
}

const action = () =>
  within(screen.getByTestId("catalog-story-final-action")).queryByTestId("ui-lynx-button");
const actionText = () =>
  within(screen.getByTestId("catalog-story-final-action")).getByTestId("ui-lynx-button-label");
const option = (index: number) => screen.getByTestId(`catalog-story-final-option-${index}`);
const tap = (element: Element) => fireEvent.tap(element, {});

afterEach(() => {
  cleanup();
  if (backHandlers.runTop()) throw new Error("back handler leaked");
});

describe("CatalogStoryFinalScreen", () => {
  test("SU1. 머리 · 상대 대사 · 안내 · Say가 서고, 배지 · 해설 자리는 비어도 서 있으며 버튼은 없다", () => {
    mount();
    expect(screen.getByTestId("catalog-story-final-title")).toHaveTextContent(
      "Episode 1. Final test",
    );
    expect(screen.getByTestId("catalog-story-final-progress")).toHaveTextContent("Turn 1 of 3");
    expect(screen.getByTestId("catalog-story-final-line")).toHaveAttribute(
      "accessibility-label",
      "점원: 봉투 드릴까요? Would you like a bag?",
    );
    expect(screen.getByTestId("catalog-story-final-instruction")).toHaveTextContent(
      "How do you reply?",
    );
    expect(screen.getByTestId("catalog-story-final-hint")).toHaveTextContent("Say: No, I'm fine.");
    expect(screen.getByTestId("catalog-story-final-verdict-slot")).toBeInTheDocument();
    expect(screen.getByTestId("catalog-story-final-note-slot")).toBeInTheDocument();
    expect(screen.queryByTestId("answer-verdict")).not.toBeInTheDocument();
    expect(action()).not.toBeInTheDocument();
  });

  test("SU2. 맞는 보기를 고르면 바로 맞힘 배지 · 해설 · 대답 줄 · Next가 서고 보기는 잠긴다", () => {
    mount();
    tap(option(1));
    expect(screen.getByTestId("answer-verdict")).toHaveAttribute("data-result", "correct");
    expect(screen.getByTestId("catalog-story-final-note")).toHaveTextContent(
      "Here you say “No, I'm fine.”",
    );
    expect(screen.getByTestId("catalog-story-final-reply")).toHaveTextContent("아니요, 괜찮아요.");
    expect(option(1)).toHaveAttribute("data-state", "correct");
    expect(option(0)).toHaveAttribute("data-state", "dim");
    expect(actionText()).toHaveTextContent("Next");
    tap(option(0));
    expect(screen.getByTestId("answer-verdict")).toHaveAttribute("data-result", "correct");
  });

  test("SU3. 틀린 보기면 틀림 배지와 Answer(완성 문장)가 서고 고른 보기가 틀림으로 표시된다", () => {
    mount();
    tap(option(0));
    expect(screen.getByTestId("answer-verdict")).toHaveAttribute("data-result", "incorrect");
    expect(screen.getByTestId("catalog-story-final-answer")).toHaveTextContent("아니요, 괜찮아요.");
    expect(option(0)).toHaveAttribute("data-state", "incorrect");
    expect(screen.queryByTestId("catalog-story-final-note")).not.toBeInTheDocument();
  });

  test("SU4. 타일을 놓으면 틀의 빈칸에 들어가고 Check로 판정한다", () => {
    mount([tiles]);
    expect(screen.getByTestId("catalog-story-final-reply")).toHaveTextContent("아니요,");
    tap(screen.getByTestId("sentence-order-chip-1"));
    tap(screen.getByTestId("sentence-order-chip-0"));
    expect(actionText()).toHaveTextContent("Check");
    tap(action() as Element);
    expect(screen.getByTestId("answer-verdict")).toHaveAttribute("data-result", "correct");
    expect(actionText()).toHaveTextContent("See results");
  });

  test("SU5. 따라 쓰기는 음절 칸 · 쓰기 칸 · Redo · Listen이 서고, 음절마다 넘겨 마지막에 판정한다", () => {
    mount([write]);
    const cells = screen.getAllByTestId(/^catalog-story-final-cell-/);
    expect(cells).toHaveLength(2);
    expect(cells[0]).toHaveAttribute("data-state", "writing");
    expect(screen.getByTestId("catalog-story-final-pad")).toHaveAttribute(
      "accessibility-label",
      "Writing area. Trace 카",
    );
    expect(screen.getByTestId("catalog-story-final-redo")).toBeInTheDocument();
    expect(screen.getByTestId("catalog-story-final-listen")).toBeInTheDocument();
    expect(actionText()).toHaveTextContent("Next letter");
    tap(action() as Element);
    expect(screen.getByTestId("catalog-story-final-cell-0")).toHaveAttribute(
      "data-state",
      "written",
    );
    expect(screen.getByTestId("catalog-story-final-cell-0")).toHaveTextContent("카");
    expect(actionText()).toHaveTextContent("Check");
    tap(action() as Element);
    expect(screen.getByTestId("answer-verdict")).toHaveAttribute("data-result", "correct");
  });

  test("SU6. 마지막 턴 뒤 See results가 결과를 한 번만 올린다", () => {
    const { onFinish } = mount([choice]);
    tap(option(1));
    tap(action() as Element);
    tap(action() as Element);
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledWith(["correct"]);
  });

  test("SU7. 다음 턴으로 가면 진행이 오르고 답 상태가 비워진다", () => {
    mount();
    tap(option(1));
    tap(action() as Element);
    expect(screen.getByTestId("catalog-story-final-progress")).toHaveTextContent("Turn 2 of 3");
    expect(screen.queryByTestId("answer-verdict")).not.toBeInTheDocument();
    expect(screen.getByTestId("catalog-story-final-instruction")).toHaveTextContent(
      "Fill in the blank.",
    );
  });

  test("SU8. 뒤로가기 · 머리 나가기는 onExit를 부른다", () => {
    const { onExit } = mount();
    backHandlers.runTop();
    expect(onExit).toHaveBeenCalledTimes(1);
    tap(within(screen.getByTestId("catalog-story-final-back")).getByTestId("ui-lynx-round-button"));
    expect(onExit).toHaveBeenCalledTimes(2);
  });
});
