import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";
import type { ChoiceRomanization } from "../../lib/session-options";
import { CatalogCoverScreen } from "./CatalogCoverScreen";
import type { CatalogCutView, CatalogCuts } from "./catalog-cover.contract";

// `ui` 계층(ADR-0188 개정 D7, 시안 B): 대사 상자 이름 줄 오른쪽의 「Romanization」 스위치 — 값의 주인은 앱(세션 옵션)이라
// 화면은 누름을 올리기만 하고, 다시 받은 값으로 로마자 줄을 그립니다. 다시 듣기 스피커는 대사 상자와 같은 면 색입니다.

const audio = vi.hoisted(() => ({
  playAudio: vi.fn<(source: string, onFinished: () => void) => string>(() => "started"),
  stopAudio: vi.fn<() => void>(),
}));
vi.mock("../../lib/audio", () => audio);

const insets = { top: 0, bottom: 0, left: 0, right: 0 };

const speech: CatalogCutView = {
  kind: "line",
  voice: "speech",
  index: 0,
  speaker: { kind: "named", name: "승무원" },
  text: {
    ko: "안녕하세요! 한국은 처음이세요?",
    en: "Hello! Is this your first time in Korea?",
    roman: "annyeonghaseyo! hangugeun cheoeumiseyo?",
  },
  aside: null,
  imageUrl: null,
  audioSource: "https://cdn/audio/u00/pre-1.m4a",
};
const narration: CatalogCutView = {
  kind: "narration",
  index: 1,
  text: { ko: "비행기가 내린다.", en: "The plane lands.", roman: "bihaenggiga naerinda." },
  imageUrl: null,
};
const cuts: CatalogCuts = [speech, narration];

function ui(
  romanization: ChoiceRomanization,
  onRomanizationChange?: (next: ChoiceRomanization) => void,
) {
  return (
    <CatalogCoverScreen
      stage="prologue"
      insets={insets}
      ordinal={1}
      cuts={cuts}
      onComplete={() => undefined}
      onExit={() => undefined}
      romanization={romanization}
      {...(onRomanizationChange === undefined ? {} : { onRomanizationChange })}
    />
  );
}

const settle = () =>
  act(() => {
    vi.advanceTimersByTime(5000);
  });
const switchControl = () => screen.getByTestId("ui-lynx-visual-novel-dialog-switch");
const tapSwitch = () => fireEvent.tap(switchControl(), { eventType: "catchEvent" });
const romanLine = () => screen.queryByTestId("ui-lynx-visual-novel-dialog-romanization");
const translation = () => screen.getByTestId("ui-lynx-visual-novel-dialog-translation");
const root = () => screen.getByTestId("catalog-cover-screen");
const tapNext = () =>
  fireEvent.tap(
    within(screen.getByTestId("catalog-cover-screen-next")).getByTestId("ui-lynx-button"),
    {},
  );

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  cleanup();
  backHandlers.runTop();
});

test("RS1. 켬 — 이름 줄 오른쪽에 「Romanization」 스위치(켬)가 서고, 줄 순서는 한국어 → 로마자 → 구분선 → 영어다", () => {
  render(ui("shown", () => undefined));
  settle();
  const row = screen.getByTestId("ui-lynx-visual-novel-dialog-speaker-row");
  expect(row.contains(switchControl())).toBe(true);
  expect(switchControl()).toHaveAttribute("data-checked", "true");
  expect(switchControl()).toHaveAttribute("accessibility-role-description", "switch");
  expect(switchControl()).toHaveAttribute("accessibility-label", "Romanization, on");
  const line = screen.getByTestId("ui-lynx-visual-novel-dialog-line");
  const roman = romanLine();
  const divider = screen.getByTestId("ui-lynx-visual-novel-dialog-divider");
  if (roman === null) throw new Error("로마자 줄이 없습니다");
  const follows = (a: Element, b: Element) =>
    Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
  expect(roman.textContent).toBe("annyeonghaseyo! hangugeun cheoeumiseyo?");
  expect(follows(line, roman)).toBe(true);
  expect(follows(roman, divider)).toBe(true);
  expect(follows(divider, translation())).toBe(true);
});

test("RS2. 스위치를 누르면 바뀐 뒤 값(hidden)을 한 번 올리고, 컷은 그대로다 — 값을 다시 받으면 로마자 줄만 빠진다", () => {
  const onChange = vi.fn<(next: ChoiceRomanization) => void>();
  const view = render(ui("shown", onChange));
  settle();
  tapSwitch();
  expect(onChange).toHaveBeenCalledTimes(1);
  expect(onChange).toHaveBeenCalledWith("hidden");
  expect(root()).toHaveAttribute("data-cut-index", "0");

  view.rerender(ui("hidden", onChange));
  expect(romanLine()).toBeNull();
  expect(translation()).toHaveTextContent("Hello! Is this your first time in Korea?");
  expect(screen.getByTestId("ui-lynx-visual-novel-dialog-divider")).toBeInTheDocument();
  expect(switchControl()).toHaveAttribute("data-checked", "false");
  expect(switchControl()).toHaveAttribute("accessibility-label", "Romanization, off");

  tapSwitch();
  expect(onChange).toHaveBeenLastCalledWith("shown");
});

test("RS3. 화자가 없는 내레이션 컷도 같은 자리(맨 위 줄 오른쪽)에 스위치가 서고, 쓰는 중에도 보인다", () => {
  render(ui("shown", () => undefined));
  settle();
  tapNext();
  expect(root()).toHaveAttribute("data-cut-index", "1");
  expect(screen.getByTestId("ui-lynx-visual-novel-dialog")).toHaveAttribute(
    "data-status",
    "revealing",
  );
  const header = screen.getByTestId("ui-lynx-visual-novel-dialog-header-row");
  expect(header.contains(switchControl())).toBe(true);
});

test("RS4. 스위치가 있으면 대사 낭독 요소가 따로 서고(로마자 포함), 스위치는 그 밖에서 닿는다", () => {
  render(ui("shown", () => undefined));
  settle();
  const reading = screen.getByTestId("ui-lynx-visual-novel-dialog-reading");
  expect(reading).toHaveAttribute(
    "accessibility-label",
    "승무원: 안녕하세요! 한국은 처음이세요?, Pronunciation: annyeonghaseyo! hangugeun cheoeumiseyo?, Hello! Is this your first time in Korea?",
  );
  for (let node = switchControl().parentElement; node !== null; node = node.parentElement) {
    expect(node.getAttribute("accessibility-element")).not.toBe("true");
    expect(node.getAttribute("accessibility-elements-hidden")).not.toBe("true");
  }
});

test("RS5. onRomanizationChange가 없으면 스위치를 그리지 않는다", () => {
  render(ui("shown"));
  expect(screen.queryByTestId("ui-lynx-visual-novel-dialog-switch")).toBeNull();
});

test("RS6. 다시 듣기 스피커는 대사 상자와 같은 면(dialog 톤)이다 — 소리 있는 컷 · 없는 컷 모두", () => {
  render(ui("shown", () => undefined));
  const replay = () => screen.getByTestId("catalog-cover-screen-replay");
  const frame = (element: Element) => element.closest(".sentence-replay");
  expect(replay().getAttribute("data-state")).toBe("available");
  expect(frame(replay())?.getAttribute("class")).toContain("sentence-replay-dialog");
  settle();
  tapNext();
  expect(replay().getAttribute("data-state")).toBe("unavailable");
  expect(frame(replay())?.getAttribute("class")).toContain("sentence-replay-dialog");
  expect(replay().getAttribute("class")).toContain("audio-unavailable-control-dialog");
});
