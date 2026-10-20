import { afterEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { MotionProvider } from "@libitums/ui-lynx/motion";
import type { AnswerResult } from "../../lib/answer-result";
import { backHandlers } from "../../lib/back-handler";
import { uiCopyEn } from "../../lib/ui-copy-en";
import { PairMatchActivity } from "./PairMatchActivity";
import { pairMatchRevealText } from "./pair-match";
import type { PairLink, PairMatchQuestion } from "./pair-match.contract";
import { expectCompleteScene, expectQuestionScene } from "../learning/complete-scene.test-support";

// `ui` 계층: 짝 맞추기 활동 — 낱말과 뜻을 잇고 되돌리며, 확인 한 번에 문항 하나를 판정하고 틀린 짝의
// 정답만 공개합니다. 문항은 매핑 모듈이 내는 꼴로 손으로 세웠습니다(뜻 열은 섞인 순서). 정답 탭은
// 문항의 `answer`로 만듭니다 — 판정 계산은 unit이 집니다.

const question: PairMatchQuestion = {
  words: ["이름", "안녕하세요", "반갑다", "어느"],
  meanings: ["which, how", "name", "nice to meet, happy", "hi, hello"],
  answer: [1, 3, 2, 0],
};
const questions = [question, question] as const;

type Finish = (results: readonly AnswerResult[], skippedCount: number) => void;

function stubAnnounce(): string[] {
  const spoken: string[] = [];
  vi.stubGlobal("NativeModules", {
    LynxAccessibilityModule: {
      accessibilityAnnounce: (args: { content: string }, callback: (result: unknown) => void) => {
        spoken.push(args.content);
        callback("announced");
      },
    },
  });
  return spoken;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  if (backHandlers.runTop()) {
    throw new Error("뒤로가기 핸들러가 정리되지 않았습니다");
  }
});

function mount(options: { readonly motion?: "reduced" } = {}) {
  const spoken = stubAnnounce();
  const onFinish = vi.fn<Finish>();
  const onExit = vi.fn<() => void>();
  const element = (
    <PairMatchActivity questions={questions} gemCount={0} onExit={onExit} onFinish={onFinish} />
  );
  const view = render(
    options.motion === undefined ? (
      element
    ) : (
      <MotionProvider motion={options.motion}>{element}</MotionProvider>
    ),
  );
  return { spoken, onFinish, onExit, container: view.container };
}

const id = (testId: string) => screen.getByTestId(testId);
const maybe = (testId: string) => screen.queryByTestId(testId);
const word = (index: number) => id(`pair-match-word-${index}`);
const meaning = (index: number) => id(`pair-match-meaning-${index}`);
const tap = (element: HTMLElement): void => void fireEvent.tap(element, {});
const tapAction = (): void => tap(id("learning-shell-action"));
const actionLabel = () => id("learning-shell-action").getAttribute("accessibility-label");
const normalized = (testId: string): string =>
  (id(testId).textContent ?? "").replace(/\s+/g, " ").trim();

/** 낱말 `w`를 정답 뜻과 잇습니다. */
function linkCorrect(w: number): void {
  tap(word(w));
  tap(meaning(question.answer[w] ?? -1));
}

const allTiles = (): readonly HTMLElement[] =>
  [0, 1, 2, 3].flatMap((index) => [word(index), meaning(index)]);

const snapshotOf = (): readonly string[] =>
  allTiles().map((tile) =>
    ["data-mark", "data-pair", "data-result"].map((name) => tile.getAttribute(name)).join("|"),
  );

describe.each([
  { name: "기본 모션", motion: undefined },
  { name: "동작 줄이기", motion: "reduced" as const },
])("PairMatchActivity — $name", ({ motion }) => {
  test("UP2. 낱말을 고르고 그 뜻을 누르면 두 타일이 같은 번호로 맺히고 진행 · 낭독이 한 번 바뀐다", () => {
    const { spoken } = mount({ motion });

    tap(word(0));
    expect(word(0)).toHaveAttribute("data-mark", "selected");
    tap(meaning(question.answer[0] ?? -1));

    const partner = meaning(question.answer[0] ?? -1);
    expect(word(0)).toHaveAttribute("data-mark", "linked");
    expect(partner).toHaveAttribute("data-mark", "linked");
    expect(word(0)).toHaveAttribute("data-pair", "1");
    expect(partner).toHaveAttribute("data-pair", "1");
    expect(word(0)).toHaveAttribute("accessibility-label", "이름, pair 1, matched with name");
    expect(partner).toHaveAttribute("accessibility-label", "name, pair 1, matched with 이름");
    expect(id("pair-match-progress")).toHaveTextContent("1 / 4 matched");
    expect(spoken.filter((text) => text === "Matched: 이름, name. 1 of 4.")).toHaveLength(1);
    expect(maybe("learning-shell-action")).not.toBeInTheDocument();
  });

  test("UP5. 넷을 모두 정답으로 이으면 그때야 Check가 서고, 확인하면 정답 배지와 잠긴 타일 여덟이 정답 표식으로 선다", () => {
    const { spoken } = mount({ motion });

    for (const w of [0, 1, 2]) {
      linkCorrect(w);
      expect(maybe("learning-shell-action")).not.toBeInTheDocument();
    }
    linkCorrect(3);
    expect(actionLabel()).toBe("Check");

    tapAction();

    expect(id("pair-match-content")).toHaveAttribute("data-phase", "checked");
    expect(maybe("pair-match-progress")).not.toBeInTheDocument();
    expect(id("answer-verdict")).toHaveAttribute("data-result", "correct");
    for (const tile of allTiles()) {
      expect(tile).toHaveAttribute("data-result", "correct");
      expect(tile).toHaveAttribute("accessibility-traits", "disabled");
    }
    expect(maybe("pair-match-reveal")).not.toBeInTheDocument();
    expect(actionLabel()).toBe("Next");
    expect(spoken).toContain(uiCopyEn.common.resultAnnouncement("correct"));
  });
});

