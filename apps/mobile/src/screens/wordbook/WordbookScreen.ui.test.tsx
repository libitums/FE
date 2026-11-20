import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { WordbookScreen } from "./WordbookScreen";
import { wordbookTestIds as ids } from "./wordbook.contract";
import { sampleEntries } from "./wordbook.test-support";

// `ui` 계층: My words 목록(ADR-0169) — 복습 CTA · 걸러보기 칩 · 줄(재생 · 한국어 · 로마자 · 뜻 · 에피소드 · 상태) · 빈 상태.

afterEach(() => {
  cleanup();
});

function mount(entries = sampleEntries, dueCount = 1) {
  const play = vi.fn<(source: string, slow: boolean) => void>();
  const onOpenWord = vi.fn();
  const onReview = vi.fn();
  render(
    <WordbookScreen
      entries={entries}
      dueCount={dueCount}
      sound={{ sourceOf: (e) => `src:${e.roman}`, play }}
      onOpenWord={onOpenWord}
      onReview={onReview}
    />,
  );
  return { play, onOpenWord, onReview };
}

test("WS1. 제목 · 단어 수 · 복습 CTA(복습 수) → onReview", () => {
  const { onReview } = mount();
  expect(screen.getByTestId(ids.screen).textContent).toContain("My words");
  expect(screen.getByTestId(ids.reviewCta).textContent).toContain("Review 1 word");
  fireEvent.tap(screen.getByTestId(ids.reviewCta), {});
  expect(onReview).toHaveBeenCalledTimes(1);
});

test("WS2. 복습할 단어가 없으면 CTA가 「Nothing to review today」로 눌리지 않음", () => {
  const { onReview } = mount(sampleEntries, 0);
  expect(screen.getByTestId(ids.reviewCta).textContent).toContain("Nothing to review today");
  fireEvent.tap(screen.getByTestId(ids.reviewCta), {});
  expect(onReview).not.toHaveBeenCalled();
});

test("WS3. 줄 — 한국어 · 로마자 · 뜻 · 에피소드 · 상태 칩", () => {
  mount();
  const row = screen.getByTestId(ids.row(2)).textContent ?? "";
  for (const part of ["주세요", "juseyo", "please give", "Ep 1", "Review"])
    expect(row).toContain(part);
  expect(screen.getByTestId(ids.row(3)).textContent).toContain("Got it");
});

test("WS4. 칩으로 거른다 — New 둘 · Review 하나 · Got it 하나 · All 넷, 선택 칩 표시", () => {
  mount();
  const rows = () => screen.queryAllByTestId(/^wordbook-row-\d+$/).length;
  expect(rows()).toBe(4);
  fireEvent.tap(screen.getByTestId(ids.filter("new")), {});
  expect(rows()).toBe(2);
  expect(screen.getByTestId(ids.filter("new"))).toHaveAttribute("data-selected", "true");
  fireEvent.tap(screen.getByTestId(ids.filter("review")), {});
  expect(rows()).toBe(1);
  fireEvent.tap(screen.getByTestId(ids.filter("known")), {});
  expect(rows()).toBe(1);
  fireEvent.tap(screen.getByTestId(ids.filter("all")), {});
  expect(rows()).toBe(4);
});

test("WS5. 줄을 누르면 자세히, 재생 단추는 소리만", () => {
  const { onOpenWord, play } = mount();
  fireEvent.tap(screen.getByTestId(ids.rowPlay(1)), {});
  expect(play).toHaveBeenCalledExactlyOnceWith("src:mul", false);
  expect(onOpenWord).not.toHaveBeenCalled();
  fireEvent.tap(screen.getByTestId(ids.row(1)), {});
  expect(onOpenWord).toHaveBeenCalledWith(sampleEntries[1]);
});

test("WS6. 단어가 없으면 빈 상태", () => {
  mount([], 0);
  expect(screen.getByTestId(ids.empty).textContent).toContain("No words yet");
});

// ---------------------------------------------------------------- 접근성 감사(ADR-0169 a11y)

test("WS7. 재생 단추는 줄 단추 밖(형제)이고 이름에 단어가 붙는다 · 누르는 요소는 flatten false", () => {
  mount();
  const row = screen.getByTestId(ids.row(1));
  const play = screen.getByTestId(ids.rowPlay(1));
  expect(row.contains(play)).toBe(false);
  expect(play).toHaveAttribute("accessibility-label", "Play, 물");
  for (const element of [
    row,
    play,
    screen.getByTestId(ids.reviewCta),
    screen.getByTestId(ids.filter("new")),
  ])
    expect(element).toHaveAttribute("flatten", "false");
});

test("WS8. 제목은 단어 수와 함께 한 번에 읽힌다", () => {
  mount();
  expect(screen.getByTestId("wordbook-title")).toHaveAttribute(
    "accessibility-label",
    "My words, 4",
  );
});
