import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import type { ChoiceRomanization } from "../../lib/session-options";
import { PLAYING_LETTER_FALLBACK_MS } from "../../components/use-playing-letter";
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
  const play = vi.fn<(source: string, onDone?: () => void) => void>();
  const onPractice = vi.fn();
  const onCellTapped = vi.fn();
  const available = options.available ?? (() => true);
  render(
    <LettersScreen
      romanization={options.romanization ?? "shown"}
      sound={{
        sourceOf: (s) => `src:${s}`,
        letterSourceOf: (letter) => (available(letter) ? `clip:${letter}` : null),
        play,
      }}
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

// ⟨2026-11-23 개정⟩ 스피커 색은 소리가 나는 동안만 바뀝니다 — 끝나면 처음 색으로 돌아가고, 들었다는 표시는 남지 않습니다.
const speaker = (index: number) => screen.getByTestId(`${ids.cell(index)}-speaker`);
const finish = (play: ReturnType<typeof mount>["play"], call: number) =>
  act(() => {
    play.mock.calls[call]?.[1]?.();
  });

test("LS4. 누르면 그 자모의 내장 소리 · 이벤트, 스피커는 나는 동안만 playing — 끝나면 ready", () => {
  const { play, onCellTapped } = mount();
  fireEvent.tap(cell(0), {});
  expect(play).toHaveBeenCalledExactlyOnceWith("clip:ㄱ", expect.any(Function));
  expectNotLit(cell(0));
  expect(speaker(0)).toHaveAttribute("data-audio", "playing");
  expect(onCellTapped).toHaveBeenCalledWith("ㄱ", "consonants", "played");
  finish(play, 0);
  expect(speaker(0)).toHaveAttribute("data-audio", "ready");
  expect(cell(0)).not.toHaveAttribute("data-heard");
});

test("LS4b. 다른 칸을 누르면 앞 칸은 곧바로 ready, 새 칸이 playing — 앞 재생의 늦은 끝은 새 칸을 끄지 않는다", () => {
  const { play } = mount();
  fireEvent.tap(cell(0), {});
  fireEvent.tap(cell(14), {});
  expect(play).toHaveBeenLastCalledWith("clip:ㅏ", expect.any(Function));
  expect(speaker(0)).toHaveAttribute("data-audio", "ready");
  expect(speaker(14)).toHaveAttribute("data-audio", "playing");
  finish(play, 0);
  expect(speaker(14)).toHaveAttribute("data-audio", "playing");
  finish(play, 1);
  expect(speaker(14)).toHaveAttribute("data-audio", "ready");
  expectNotLit(cell(0));
  expectNotLit(cell(14));
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

test("LS4c. 끝 알림이 오지 않아도(호스트 없음) 안전망 시간 뒤 ready로 돌아간다", () => {
  vi.useFakeTimers();
  try {
    mount();
    fireEvent.tap(cell(0), {});
    expect(speaker(0)).toHaveAttribute("data-audio", "playing");
    act(() => {
      vi.advanceTimersByTime(PLAYING_LETTER_FALLBACK_MS);
    });
    expect(speaker(0)).toHaveAttribute("data-audio", "ready");
  } finally {
    vi.useRealTimers();
  }
});

test("LS7. 누른 뒤에도 낭독 이름은 그대로 — 「heard」를 붙이지 않는다", () => {
  const { play } = mount();
  fireEvent.tap(cell(0), {});
  finish(play, 0);
  expect(cell(0)).toHaveAttribute("accessibility-label", "ㄱ, g / k");
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