test("UP1. 첫 렌더는 머리 라벨 · 지시문 · 진행 표식과 낱말 열 → 뜻 열 순서의 타일 여덟을 보이고 버튼은 없다", () => {
  const { container } = mount();

  expect(id("learning-shell-form")).toHaveTextContent("Matching");
  expect(id("learning-shell-instruction")).toHaveTextContent("Tap a word, then its meaning.");
  expect(id("pair-match-progress")).toHaveTextContent("0 / 4 matched");
  expect(id("pair-match-progress")).toHaveAttribute("accessibility-label", "0 of 4 pairs matched");
  expect(id("pair-match-content")).toHaveAttribute("data-phase", "matching");

  const words = id("pair-match-words");
  const meanings = id("pair-match-meanings");
  question.words.forEach((text, index) => {
    expect(within(words).getByTestId(`pair-match-word-${index}`)).toHaveTextContent(text);
  });
  question.meanings.forEach((text, index) => {
    expect(within(meanings).getByTestId(`pair-match-meaning-${index}`)).toHaveTextContent(text);
  });
  // 뜻 열이 낱말 열 뒤에 선다.
  const order = [...container.querySelectorAll("[data-testid]")].map((el) =>
    el.getAttribute("data-testid"),
  );
  expect(order.indexOf("pair-match-words")).toBeGreaterThanOrEqual(0);
  expect(order.indexOf("pair-match-words")).toBeLessThan(order.indexOf("pair-match-meanings"));
  expect(order.lastIndexOf("pair-match-word-3")).toBeLessThan(
    order.indexOf("pair-match-meaning-0"),
  );
  for (const tile of allTiles()) {
    expect(tile).toHaveAttribute("data-mark", "idle");
  }
  expect(maybe("learning-shell-action")).not.toBeInTheDocument();
});

test("UP3. 뜻을 먼저 고르고 낱말을 눌러도 같은 짝이 같은 번호로 맺힌다", () => {
  const { spoken } = mount();

  tap(meaning(question.answer[0] ?? -1));
  expect(meaning(question.answer[0] ?? -1)).toHaveAttribute("data-mark", "selected");
  tap(word(0));

  expect(word(0)).toHaveAttribute("data-pair", "1");
  expect(meaning(question.answer[0] ?? -1)).toHaveAttribute("data-pair", "1");
  expect(word(0)).toHaveAttribute("accessibility-label", "이름, pair 1, matched with name");
  expect(id("pair-match-progress")).toHaveTextContent("1 / 4 matched");
  expect(spoken.filter((text) => text === "Matched: 이름, name. 1 of 4.")).toHaveLength(1);
});

test("UP4. 맺힌 낱말 타일을 누르면 그 짝이 풀리고 맺힌 뜻 타일을 눌러도 같다", () => {
  const { spoken } = mount();
  const partner = () => meaning(question.answer[0] ?? -1);

  linkCorrect(0);
  tap(word(0));

  expect(word(0)).toHaveAttribute("data-mark", "idle");
  expect(partner()).toHaveAttribute("data-mark", "idle");
  expect(word(0)).toHaveAttribute("data-pair", "none");
  expect(partner()).toHaveAttribute("data-pair", "none");
  expect(id("pair-match-progress")).toHaveTextContent("0 / 4 matched");
  expect(spoken.filter((text) => text === "Unmatched: 이름")).toHaveLength(1);

  linkCorrect(0);
  expect(id("pair-match-progress")).toHaveTextContent("1 / 4 matched");
  tap(partner());

  expect(word(0)).toHaveAttribute("data-mark", "idle");
  expect(partner()).toHaveAttribute("data-mark", "idle");
  expect(id("pair-match-progress")).toHaveTextContent("0 / 4 matched");
  expect(spoken.filter((text) => text === "Unmatched: 이름")).toHaveLength(2);
});

