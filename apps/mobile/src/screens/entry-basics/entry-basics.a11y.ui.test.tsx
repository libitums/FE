import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";
import { MotionProvider } from "@libitums/ui-lynx/motion";

import { uiCopyEn } from "../../lib/ui-copy-en";
import { EntryBasicsComposeScreen } from "./EntryBasicsComposeScreen";
import { EntryBasicsLettersScreen } from "./EntryBasicsLettersScreen";
import { EntryBasicsReadyScreen } from "./EntryBasicsReadyScreen";
import { entryBasicsTestIds as ids } from "./entry-basics.contract";

// `ui` 계층: 기초 세 화면의 스크린리더 경로(접근성 감사, ADR-0176).

let announced: string[];

beforeEach(() => {
  vi.useFakeTimers();
  announced = [];
  vi.stubGlobal("NativeModules", {
    LynxAccessibilityModule: {
      accessibilityAnnounce: (args: { content: string }) => void announced.push(args.content),
    },
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const noop = () => {};
const tiles = ["ㅏ", "ㄷ", "ㄱ", "ㅗ", "ㄴ", "ㅓ"];
const tile = (letter: string) => screen.getByTestId(`compose-tile-${tiles.indexOf(letter)}`);
const next = () =>
  fireEvent.tap(within(screen.getByTestId(ids.next)).getByTestId("ui-lynx-button"), {});
const inTree = (element: HTMLElement) => {
  expect(element).toHaveAttribute("flatten", "false");
  expect(element).toHaveAttribute("accessibility-element", "true");
};
const enableTap = (element: HTMLElement, value: "true" | "false") =>
  expect(element).toHaveAttribute("accessibility-enable-tap", value);

function mountCompose(motion: "standard" | "reduced" = "standard") {
  render(
    <MotionProvider motion={motion}>
      <EntryBasicsComposeScreen
        romanization="shown"
        autoPlay="off"
        sound={{
          sourceOf: (syllable) => `src:${syllable}`,
          letterSourceOf: () => null,
          play: noop,
        }}
        onNext={noop}
        onBack={noop}
        onSkip={noop}
      />
    </MotionProvider>,
  );
}

test.each([
  ["있으면", (letter: string) => `clip:${letter}`, "true"],
  ["없으면", () => null, "false"],
] as const)(
  "BA1. 글자 칸 — 소리가 %s 두 번 탭 가능 여부가 따라간다",
  (_label, letterSourceOf, value) => {
    render(
      <EntryBasicsLettersScreen
        sound={{ sourceOf: () => null, letterSourceOf, play: noop }}
        onNext={noop}
        onBack={noop}
        onSkip={noop}
      />,
    );
    enableTap(screen.getByTestId(ids.letter(0)), value);
    inTree(screen.getByTestId(ids.title));
    inTree(screen.getByTestId(ids.lead));
    expect(screen.getByTestId(ids.title)).toHaveAttribute("accessibility-heading", "true");
  },
);

test("BA2. 합치기 — 타일 · 칸 · 재생이 TalkBack으로 눌리고 문제 글이 읽힌다", () => {
  mountCompose();
  inTree(screen.getByTestId(ids.title));
  inTree(screen.getByTestId("compose-make"));
  enableTap(screen.getByTestId("compose-play"), "true");
  enableTap(tile("ㄱ"), "true");
  enableTap(screen.getByTestId("compose-slot-c"), "false");

  fireEvent.tap(tile("ㄱ"), {});

  enableTap(screen.getByTestId("compose-slot-c"), "true");
  enableTap(tile("ㄱ"), "false");
  expect(tile("ㄱ")).toHaveAttribute("accessibility-label", "ㄱ, g, used");
  expect(screen.getByTestId("compose-slot-c")).toHaveAttribute(
    "accessibility-label",
    "Consonant, ㄱ, g",
  );
});

test("BA3. 문제 순번은 「n of 3」으로 읽힌다", () => {
  mountCompose();
  expect(screen.getByTestId("entry-basics-count")).toHaveAttribute(
    "accessibility-label",
    "Letter building, question 1 of 3",
  );
});

test("BA4. 판정 글도 트리에 남는다", () => {
  mountCompose();
  fireEvent.tap(tile("ㄱ"), {});
  fireEvent.tap(tile("ㅏ"), {});
  inTree(screen.getByTestId("answer-verdict"));
});

test("BA5. Next · Try again 뒤 바뀐 문제를 읽어 준다", () => {
  mountCompose();
  fireEvent.tap(tile("ㄱ"), {});
  fireEvent.tap(tile("ㅏ"), {});
  next();
  expect(announced).toContain("Make “neo”");

  fireEvent.tap(tile("ㄱ"), {});
  fireEvent.tap(tile("ㅏ"), {});
  announced.length = 0;
  next();
  expect(announced).toEqual(["Make “neo”"]);
});

test("BA6. 마지막 Continue는 보이지 않는 완료 문구를 읽지 않는다(문장 낭독을 끊지 않게)", () => {
  mountCompose();
  for (const pair of ["ㄱㅏ", "ㄴㅓ", "ㄷㅗ"]) {
    for (const letter of pair) fireEvent.tap(tile(letter), {});
    next();
  }
  expect(announced).not.toContain(uiCopyEn.more.compose.complete);
});

test("BA7. 동작 줄이기면 타일이 눌림에 줄지 않는다", () => {
  mountCompose("reduced");
  expect(tile("ㄱ").getAttribute("class")).toContain("syllable-tile-motion-reduced");
});

test("BA8. 준비 완료의 제목은 보이기 전부터 읽을 수 있다", () => {
  render(
    <EntryBasicsReadyScreen
      safeArea={{ top: 0, bottom: 0 }}
      planeUrl={null}
      onNext={noop}
      onBack={noop}
    />,
  );
  const title = screen.getByTestId(ids.title);
  inTree(title);
  expect(title).toHaveAttribute("accessibility-label", "You just read Korean!");
  expect(title).toHaveAttribute("accessibility-heading", "true");
  expect(title.getAttribute("class")).not.toContain("entry-basics-reveal-waiting");
  act(() => {
    vi.advanceTimersByTime(0);
  });
});
