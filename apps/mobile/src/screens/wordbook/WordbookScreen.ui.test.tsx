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
  const onToggleStar = vi.fn();
  const onFilterChange = vi.fn();
  render(
    <WordbookScreen
      entries={entries}
      dueCount={dueCount}
      sound={{ sourceOf: (e) => `src:${e.roman}`, play }}
      onOpenWord={onOpenWord}
      onReview={onReview}
      onToggleStar={onToggleStar}
      onFilterChange={onFilterChange}
    />,
  );
  return { play, onOpenWord, onReview, onToggleStar, onFilterChange };
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

// ---------------------------------------------------------------- 즐겨찾기(ADR-0169 즐겨찾기 개정)

const withStar = (index: number) =>
  sampleEntries.map((entry, i) =>
    i === index ? { ...entry, record: { ...entry.record, starred: true as const } } : entry,
  );
const rowCount = () => screen.queryAllByTestId(/^wordbook-row-\d+$/).length;

test("WS-S1. 줄마다 별 — 줄 단추 밖 형제 · 이름에 단어 · 켜진 줄은 selected, 누르면 onToggleStar(그 줄, 반대 값)", () => {
  const entries = withStar(1);
  const { onToggleStar, onOpenWord } = mount(entries);
  const row = screen.getByTestId(ids.row(1));
  const star = screen.getByTestId(ids.rowStar(1));
  expect(row.contains(star)).toBe(false);
  expect(star).toHaveAttribute("accessibility-label", "Star 물, selected");
  expect(screen.getByTestId(ids.rowStar(0))).toHaveAttribute(
    "accessibility-label",
    "Star 감사합니다",
  );
  fireEvent.tap(star, {});
  expect(onToggleStar).toHaveBeenCalledExactlyOnceWith(entries[1], false);
  fireEvent.tap(screen.getByTestId(ids.rowStar(0)), {});
  expect(onToggleStar).toHaveBeenLastCalledWith(entries[0], true);
  expect(onOpenWord).not.toHaveBeenCalled();
});

test("WS-S2. 칩은 All · Starred · New · Review · Got it, Starred는 별 단 줄만 · 칩을 바꾸면 onFilterChange", () => {
  const { onFilterChange } = mount(withStar(2));
  const chips = screen
    .queryAllByTestId(/^wordbook-filter-[a-z]+$/)
    .map((chip) => chip.getAttribute("data-testid"));
  expect(chips).toEqual([
    "wordbook-filter-all",
    "wordbook-filter-starred",
    "wordbook-filter-new",
    "wordbook-filter-review",
    "wordbook-filter-known",
  ]);
  expect(screen.getByTestId(ids.filter("starred")).textContent).toContain("Starred");
  fireEvent.tap(screen.getByTestId(ids.filter("starred")), {});
  expect(onFilterChange).toHaveBeenCalledExactlyOnceWith("starred");
  expect(rowCount()).toBe(1);
  expect(screen.getByTestId(ids.row(2)).textContent).toContain("주세요");
  expect(screen.getByTestId(ids.filter("starred"))).toHaveAttribute(
    "accessibility-label",
    "Starred, selected",
  );
});

test("WS-S3. 같은 칩을 다시 누르면 이벤트를 내지 않는다", () => {
  const { onFilterChange } = mount();
  fireEvent.tap(screen.getByTestId(ids.filter("all")), {});
  expect(onFilterChange).not.toHaveBeenCalled();
});

test("WS-S5. Starred에서 별을 떼도 그 줄은 꺼진 별로 남고(초점 유지), 칩을 바꿔 돌아오면 빠진다", () => {
  const entries = withStar(1);
  // 별을 떼면 부모가 새 단어장(별 없음)으로 다시 그립니다 — rerender로 그 모습을 봅니다.
  const view = render(
    <WordbookScreen
      entries={entries}
      dueCount={1}
      sound={{ sourceOf: () => null, play: () => {} }}
      onOpenWord={() => {}}
      onReview={() => {}}
      onToggleStar={() => {}}
      onFilterChange={() => {}}
    />,
  );
  fireEvent.tap(screen.getByTestId(ids.filter("starred")), {});
  fireEvent.tap(screen.getByTestId(ids.rowStar(1)), {});
  view.rerender(
    <WordbookScreen
      entries={sampleEntries}
      dueCount={1}
      sound={{ sourceOf: () => null, play: () => {} }}
      onOpenWord={() => {}}
      onReview={() => {}}
      onToggleStar={() => {}}
      onFilterChange={() => {}}
    />,
  );
  expect(screen.getByTestId(ids.rowStar(1))).toHaveAttribute("data-starred", "false");
  expect(screen.queryByTestId(ids.emptyStarred)).toBeNull();
  fireEvent.tap(screen.getByTestId(ids.filter("all")), {});
  fireEvent.tap(screen.getByTestId(ids.filter("starred")), {});
  expect(screen.getByTestId(ids.emptyStarred)).toBeInTheDocument();
});

test("WS-S6. 빈 안내 제목은 머리(헤딩 탐색으로 닿음)", () => {
  mount();
  fireEvent.tap(screen.getByTestId(ids.filter("starred")), {});
  expect(
    screen.getByTestId(ids.emptyStarred).querySelector('[accessibility-traits="header"]'),
  ).not.toBeNull();
});

test("WS-S4. Starred가 비면 빈 안내(별을 누르라는 말) — 단어장 자체의 빈 상태와 다르다", () => {
  mount();
  fireEvent.tap(screen.getByTestId(ids.filter("starred")), {});
  expect(rowCount()).toBe(0);
  const empty = screen.getByTestId(ids.emptyStarred);
  expect(empty.textContent).toContain("No starred words yet");
  expect(empty.textContent).toContain("Tap the star on a word to keep it here.");
  expect(screen.queryByTestId(ids.empty)).toBeNull();
});
