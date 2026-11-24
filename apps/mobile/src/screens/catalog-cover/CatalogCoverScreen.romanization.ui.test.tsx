import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";
import type { ChoiceRomanization } from "../../lib/session-options";
import { CatalogCoverScreen } from "./CatalogCoverScreen";
import type { CatalogCutView, CatalogCuts } from "./catalog-cover.contract";

// `ui` 계층(ADR-0188 D2): 컷 대사 아래 로마자 줄이 스위치를 따르는지 봅니다 — 켬이면 로마자 · 영어 두 줄이고 토글이 없으며,
// 끔이면 이 변경 전처럼 영어 한 줄 · 누르면 로마자입니다.

const insets = { top: 0, bottom: 0, left: 0, right: 0 };

const speech: CatalogCutView = {
  kind: "line",
  voice: "speech",
  index: 0,
  speaker: { kind: "named", name: "점원" },
  text: { ko: "어서 오세요.", en: "Welcome.", roman: "eoseo oseyo." },
  aside: null,
  imageUrl: null,
};
const noRoman: CatalogCutView = {
  kind: "narration",
  index: 1,
  text: { ko: "같이 가요.", en: "Let's go.", roman: null },
  imageUrl: null,
};
const cuts: CatalogCuts = [speech, noRoman];

function mount(romanization?: ChoiceRomanization) {
  render(
    <CatalogCoverScreen
      stage="interlude"
      insets={insets}
      ordinal={1}
      cuts={cuts}
      onComplete={() => undefined}
      onExit={() => undefined}
      {...(romanization === undefined ? {} : { romanization })}
    />,
  );
  settle();
}
const settle = () =>
  act(() => {
    vi.advanceTimersByTime(5000);
  });
const line = () => screen.getByTestId("catalog-cover-screen-line");
const tapLine = () => fireEvent.tap(line(), { eventType: "catchEvent" });
const romanLine = () => screen.queryByTestId("ui-lynx-visual-novel-dialog-romanization");
const translation = () => screen.getByTestId("ui-lynx-visual-novel-dialog-translation");

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  cleanup();
  backHandlers.runTop();
});

test("CCR-U1. 켬이면 로마자 줄과 영어 줄이 함께 서고, 대사 상자는 토글이 아니다(눌러도 그대로)", () => {
  mount("shown");
  expect(romanLine()?.textContent).toBe("eoseo oseyo.");
  expect(translation().textContent).toBe("Welcome.");
  expect(line().getAttribute("accessibility-traits")).toBe("text");
  expect(line().getAttribute("accessibility-label")).toBe(
    "점원: 어서 오세요., Pronunciation: eoseo oseyo., Welcome.",
  );
  tapLine();
  expect(romanLine()?.textContent).toBe("eoseo oseyo.");
  expect(translation().textContent).toBe("Welcome.");
});

test("CCR-U2. 켬 · 콘텐츠 로마자가 없는 컷은 한글을 변환한 읽기가 선다", () => {
  mount("shown");
  fireEvent.tap(screen.getByTestId("ui-lynx-button"), {});
  settle();
  expect(romanLine()?.textContent).toBe("gachi gayo.");
});

test.each([["hidden" as const], [undefined]])(
  "CCR-U3. 끔(%s)이면 로마자 줄이 없고 영어 ↔ 로마자 토글이 그대로다",
  (romanization) => {
    mount(romanization);
    expect(romanLine()).toBeNull();
    expect(translation().textContent).toBe("Welcome.");
    expect(line().getAttribute("accessibility-traits")).toBe("button");
    tapLine();
    expect(translation().textContent).toBe("eoseo oseyo.");
  },
);
