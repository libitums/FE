import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { CatalogFinalScreen } from "./CatalogFinalScreen";
import type { CatalogRoleplayTurn } from "./catalog-final.contract";

// `ui` 계층: 고정 타일(튜토리얼의 「안녕하세요!」) — 턴이 열릴 때부터 대답 줄 맨 앞에 놓여 있고, 눌러도 빠지지
// 않으며, 타일 창고에는 서지 않습니다. 다음 턴의 고정 타일도 넘어갈 때 놓입니다.

const insets = { top: 0, bottom: 0, left: 0, right: 0 };

const greeting: CatalogRoleplayTurn = {
  id: "RP-01",
  instruction: "What do you say?",
  line: { ko: "안녕하세요! 한국은 처음이세요?", roman: null, en: null },
  tiles: [
    { ko: "처음이에요!", roman: "" },
    { ko: "안녕하세요!", roman: "" },
    { ko: "네,", roman: "" },
  ],
  accepted: ["안녕하세요! 네, 처음이에요!"],
  replyTranslation: null,
  imageUrl: null,
  fixedTiles: [1],
};
const thanks: CatalogRoleplayTurn = {
  ...greeting,
  id: "RP-02",
  line: { ko: "안녕하세요! 또 오셨네요.", roman: null, en: null },
  tiles: [
    { ko: "또", roman: "" },
    { ko: "안녕하세요!", roman: "" },
  ],
  accepted: ["안녕하세요! 또"],
  fixedTiles: [1],
};

afterEach(() => {
  cleanup();
});

function mount() {
  render(
    <CatalogFinalScreen
      insets={insets}
      ordinal={0}
      counterpartName="승무원"
      turns={[greeting, thanks]}
      onFinish={vi.fn()}
      onExit={vi.fn()}
    />,
  );
}

const reply = () => screen.getByTestId("catalog-final-screen-reply");
const bank = () => screen.getByTestId("catalog-final-screen-bank");
const actionButton = () =>
  within(screen.getByTestId("catalog-final-screen-action")).getByTestId("ui-lynx-button");

test("FX1. 고정 타일은 처음부터 대답 줄 맨 앞에 있고 눌러도 빠지지 않으며 창고에 없다", () => {
  mount();
  const fixed = within(reply()).getByTestId("sentence-order-chip-1");
  expect(fixed).toHaveTextContent("안녕하세요!");
  expect(within(bank()).queryByTestId("sentence-order-chip-1")).toBeNull();
  expect(within(bank()).queryByTestId("sentence-order-bank-slot-1")).toBeNull();

  fireEvent.tap(fixed, {});
  expect(within(reply()).getByTestId("sentence-order-chip-1")).toBeTruthy();
});

test("FX2. 나머지를 놓아 맞히면 정답이고, 다음 턴도 고정 타일이 놓인 채로 열린다", () => {
  mount();
  fireEvent.tap(within(bank()).getByTestId("sentence-order-chip-2"), {});
  fireEvent.tap(within(bank()).getByTestId("sentence-order-chip-0"), {});
  fireEvent.tap(actionButton(), {});
  expect(
    within(screen.getByTestId("catalog-final-screen-verdict")).getByTestId("answer-verdict"),
  ).toHaveAttribute("data-result", "correct");

  fireEvent.tap(actionButton(), {});
  expect(within(reply()).getByTestId("sentence-order-chip-1")).toHaveTextContent("안녕하세요!");
  expect(within(bank()).getByTestId("sentence-order-chip-0")).toHaveTextContent("또");
});
