import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { uiCopyEn } from "../../lib/ui-copy-en";
import { LettersComposeScreen } from "./LettersComposeScreen";
import { lettersTestIds as ids } from "./letters.contract";

// `ui` 계층: 합치기 퀴즈(ADR-0169) — 음절 조립 형식 · 자동 판정 · 칸 색 · Next / Try again · Hint · 소리.

afterEach(() => {
  cleanup();
});

function mount() {
  const play = vi.fn<(source: string) => void>();
  const onExit = vi.fn();
  const onAnswered = vi.fn();
  const onComplete = vi.fn();
  render(
    <LettersComposeScreen
      romanization="shown"
      sound={{ sourceOf: (s) => `src:${s}`, play }}
      onExit={onExit}
      onAnswered={onAnswered}
      onComplete={onComplete}
    />,
  );
  return { play, onExit, onAnswered, onComplete };
}

// 타일 순서: ㅏ ㄷ ㄱ ㅗ ㄴ ㅓ
const tileOf: Record<string, number> = { ㅏ: 0, ㄷ: 1, ㄱ: 2, ㅗ: 3, ㄴ: 4, ㅓ: 5 };
const pick = (letter: string) =>
  fireEvent.tap(screen.getByTestId(ids.composeTile(tileOf[letter]!)), {});
const slot = (s: "c" | "v" | "r") => screen.getByTestId(ids.composeSlot(s));
const action = () => screen.getByTestId("learning-shell-action");

test("CS1. 머리 캡션 · 지시 · 「Make “ga”」 · 타일 여섯(로마자) · 지금 칸은 자음 칸", () => {
  mount();
  const root = screen.getByTestId(ids.compose);
  expect(root.textContent).toContain("Letter building");
  expect(root.textContent).toContain("Put two letters together.");
  expect(root.textContent).toContain("Make “ga”");
  expect(screen.getByTestId(ids.composeTile(0)).textContent).toContain("ㅏ");
  expect(screen.getByTestId(ids.composeTile(0)).textContent).toContain("a");
  expect(screen.getByTestId(ids.composeTile(4)).textContent).toContain("n");
  expect(slot("c")).toHaveAttribute("data-state", "current");
  expect(slot("v")).toHaveAttribute("data-state", "empty");
  expect(screen.queryByTestId("learning-shell-action")).not.toBeInTheDocument();
});

test("CS2. ▶는 만들 글자 소리", () => {
  const { play } = mount();
  fireEvent.tap(screen.getByTestId(ids.composePlay), {});
  expect(play).toHaveBeenCalledExactlyOnceWith("src:가");
});

test("CS3. 두 칸이 차면 합친 글자 · 소리 · 곧바로 Correct · 칸 초록 · Next", () => {
  const { play, onAnswered } = mount();
  pick("ㄱ");
  expect(slot("v")).toHaveAttribute("data-state", "current");
  pick("ㅏ");
  expect(slot("r").textContent).toContain("가");
  expect(play).toHaveBeenLastCalledWith("src:가");
  expect(screen.getByTestId("answer-verdict")).toHaveAttribute("data-result", "correct");
  expect(slot("c")).toHaveAttribute("data-state", "correct");
  expect(slot("v")).toHaveAttribute("data-state", "correct");
  expect(action()).toHaveAttribute("accessibility-label", "Next");
  expect(onAnswered).toHaveBeenCalledExactlyOnceWith(1, "가", true);
});

test("CS4. 틀리면 Incorrect · 틀린 칸 빨강 · Try again은 비우고 같은 라운드", () => {
  const { onAnswered } = mount();
  pick("ㄱ");
  pick("ㅓ");
  expect(screen.getByTestId("answer-verdict")).toHaveAttribute("data-result", "incorrect");
  expect(slot("c")).toHaveAttribute("data-state", "correct");
  expect(slot("v")).toHaveAttribute("data-state", "incorrect");
  expect(onAnswered).toHaveBeenCalledWith(1, "가", false);
  expect(action()).toHaveAttribute("accessibility-label", "Try again");
  fireEvent.tap(action(), {});
  expect(slot("c")).toHaveAttribute("data-state", "current");
  expect(screen.getByTestId(ids.compose).textContent).toContain("Make “ga”");
});

test("CS5. Hint를 누르면 첫소리 안내", () => {
  mount();
  fireEvent.tap(screen.getByTestId(ids.composeHint), {});
  expect(screen.getByTestId(ids.composeHintText).textContent).toBe("Start with the sound “g”.");
});

test("CS6. 판정 전 칸을 누르면 비워진다", () => {
  mount();
  pick("ㄱ");
  fireEvent.tap(slot("c"), {});
  expect(slot("c")).toHaveAttribute("data-state", "current");
});

test("CS7. 세 라운드를 끝내면 완료 · 이벤트 · Done으로 나간다", () => {
  const { onComplete, onExit } = mount();
  for (const [c, v] of [
    ["ㄱ", "ㅏ"],
    ["ㄴ", "ㅓ"],
    ["ㄷ", "ㅗ"],
  ] as const) {
    pick(c);
    pick(v);
    fireEvent.tap(action(), {});
  }
  expect(onComplete).toHaveBeenCalledExactlyOnceWith(3, 3);
  expect(screen.getByTestId(ids.compose).textContent).toContain("You built all three sounds!");
  expect(action()).toHaveAttribute("accessibility-label", "Done");
  fireEvent.tap(action(), {});
  expect(onExit).toHaveBeenCalledTimes(1);
});

test("CS8. ×(머리 나가기)는 레슨과 같은 나가기 확인 뒤 onExit", () => {
  const { onExit } = mount();
  fireEvent.tap(within(screen.getByTestId(ids.compose)).getByTestId("learning-shell-exit"), {});
  fireEvent.tap(
    within(screen.getByTestId("ui-lynx-dialog-action-leave")).getByTestId("ui-lynx-button"),
    {},
  );
  expect(onExit).toHaveBeenCalledTimes(1);
});

// ---------------------------------------------------------------- 접근성 감사(ADR-0169 a11y)

test("CS9. 누르는 요소는 Android에서도 접근성 트리에 남는다(flatten false)", () => {
  mount();
  for (const id of [
    ids.composeSlot("c"),
    ids.composeSlot("v"),
    ids.composeSlot("r"),
    ids.composeTile(0),
    ids.composeHint,
    ids.composePlay,
  ])
    expect(screen.getByTestId(id)).toHaveAttribute("flatten", "false");
});

test("CS10. 판정 · 힌트 · 완료를 낭독한다", () => {
  const announced: string[] = [];
  vi.stubGlobal("NativeModules", {
    LynxAccessibilityModule: {
      accessibilityAnnounce: (args: { content: string }) => void announced.push(args.content),
    },
  });
  mount();
  fireEvent.tap(screen.getByTestId(ids.composeHint), {});
  expect(announced).toContain("Start with the sound “g”.");
  pick("ㄱ");
  pick("ㅏ");
  expect(announced).toContain(uiCopyEn.common.resultAnnouncement("correct"));
  vi.unstubAllGlobals();
});
