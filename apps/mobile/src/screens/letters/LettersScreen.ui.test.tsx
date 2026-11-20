import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import type { ChoiceRomanization } from "../../lib/session-options";
import { LettersScreen } from "./LettersScreen";
import { lettersTestIds as ids } from "./letters.contract";

// `ui` 계층: Letters 자모표(ADR-0169) — 고정 머리 · 40칸 순서 · 로마자 설정 · 누르면 소리 · 강조 · 들은 칸 · 소리 없음.

afterEach(() => {
  cleanup();
});

function mount(
  options: { romanization?: ChoiceRomanization; available?: (s: string) => boolean } = {},
) {
  const play = vi.fn<(source: string) => void>();
  const onPractice = vi.fn();
  const onCellTapped = vi.fn();
  const available = options.available ?? (() => true);
  render(
    <LettersScreen
      romanization={options.romanization ?? "shown"}
      sound={{ sourceOf: (s) => (available(s) ? `src:${s}` : null), play }}
      onPractice={onPractice}
      onCellTapped={onCellTapped}
    />,
  );
  return { play, onPractice, onCellTapped };
}

const cell = (index: number) => screen.getByTestId(ids.cell(index));

test("LS1. 머리에 제목 · 리드 · 연습 단추, 격자 밖(스크롤 영역 밖)에 선다", () => {
  mount();
  const root = screen.getByTestId(ids.screen);
  expect(root.textContent).toContain("Hangul letters");
  expect(root.textContent).toContain("Tap a letter to hear it.");
  expect(screen.getByTestId(ids.practice).textContent).toContain("Practice: build sounds");
  expect(screen.getByTestId("letters-scroll").contains(screen.getByTestId(ids.practice))).toBe(
    false,
  );
});

test("LS2. 40칸 — 첫 칸 ㄱ, 15번째 ㅏ, 25번째 ㄲ, 마지막 ㅢ · 묶음 제목 넷", () => {
  mount();
  expect(screen.queryByTestId(ids.cell(39))).toBeInTheDocument();
  expect(screen.queryByTestId(ids.cell(40))).not.toBeInTheDocument();
  expect(cell(0).textContent).toContain("ㄱ");
  expect(cell(14).textContent).toContain("ㅏ");
  expect(cell(24).textContent).toContain("ㄲ");
  expect(cell(39).textContent).toContain("ㅢ");
  const text = screen.getByTestId("letters-scroll").textContent ?? "";
  for (const title of ["Consonants", "Vowels", "Double consonants", "Combined vowels"])
    expect(text).toContain(title);
});

test("LS3. 로마자 설정이 켜져 있으면 칸에 로마자, 꺼지면 없음(낭독 이름에는 늘)", () => {
  mount();
  expect(cell(0).textContent).toContain("g / k");
  cleanup();
  mount({ romanization: "hidden" });
  expect(cell(0).textContent).not.toContain("g / k");
  expect(cell(0)).toHaveAttribute("accessibility-label", "ㄱ, g / k");
});

test("LS4. 누르면 자음 + ㅏ 소리 · 방금 칸 강조 · 들은 칸 표시 · 이벤트", () => {
  const { play, onCellTapped } = mount();
  fireEvent.tap(cell(0), {});
  expect(play).toHaveBeenCalledExactlyOnceWith("src:가");
  expect(cell(0)).toHaveAttribute("data-selected", "true");
  expect(cell(0)).toHaveAttribute("data-heard", "true");
  expect(onCellTapped).toHaveBeenCalledWith("ㄱ", "consonants", "played");
  fireEvent.tap(cell(14), {});
  expect(play).toHaveBeenLastCalledWith("src:아");
  expect(cell(0)).toHaveAttribute("data-selected", "false");
  expect(cell(0)).toHaveAttribute("data-heard", "true");
  expect(cell(14)).toHaveAttribute("data-selected", "true");
  expect(cell(1)).toHaveAttribute("data-heard", "false");
});

test("LS5. 소리가 아직 없으면 재생하지 않고 스피커가 unavailable, 칸은 여전히 강조 · 이벤트 unavailable", () => {
  const { play, onCellTapped } = mount({ available: () => false });
  expect(within(cell(0)).getByTestId("letters-cell-0-speaker")).toHaveAttribute(
    "data-audio",
    "unavailable",
  );
  expect(cell(0)).toHaveAttribute("accessibility-label", "ㄱ, g / k, sound not available yet");
  fireEvent.tap(cell(0), {});
  expect(play).not.toHaveBeenCalled();
  expect(cell(0)).toHaveAttribute("data-selected", "true");
  expect(onCellTapped).toHaveBeenCalledWith("ㄱ", "consonants", "unavailable");
});

test("LS6. 연습 단추 → 합치기 퀴즈", () => {
  const { onPractice } = mount();
  fireEvent.tap(within(screen.getByTestId(ids.practice)).getByTestId("ui-lynx-button"), {});
  expect(onPractice).toHaveBeenCalledTimes(1);
});

// ---------------------------------------------------------------- 접근성 감사(ADR-0169 a11y)

test("LS7. 들은 칸은 낭독 이름에도 「heard」", () => {
  mount();
  fireEvent.tap(cell(0), {});
  expect(cell(0)).toHaveAttribute("accessibility-label", "ㄱ, g / k, heard");
});
