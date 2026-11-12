import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import * as soundEffects from "../../lib/sound-effects";
import { correctionSegmentsOf } from "./correction-segments";
import { MyMessageRow } from "./MyMessage";
import type { MyMessageRowProps } from "./my-message.contract";
import { myMessageTestIds as ids } from "./my-message.contract";
import type { MyBubbleView, BubbleToolRow } from "./my-message-state";

// `ui` 계층(MC2-UI1 · UI2 · UI3): 내 말풍선 compound — 보기 다섯 각각이 무엇으로 그려지는지 · 아이콘 줄 ·
// 접근성 · 움직임 줄이기. 보기 · 아이콘 줄 계산은 unit(my-message-state)이 진다.
// 가정(구현자가 따를 것): 말풍선 낭독 라벨은 `bubble` 요소나 그 안 `accessibility-label` 요소, 단추 라벨 · 값은
// `toolMeaning` · `toolFix` 요소나 그 안 요소에 있다. 스켈레톤 정지 클래스는 `messenger-chat-skeleton-still`.

vi.mock("../../lib/sound-effects", async (importOriginal) => ({
  ...(await importOriginal<typeof soundEffects>()),
  playSound: vi.fn<(name: string) => void>(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(cleanup);

const CORRECTION = {
  corrected: "저는 주말에 카페에 갔어요.",
  changes: [
    { start: 1, end: 2 },
    { start: 9, end: 10 },
  ],
  explanation: "Add 는 after 저 and 에 after 카페.",
} as const;
const MEANING = { romanization: "annyeonghaseyo", meaning: "Hello" } as const;

const NO_FIX: BubbleToolRow = { meaning: "off", fix: { kind: "hidden" } };

function mount(over: Partial<MyMessageRowProps> = {}) {
  const onToggle = vi.fn<(tool: "meaning" | "fix") => void>();
  const props: MyMessageRowProps = {
    messageId: "m1",
    ko: "안녕하세요",
    speaker: "Hana",
    view: { kind: "closed" },
    tools: NO_FIX,
    motion: "standard",
    onToggle,
    ...over,
  };
  render(<MyMessageRow {...props} />);
  return { onToggle };
}

const byId = (testId: string): HTMLElement => screen.getByTestId(testId);
const hasId = (testId: string): boolean => screen.queryByTestId(testId) !== null;
/** 요소 자신이나 안쪽에서 처음 만나는 속성 값입니다. */
const attrOf = (testId: string, name: string): string | null => {
  const el = byId(testId);
  if (el.hasAttribute(name)) return el.getAttribute(name);
  return el.querySelector(`[${name}]`)?.getAttribute(name) ?? null;
};
/** a가 b보다 문서에서 앞인가. */
const before = (a: HTMLElement, b: HTMLElement): boolean =>
  (a.compareDocumentPosition(b) & 4) !== 0;
// 도구 단추는 catchtap입니다 — 탭이 로그까지 올라가 열린 키보드를 접지 않게 막습니다(접근성 M7).
const tap = (testId: string): void => {
  fireEvent.tap(byId(testId), { eventType: "catchEvent" });
};

// ------------------------------------------------------------------ MC2-UI1 보기 다섯

test("MC2-UI1. closed: 말풍선에 한국어만 있다 — 번역 줄 · 뜻 · 카드가 없고 ui-lynx 말풍선이 아니다", () => {
  mount();

  const bubble = byId(ids.bubble);
  expect(bubble.getAttribute("data-view")).toBe("closed");
  expect(bubble.textContent?.trim()).toBe("안녕하세요");
  expect(hasId(ids.meaningSkeleton)).toBe(false);
  expect(hasId(ids.meaning)).toBe(false);
  expect(hasId(ids.fixCard)).toBe(false);
  expect(hasId(ids.fixSkeleton)).toBe(false);
  expect(screen.queryByTestId("ui-lynx-chat-bubble")).toBeNull();
  expect(hasId(ids.stack)).toBe(true);
});

test("MC2-UI1. meaning-loading: 뜻 스켈레톤이 말풍선 안에 선다(같은 상자 안)", () => {
  mount({ view: { kind: "meaning-loading" } });

  const bubble = byId(ids.bubble);
  expect(bubble.getAttribute("data-view")).toBe("meaning-loading");
  expect(bubble.contains(byId(ids.meaningSkeleton))).toBe(true);
  expect(byId(ids.meaningSkeleton).getAttribute("data-motion")).toBe("standard");
  expect(hasId(ids.meaning)).toBe(false);
  expect(hasId(ids.fixSkeleton)).toBe(false);
});

test("MC2-UI1. meaning: 로마자와 뜻이 말풍선 안 같은 자리에 선다(스켈레톤은 사라진다)", () => {
  mount({ view: { kind: "meaning", meaning: MEANING } });

  const bubble = byId(ids.bubble);
  expect(bubble.getAttribute("data-view")).toBe("meaning");
  expect(bubble.contains(byId(ids.meaning))).toBe(true);
  expect(byId(ids.meaningRoman).textContent?.trim()).toBe("annyeonghaseyo");
  expect(byId(ids.meaningText).textContent?.trim()).toBe("Hello");
  expect(bubble.textContent).toContain("안녕하세요");
  expect(hasId(ids.meaningSkeleton)).toBe(false);
  // 로마자가 먼저, 뜻이 그 뒤.
  expect(before(byId(ids.meaningRoman), byId(ids.meaningText))).toBe(true);
});

test("MC2-UI1. fix-loading: 카드 스켈레톤이 말풍선 다음 · 아이콘 줄 앞에 서고 BETTER 글은 바로 보인다", () => {
  mount({
    view: { kind: "fix-loading" },
    tools: { meaning: "off", fix: { kind: "shown", state: "on", dot: "hidden" } },
  });

  const bubble = byId(ids.bubble);
  const skeleton = byId(ids.fixSkeleton);
  expect(bubble.contains(skeleton)).toBe(false);
  expect(before(bubble, skeleton)).toBe(true);
  expect(before(skeleton, byId(ids.tools))).toBe(true);
  expect(skeleton.textContent).toContain("BETTER");
  expect(hasId(ids.fixCard)).toBe(false);
  expect(hasId(ids.meaningSkeleton)).toBe(false);
});

test("MC2-UI1. fix: 카드 조각 수 · 바뀐 조각 수 · 설명이 그려지고 순서는 말풍선 → 카드 → 아이콘 줄이다", () => {
  mount({
    view: { kind: "fix", correction: CORRECTION },
    tools: { meaning: "off", fix: { kind: "shown", state: "on", dot: "hidden" } },
  });

  const segments = correctionSegmentsOf(CORRECTION.corrected, CORRECTION.changes);
  const card = byId(ids.fixCard);
  segments.forEach((segment, index) => {
    const el = byId(ids.fixSegment(index));
    expect(el.textContent).toBe(segment.text);
    expect(el.getAttribute("data-kind")).toBe(segment.kind);
  });
  expect(hasId(ids.fixSegment(segments.length))).toBe(false);
  const changed = segments.filter((segment) => segment.kind === "changed").length;
  expect(changed).toBe(2);
  expect(card.querySelectorAll('[data-kind="changed"]')).toHaveLength(changed);
  expect(byId(ids.fixExplanation).textContent?.trim()).toBe(CORRECTION.explanation);
  expect(card.textContent).toContain("BETTER");
  expect(card.textContent).toContain(CORRECTION.corrected);

  const bubble = byId(ids.bubble);
  expect(bubble.contains(card)).toBe(false);
  expect(before(bubble, card)).toBe(true);
  expect(before(card, byId(ids.tools))).toBe(true);
  expect(hasId(ids.fixSkeleton)).toBe(false);
});

test("MC2-UI1. 보기가 바뀌어도 말풍선 요소는 하나이고 글(한국어)은 그대로다", () => {
  const views: readonly MyBubbleView[] = [
    { kind: "closed" },
    { kind: "meaning-loading" },
    { kind: "meaning", meaning: MEANING },
    { kind: "fix-loading" },
    { kind: "fix", correction: CORRECTION },
  ];
  for (const view of views) {
    mount({ view });
    expect(screen.getAllByTestId(ids.bubble)).toHaveLength(1);
    expect(byId(ids.bubble).textContent).toContain("안녕하세요");
    cleanup();
  }
});

// ------------------------------------------------------------------ MC2-UI2 아이콘 줄

test("MC2-UI2. 해석 단추는 늘 있고, 교정이 없으면 고친 문장 단추는 없다", () => {
  mount();

  const tools = byId(ids.tools);
  expect(within(tools).getByTestId(ids.toolMeaning)).toBeTruthy();
  expect(hasId(ids.toolFix)).toBe(false);
});

test("MC2-UI2. 교정이 있으면 해석 → 고친 문장 순으로 서고, 점이 보이면 줄 안에 점 요소와 data-dot=shown이 있다", () => {
  mount({ tools: { meaning: "off", fix: { kind: "shown", state: "off", dot: "shown" } } });

  const tools = byId(ids.tools);
  expect(before(byId(ids.toolMeaning), byId(ids.toolFix))).toBe(true);
  expect(byId(ids.toolFix).getAttribute("data-dot")).toBe("shown");
  expect(tools.querySelector(".my-message-dot")).not.toBeNull();
});

test("MC2-UI2. 점이 hidden이면 점 요소가 없고 data-dot=hidden이다", () => {
  mount({ tools: { meaning: "off", fix: { kind: "shown", state: "off", dot: "hidden" } } });

  expect(byId(ids.toolFix).getAttribute("data-dot")).toBe("hidden");
  expect(byId(ids.tools).querySelector(".my-message-dot")).toBeNull();
});

test("MC2-UI2. 켜짐 상태: data-state가 on · off로 바뀌고 켜짐은 다른 클래스를 가진다(속성 선택자 없이)", () => {
  mount({ tools: { meaning: "on", fix: { kind: "shown", state: "off", dot: "hidden" } } });
  expect(byId(ids.toolMeaning).getAttribute("data-state")).toBe("on");
  expect(byId(ids.toolFix).getAttribute("data-state")).toBe("off");
  const onClass = byId(ids.toolMeaning).className;
  const offClass = byId(ids.toolFix).className;
  cleanup();

  mount({ tools: { meaning: "off", fix: { kind: "shown", state: "on", dot: "hidden" } } });
  expect(byId(ids.toolMeaning).getAttribute("data-state")).toBe("off");
  expect(byId(ids.toolFix).getAttribute("data-state")).toBe("on");
  // 같은 단추의 켜짐 / 꺼짐 클래스가 다르다.
  expect(byId(ids.toolMeaning).className).not.toBe(onClass);
  expect(byId(ids.toolFix).className).not.toBe(offClass);
});

test("MC2-UI2. 탭 → onToggle이 해당 도구로 한 번 불리고 효과음은 나지 않는다", () => {
  const { onToggle } = mount({
    tools: { meaning: "off", fix: { kind: "shown", state: "off", dot: "shown" } },
  });

  tap(ids.toolMeaning);
  expect(onToggle).toHaveBeenCalledTimes(1);
  expect(onToggle).toHaveBeenLastCalledWith("meaning");
  tap(ids.toolFix);
  expect(onToggle).toHaveBeenCalledTimes(2);
  expect(onToggle).toHaveBeenLastCalledWith("fix");
  expect(vi.mocked(soundEffects.playSound)).not.toHaveBeenCalled();
});

test("MC2-UI2. 낭독: 두 단추 모두 button trait · 라벨 · 접힘 / 펼침 값을 갖는다", () => {
  mount({ tools: { meaning: "on", fix: { kind: "shown", state: "off", dot: "hidden" } } });

  expect(attrOf(ids.toolMeaning, "accessibility-traits")).toBe("button");
  expect(attrOf(ids.toolMeaning, "accessibility-label")).toBe("See the meaning");
  expect(attrOf(ids.toolMeaning, "accessibility-value")).toBe("Expanded");
  expect(attrOf(ids.toolFix, "accessibility-traits")).toBe("button");
  expect(attrOf(ids.toolFix, "accessibility-label")).toBe("See a better way to say it");
  expect(attrOf(ids.toolFix, "accessibility-value")).toBe("Collapsed");
});

test("MC2-UI2. 점이 보이면 고친 문장 단추 라벨이 「…, new」이고 열면 일반 라벨로 돌아온다", () => {
  mount({ tools: { meaning: "off", fix: { kind: "shown", state: "off", dot: "shown" } } });
  expect(attrOf(ids.toolFix, "accessibility-label")).toBe("See a better way to say it, new");
  cleanup();

  mount({ tools: { meaning: "off", fix: { kind: "shown", state: "on", dot: "hidden" } } });
  expect(attrOf(ids.toolFix, "accessibility-label")).toBe("See a better way to say it");
  expect(attrOf(ids.toolFix, "accessibility-value")).toBe("Expanded");
});

// ------------------------------------------------------------------ MC2-UI3 움직임 줄이기 · 낭독

test("MC2-UI3. 움직임 줄이기: 두 스켈레톤에 data-motion=reduced와 정지 클래스가 붙는다", () => {
  mount({ view: { kind: "meaning-loading" }, motion: "reduced" });
  expect(byId(ids.meaningSkeleton).getAttribute("data-motion")).toBe("reduced");
  expect(byId(ids.meaningSkeleton).className).toContain("messenger-chat-skeleton-still");
  cleanup();

  mount({ view: { kind: "fix-loading" }, motion: "reduced" });
  expect(byId(ids.fixSkeleton).getAttribute("data-motion")).toBe("reduced");
  expect(byId(ids.fixSkeleton).className).toContain("messenger-chat-skeleton-still");
});

test("MC2-UI3. 기본 움직임에서는 스켈레톤에 정지 클래스가 없다", () => {
  mount({ view: { kind: "meaning-loading" } });
  expect(byId(ids.meaningSkeleton).className).not.toContain("messenger-chat-skeleton-still");
  cleanup();

  mount({ view: { kind: "fix-loading" } });
  expect(byId(ids.fixSkeleton).className).not.toContain("messenger-chat-skeleton-still");
});

test("MC2-UI3. 말풍선은 한 요소로 읽히고 라벨은 「이름: 글」(뜻이 열리면 로마자 · 뜻까지)이다", () => {
  mount();
  expect(attrOf(ids.bubble, "accessibility-label")).toBe("Hana: 안녕하세요");
  cleanup();

  mount({ view: { kind: "meaning", meaning: MEANING } });
  expect(attrOf(ids.bubble, "accessibility-label")).toBe("Hana: 안녕하세요, annyeonghaseyo, Hello");
});

test("MC2-UI3. 교정 카드는 한 요소로 「Better: 고친 문장. 설명」을, 스켈레톤은 불러오는 중 문장을 읽는다", () => {
  mount({ view: { kind: "fix", correction: CORRECTION } });
  expect(attrOf(ids.fixCard, "accessibility-label")).toBe(
    `Better: ${CORRECTION.corrected}. ${CORRECTION.explanation}`,
  );
  cleanup();

  mount({ view: { kind: "fix-loading" } });
  expect(attrOf(ids.fixSkeleton, "accessibility-label")).toBe("Loading a better way…");
  cleanup();

  mount({ view: { kind: "meaning-loading" } });
  expect(attrOf(ids.bubble, "accessibility-label")).toBe("Hana: 안녕하세요, Loading the meaning…");
});

// 접근성 M6: 뜻 스켈레톤은 말풍선 접근성 요소 안에 있어 따로 닿지 않으니 낭독에서 숨기고(중복 방지), 말풍선 라벨이 대신 전한다.
test("M6. 뜻 스켈레톤은 접근성 요소가 아니라 낭독에서 숨은 장식이다", () => {
  mount({ view: { kind: "meaning-loading" } });

  const skeleton = byId(ids.meaningSkeleton);
  expect(skeleton.getAttribute("accessibility-elements-hidden")).toBe("true");
  expect(skeleton.hasAttribute("accessibility-element")).toBe(false);
  expect(skeleton.hasAttribute("accessibility-label")).toBe(false);
});
