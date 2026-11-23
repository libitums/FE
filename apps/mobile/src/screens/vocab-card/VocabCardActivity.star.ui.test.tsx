import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";
import { VocabCardActivity } from "./VocabCardActivity";
import type { VocabCardQuestion, VocabCardStarPort } from "./vocab-card.contract";

// `ui` 계층: 단어 카드의 별(ADR-0169 즐겨찾기 개정) — 카드마다 처음 상태를 한 번 읽고, 누르면 그 카드 순번 · 새 값을 올리며 모양이 바로
// 바뀐다. 별을 달 수 없는 카드(null)와 포트가 없는 화면에는 별이 없다. 낭독 순서는 표제어 → 뜻 → 별.

afterEach(() => {
  cleanup();
  if (backHandlers.runTop()) throw new Error("뒤로가기 핸들러가 정리되지 않았습니다");
});

const card = (word: string, meaning: string): VocabCardQuestion => ({
  word,
  romanization: null,
  meaning,
  example: null,
});
const cards = [card("물", "water"), card("네", "yes"), card("오다", "to come")];

function mount(initial: readonly (boolean | null)[] | null) {
  const toggle = vi.fn<VocabCardStarPort["toggle"]>();
  const read = vi.fn(() => initial ?? []);
  render(
    <VocabCardActivity
      questions={cards}
      onExit={() => {}}
      onFinish={() => {}}
      {...(initial === null ? {} : { star: { initial: read, toggle } })}
    />,
  );
  return { toggle, read };
}

const star = () => screen.queryByTestId("vocab-card-star");
const next = () =>
  fireEvent.tap(within(screen.getByTestId("vocab-card-got-it")).getByTestId("ui-lynx-button"), {});

test("VC-S1. 첫 카드의 별은 처음 상태(꺼짐) · 이름 「Star 물」, 누르면 켜지고 toggle(0, true), 다시 누르면 toggle(0, false)", () => {
  const { toggle, read } = mount([false, null, true]);
  expect(read).toHaveBeenCalledTimes(1);
  expect(star()).toHaveAttribute("accessibility-label", "Star 물");
  fireEvent.tap(star()!, {});
  expect(toggle).toHaveBeenLastCalledWith(0, true);
  expect(star()).toHaveAttribute("accessibility-label", "Star 물, selected");
  expect(star()).toHaveAttribute("data-starred", "true");
  fireEvent.tap(star()!, {});
  expect(toggle).toHaveBeenLastCalledWith(0, false);
  expect(star()).toHaveAttribute("data-starred", "false");
});

test("VC-S2. 별을 달 수 없는 카드(null)에는 별이 없고, 다음 카드는 자기 처음 상태(켜짐)로 선다 — 읽기는 한 번", () => {
  const { read } = mount([false, null, true]);
  next();
  expect(screen.getByTestId("vocab-card-word")).toHaveTextContent("네");
  expect(star()).toBeNull();
  next();
  expect(star()).toHaveAttribute("data-starred", "true");
  expect(star()).toHaveAttribute("accessibility-label", "Star 오다, selected");
  expect(read).toHaveBeenCalledTimes(1);
});

test("VC-S3. 포트가 없으면 별이 없다 · 있으면 별은 뜻 뒤(낭독 순서)", () => {
  mount(null);
  expect(star()).toBeNull();
  cleanup();
  mount([true, null, null]);
  const content = screen.getByTestId("vocab-card-content");
  const order = [...content.querySelectorAll("[data-testid]")].map((node) =>
    node.getAttribute("data-testid"),
  );
  expect(order.indexOf("vocab-card-star")).toBeGreaterThan(order.indexOf("vocab-card-meaning"));
});
