import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import type { ChoiceRomanization } from "../../lib/session-options";
import { LettersScreen } from "./LettersScreen";
import { lettersTestIds as ids } from "./letters.contract";

// `ui` 계층: Letters 자모표(ADR-0169) — 고정 머리 · 40칸 순서 · 로마자 설정 · 누르면 소리 · 들은 칸 · 소리 없음.
// ⟨2026-11-21 개정⟩ 누른 칸이 켜진 채 남지 않고(선택 상태 없음), 누를 때 진동하지 않습니다.

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/** 누른 뒤 켜진 채 남는 표시가 없다 — 선택 속성 · 선택 클래스 · 낭독 「selected」 모두. */
function expectNotLit(element: HTMLElement) {
  expect(element).not.toHaveAttribute("data-selected");
  expect(element.getAttribute("class") ?? "").not.toContain("selected");
  expect(element.getAttribute("accessibility-label") ?? "").not.toContain("selected");
}

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

test("LS4. 누르면 자음 + ㅏ 소리 · 들은 칸 표시 · 이벤트 — 누른 칸이 켜진 채 남지 않는다", () => {
  const { play, onCellTapped } = mount();
  fireEvent.tap(cell(0), {});
  expect(play).toHaveBeenCalledExactlyOnceWith("src:가");
  expectNotLit(cell(0));
  expect(cell(0)).toHaveAttribute("data-heard", "true");
  expect(onCellTapped).toHaveBeenCalledWith("ㄱ", "consonants", "played");
  fireEvent.tap(cell(14), {});
  expect(play).toHaveBeenLastCalledWith("src:아");
  expectNotLit(cell(0));
  expectNotLit(cell(14));
  expect(cell(0)).toHaveAttribute("data-heard", "true");
  expect(cell(1)).toHaveAttribute("data-heard", "false");
});

test("LS5. 소리가 아직 없으면 재생하지 않고 스피커가 unavailable, 칸은 켜지지 않고 이벤트 unavailable", () => {
  const { play, onCellTapped } = mount({ available: () => false });
  expect(within(cell(0)).getByTestId("letters-cell-0-speaker")).toHaveAttribute(
    "data-audio",
    "unavailable",
  );
  expect(cell(0)).toHaveAttribute("accessibility-label", "ㄱ, g / k, sound not available yet");
  fireEvent.tap(cell(0), {});
  expect(play).not.toHaveBeenCalled();
  expectNotLit(cell(0));
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

// ---------------------------------------------------------------- 진동 없음(⟨2026-11-21 개정⟩)

test("LS8. 칸을 여러 번 눌러도 진동 · 효과음 모듈을 부르지 않는다 — 소리는 칸 소리 포트로만", () => {
  const haptic = vi.fn<(kind: string) => void>();
  const effect = vi.fn<(id: string) => void>();
  vi.stubGlobal("NativeModules", {
    SoundEffectsModule: { play: effect, stopRing: () => {}, haptic },
  });
  const { play } = mount();
  for (const index of [0, 14, 24, 39, 0]) fireEvent.tap(cell(index), {});
  expect(play).toHaveBeenCalledTimes(5);
  expect(haptic).not.toHaveBeenCalled();
  expect(effect).not.toHaveBeenCalled();
  for (const index of [0, 14, 24, 39]) expectNotLit(cell(index));
});
