import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import type { WordbookEntry } from "../../app/wordbook-entries";
import { WordbookWordScreen } from "./WordbookWordScreen";
import { wordbookTestIds as ids } from "./wordbook.contract";
import { sampleEntries } from "./wordbook.test-support";

// `ui` 계층: 단어 자세히(ADR-0168) — 단어 · 로마자 · Listen/Slow · 뜻 · 이야기 예문 · 처음 본 날 · 맞힌 수 · Practice.

afterEach(() => {
  cleanup();
});

function mount(entry: WordbookEntry | null = sampleEntries[2] ?? null) {
  const play = vi.fn<(source: string, slow: boolean) => void>();
  const onBack = vi.fn();
  const onPractice = vi.fn();
  render(
    <WordbookWordScreen
      entry={entry}
      sound={{ sourceOf: (e) => `src:${e.roman}`, play }}
      onBack={onBack}
      onPractice={onPractice}
    />,
  );
  return { play, onBack, onPractice };
}

test("WW1. 단어 · 로마자 · 뜻 · 상태 칩 · 이야기 예문 · 에피소드 · 처음 본 날 · 맞힌 수", () => {
  mount();
  const text = screen.getByTestId(ids.word).textContent ?? "";
  for (const part of [
    "주세요",
    "juseyo",
    "please give",
    "Review",
    "From your story",
    "물 좀 주세요.",
    "Some water, please.",
    "Episode 1 · At the guesthouse",
    "First seen",
    "Nov 18",
    "3 of 5",
  ])
    expect(text).toContain(part);
});

test("WW2. Listen은 보통 · Slow는 느리게", () => {
  const { play } = mount();
  fireEvent.tap(screen.getByTestId(ids.listen), {});
  expect(play).toHaveBeenLastCalledWith("src:juseyo", false);
  fireEvent.tap(screen.getByTestId(ids.slow), {});
  expect(play).toHaveBeenLastCalledWith("src:juseyo", true);
});

test("WW3. 예문이 없으면 예문 상자가 없다", () => {
  mount(sampleEntries[0]);
  expect(screen.getByTestId(ids.word).textContent).not.toContain("From your story");
});

test("WW4. Practice this word · 뒤로", () => {
  const { onPractice, onBack } = mount();
  fireEvent.tap(within(screen.getByTestId(ids.practice)).getByTestId("ui-lynx-button"), {});
  expect(onPractice).toHaveBeenCalledTimes(1);
  fireEvent.tap(within(screen.getByTestId(ids.back)).getByTestId("ui-lynx-round-button"), {});
  expect(onBack).toHaveBeenCalledTimes(1);
});

test("WW5. 카탈로그에서 사라진 단어면 뒤로만", () => {
  const { onBack } = mount(null);
  expect(screen.queryByTestId(ids.practice)).not.toBeInTheDocument();
  fireEvent.tap(within(screen.getByTestId(ids.back)).getByTestId("ui-lynx-round-button"), {});
  expect(onBack).toHaveBeenCalledTimes(1);
});