test("UP6. 두 짝을 뒤바꿔 이어 확인하면 오답 배지 · 뒤바뀐 타일 넷만 오답 표식 · 틀린 두 낱말의 정답 공개 · 낭독이 선다", () => {
  const { spoken } = mount();

  for (const w of [0, 1, 2, 3]) linkCorrect(w);
  tapAction();
  tapAction();
  expect(id("pair-match-content")).toHaveAttribute("data-phase", "matching");

  const a0 = question.answer[0] ?? -1;
  const a1 = question.answer[1] ?? -1;
  tap(word(0));
  tap(meaning(a1));
  tap(word(1));
  tap(meaning(a0));
  linkCorrect(2);
  linkCorrect(3);
  tapAction();

  expect(id("answer-verdict")).toHaveAttribute("data-result", "incorrect");
  const wrong = new Set([word(0), word(1), meaning(a0), meaning(a1)]);
  for (const tile of allTiles()) {
    expect(tile).toHaveAttribute("data-result", wrong.has(tile) ? "incorrect" : "correct");
  }
  const links: readonly PairLink[] = [
    { word: 0, meaning: a1, ordinal: 1 },
    { word: 1, meaning: a0, ordinal: 2 },
    { word: 2, meaning: question.answer[2] ?? -1, ordinal: 3 },
    { word: 3, meaning: question.answer[3] ?? -1, ordinal: 4 },
  ];
  const expected = pairMatchRevealText(question, links, uiCopyEn);
  expect(expected).not.toBeNull();
  expect(normalized("pair-match-reveal")).toBe((expected ?? "").replace(/\s+/g, " ").trim());
  expect(normalized("pair-match-reveal")).not.toContain("반갑다");
  expect(normalized("pair-match-reveal")).not.toContain("어느");
  expect(spoken.some((text) => text.includes("Correct pairs:"))).toBe(true);
});

test("UP7. 확인한 뒤에는 타일을 눌러도 짝 · 표식 · 판정이 그대로다", () => {
  mount();

  for (const w of [0, 1, 2, 3]) linkCorrect(w);
  tapAction();
  const before = snapshotOf();

  tap(word(0));
  tap(meaning(1));
  tap(word(2));

  expect(snapshotOf()).toEqual(before);
});

test("UP8. 끝까지 풀고 See results를 두 번 눌러도 문항별 판정이 한 번만 올라가며 완료 카드가 선다", () => {
  const { onFinish } = mount();

  for (const w of [0, 1, 2, 3]) linkCorrect(w);
  tapAction();
  tapAction();
  const a0 = question.answer[0] ?? -1;
  const a1 = question.answer[1] ?? -1;
  tap(word(0));
  tap(meaning(a1));
  tap(word(1));
  tap(meaning(a0));
  linkCorrect(2);
  linkCorrect(3);
  tapAction();
  tapAction();

  expect(id("pair-match-complete")).toBeInTheDocument();
  expect(actionLabel()).toBe("See results");
  expect(onFinish).toHaveBeenCalledTimes(0);

  tapAction();
  tapAction();

  expect(onFinish).toHaveBeenCalledTimes(1);
  expect(onFinish).toHaveBeenCalledWith(["correct", "incorrect"], 0);
});

test("UP9. Next로 둘째 문항에 들어서면 낭독이 늘지 않고 타일 · 진행이 처음 상태다", () => {
  const { spoken } = mount();

  for (const w of [0, 1, 2, 3]) linkCorrect(w);
  tapAction();
  const spokenBefore = spoken.length;

  tapAction();

  expect(spoken).toHaveLength(spokenBefore);
  expect(spoken.some((text) => text.startsWith("Unmatched"))).toBe(false);
  for (const tile of allTiles()) {
    expect(tile).toHaveAttribute("data-mark", "idle");
    expect(tile).toHaveAttribute("data-pair", "none");
  }
  expect(id("pair-match-progress")).toHaveTextContent("0 / 4 matched");
});

test("UP11. 나가기 버튼 → 확인창에서 Leave를 고르면 onExit이 한 번이고 결과는 올라가지 않는다", () => {
  const { onExit, onFinish, container } = mount();

  tap(id("learning-shell-exit"));
  const leave = [...container.querySelectorAll('[data-testid="ui-lynx-button"]')].find(
    (el) => el.getAttribute("accessibility-label") === "Leave",
  );
  expect(leave).toBeDefined();
  act(() => {
    tap(leave as HTMLElement);
  });

  expect(onExit).toHaveBeenCalledTimes(1);
  expect(onFinish).toHaveBeenCalledTimes(0);
});

// ACS-PM — 완료 장면: 무대가 완료 장면이고 내용 상자 안은 완료 카드 하나다. 문항 장면은 그대로다.
test("[ACS-PM] 완료 때 무대가 완료 장면이고 내용 상자의 유일한 자식이 완료 카드이며 문항 장면에는 표시가 없다", () => {
  mount();
  expectQuestionScene();

  for (const w of [0, 1, 2, 3]) linkCorrect(w);
  tapAction();
  tapAction();
  const a0 = question.answer[0] ?? -1;
  const a1 = question.answer[1] ?? -1;
  tap(word(0));
  tap(meaning(a1));
  tap(word(1));
  tap(meaning(a0));
  linkCorrect(2);
  linkCorrect(3);
  tapAction();
  tapAction();

  expectCompleteScene("pair-match-content", "pair-match-complete");
});
