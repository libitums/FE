import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";
import { EntryBasicsLettersScreen } from "./EntryBasicsLettersScreen";
import { entryBasicsTestIds as ids } from "./entry-basics.contract";

// `ui` 계층: 글자 여섯 만나기(ADR-0176).

afterEach(cleanup);

function mount(sourceOf: (syllable: string) => string | null = (syllable) => `src:${syllable}`) {
  const play = vi.fn<(source: string) => void>();
  const onNext = vi.fn();
  const onBack = vi.fn();
  const onSkip = vi.fn();
  render(
    <EntryBasicsLettersScreen
      sound={{ sourceOf, play }}
      onNext={onNext}
      onBack={onBack}
      onSkip={onSkip}
    />,
  );
  return { play, onNext, onBack, onSkip };
}

const cell = (index: number) => screen.getByTestId(ids.letter(index));
const speaker = (index: number) => screen.getByTestId(`${ids.letter(index)}-speaker`);
const button = (id: string) => within(screen.getByTestId(id)).getByTestId("ui-lynx-button");

test("BL1. 1/3 막대 · header 제목 · 글자 여섯", () => {
  mount();
  expect(screen.getByTestId(ids.progress)).toHaveAttribute("accessibility-label", "Step 1 of 3");
  expect(screen.getByTestId(ids.title)).toHaveTextContent("Meet your first letters");
  expect(screen.getByTestId(ids.title)).toHaveAttribute("accessibility-traits", "header");
  for (const [index, letter] of ["ㄱ", "ㄴ", "ㄷ", "ㅏ", "ㅓ", "ㅗ"].entries())
    expect(cell(index).textContent).toContain(letter);
  expect(screen.queryByTestId(ids.letter(6))).not.toBeInTheDocument();
});

test("BL2. 소리가 있으면 들을 수 있다고 말하고, 누르면 나고, 들음으로 바뀐다", () => {
  const { play } = mount();
  expect(screen.getByTestId(ids.lead).textContent).toContain("Tap a letter to hear it.");
  expect(cell(0)).toHaveAttribute("accessibility-traits", "button");
  expect(cell(0)).toHaveAttribute("flatten", "false");

  fireEvent.tap(cell(0), {});
  fireEvent.tap(cell(4), {});

  expect(play.mock.calls).toEqual([["src:가"], ["src:어"]]);
  expect(speaker(0)).toHaveAttribute("data-audio", "heard");
  expect(speaker(1)).toHaveAttribute("data-audio", "ready");
  expect(cell(0)).toHaveAttribute("accessibility-label", "ㄱ, g / k, heard");
});

test("BL3. 소리가 하나도 없으면 약속하지 않고 스피커가 비활성이며 그래도 다음으로 간다", () => {
  const { play, onNext } = mount(() => null);
  expect(screen.getByTestId(ids.lead)).toHaveTextContent(
    "A consonant and a vowel make one sound block.",
  );
  expect(screen.getByTestId(ids.lead).textContent).not.toContain("Tap a letter");
  expect(cell(0)).toHaveAttribute("accessibility-label", "ㄱ, g / k, sound not available yet");
  expect(cell(0)).toHaveAttribute("accessibility-traits", "none");
  expect(speaker(0)).toHaveAttribute("data-audio", "unavailable");

  fireEvent.tap(cell(0), {});
  fireEvent.tap(button(ids.next), {});

  expect(play).not.toHaveBeenCalled();
  expect(onNext).toHaveBeenCalledTimes(1);
});

test("BL4. 일부만 있으면 약속하지 않되 있는 소리는 난다", () => {
  const { play } = mount((syllable) => (syllable === "가" ? "src:가" : null));
  expect(screen.getByTestId(ids.lead).textContent).not.toContain("Tap a letter");
  fireEvent.tap(cell(0), {});
  expect(play).toHaveBeenCalledExactlyOnceWith("src:가");
});

test("BL5. Skip은 한 번만 나간다(두 번 탭 · 뒤이은 Next)", () => {
  const { onSkip, onNext } = mount();
  act(() => {
    fireEvent.tap(button(ids.skip), {});
    fireEvent.tap(button(ids.skip), {});
    fireEvent.tap(button(ids.next), {});
  });
  expect(onSkip).toHaveBeenCalledTimes(1);
  expect(onNext).not.toHaveBeenCalled();
});

test("BL6. 보이는 뒤로 = 시스템 뒤로", () => {
  const first = mount();
  fireEvent.tap(within(screen.getByTestId(ids.back)).getByTestId("ui-lynx-round-button"), {});
  expect(first.onBack).toHaveBeenCalledTimes(1);
  cleanup();

  const second = mount();
  let handled = false;
  act(() => {
    handled = backHandlers.runTop();
  });
  expect(handled).toBe(true);
  expect(second.onBack).toHaveBeenCalledTimes(1);
});
