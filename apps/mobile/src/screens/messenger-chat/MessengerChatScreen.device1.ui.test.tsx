import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, screen } from "@lynx-js/react/testing-library";
import circle from "@libitums/icons/lynx/circle";
import loadingDots from "@libitums/icons/lynx/loading-dots";

import {
  advance,
  clearBackHandlers,
  KEYS_AN,
  makeSource,
  mountChatOpen,
  nativeInput,
  presenceProbe,
  slotHeight,
  tapId,
  tapKeys,
  textOf,
} from "./chat-ui.test-support";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";

// `ui` 계층(기기 점검 1회차 결함 · 접근성 지적 반영, 2026-11-09): 단위 · ui · 통합이 모두 green이었는데 기기에서 보인
// 결함 중 테스트 환경이 표현할 수 있는 것만 여기서 red로 고정합니다. 순수 배치(D4 · D8 · D7 높이 계산)는 기기 전용이라
// CSS 문장 점검(messenger-chat.css.device1.unit.test.ts)과 기기 확인으로 남습니다.
//
// D1(원인): Lynx CSS의 속성 선택자는 `data-*`(dataset)를 맞추지 않아 `[data-selected="true"]` 같은 규칙이 기기에서 한 번도
// 적용되지 않았다. 켜진 칸 · 꺼진 보내기 · 열린 전구 · 열린 「…」 · 초점 테두리 · 고른 보기가 모두 같은 원인이다. 레포 규칙은
// 클래스 변형(CoinPackCard의 `…-selected`)이다.

vi.mock("./chat-input-focus", () => ({
  focusPhoneInput: vi.fn<() => void>(),
  blurPhoneInput: vi.fn<() => void>(),
  clearPhoneInput: vi.fn<() => void>(),
  restoreAccessibilityFocus: vi.fn<(testId: string) => void>(),
}));

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 9, 12, 0, 0));
  vi.clearAllMocks();
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
  vi.useRealTimers();
});

const classOf = (testId: string): string => screen.getByTestId(testId).className;

// ---------------------------------------------------------------- D1

test("D1. 켜진 토글 칸에는 클래스 변형 …-toggle-selected가 달린다(속성 선택자에 기대지 않는다)", () => {
  mountChatOpen();

  expect(classOf(ids.toggle("learning"))).toContain("messenger-chat-toggle-selected");
  expect(classOf(ids.toggle("phone"))).not.toContain("messenger-chat-toggle-selected");

  tapId(ids.toggle("phone"));

  expect(classOf(ids.toggle("phone"))).toContain("messenger-chat-toggle-selected");
  expect(classOf(ids.toggle("learning"))).not.toContain("messenger-chat-toggle-selected");
});

test("D1. 꺼진 보내기에는 …-send-disabled가 달리고 글이 생기면 사라진다", () => {
  mountChatOpen();
  expect(classOf(ids.send)).toContain("messenger-chat-send-disabled");

  tapKeys(...KEYS_AN);

  expect(classOf(ids.send)).not.toContain("messenger-chat-send-disabled");
});

test("D1. 열린 「…」에는 …-more-open, 열린 전구에는 …-bulb-open이 달린다", () => {
  mountChatOpen({ probe: presenceProbe("absent") });
  expect(classOf(ids.more)).not.toContain("messenger-chat-more-open");
  expect(classOf(ids.ideasButton)).not.toContain("messenger-chat-bulb-open");

  tapId(ids.more);
  expect(classOf(ids.more)).toContain("messenger-chat-more-open");
  tapId(ids.more);
  tapId(ids.ideasButton);

  expect(classOf(ids.ideasButton)).toContain("messenger-chat-bulb-open");
});

test("D1. 휴대폰 입력에 초점이 가면 입력 칸에 …-composer-pill-focused가 달린다", () => {
  mountChatOpen({ probe: presenceProbe("present") });
  const pill = () =>
    screen.getByTestId(ids.composer).querySelector(".messenger-chat-composer-pill");
  expect(pill()?.className).not.toContain("messenger-chat-composer-pill-focused");

  nativeInput("focus", "");

  expect(pill()?.className).toContain("messenger-chat-composer-pill-focused");
});

test("D1. 고른 답장 보기에는 chat-reply-option-picked가 달린다(학습 메신저와 공용 면)", () => {
  mountChatOpen();
  tapId(ids.ideasButton);
  expect(classOf(ids.idea(0))).not.toContain("chat-reply-option-picked");

  tapId(ids.idea(0));

  expect(classOf(ids.idea(0))).toContain("chat-reply-option-picked");
});

// ---------------------------------------------------------------- D2

test("D2. 「…」 단추 그림은 로딩 점 고리가 아니라 가로 점 셋이다(circle 셋)", () => {
  mountChatOpen();

  const icons = Array.from(screen.getByTestId(ids.more).querySelectorAll("svg"));

  expect(icons.length).toBe(3);
  for (const icon of icons) {
    expect(icon.getAttribute("content")).toBe(circle);
    expect(icon.getAttribute("content")).not.toBe(loadingDots);
  }
});

// ---------------------------------------------------------------- D5

test("D5. 출처가 던져도 보낸 뒤 입력 칸은 비워진다(비우기가 출처 호출 뒤에서 끊기지 않는다)", () => {
  const source = makeSource();
  vi.spyOn(source, "sendText").mockImplementation(() => {
    throw new Error("source failed");
  });
  mountChatOpen({ source });
  tapKeys(...KEYS_AN);
  expect(textOf(ids.display)).toBe("안");

  try {
    tapId(ids.send);
  } catch {
    // 던진 오류가 탭 도우미까지 올라와도 상관없습니다 — 아래가 확인할 것입니다.
  }

  expect(textOf(ids.display)).toBe("Message");
  expect(classOf(ids.send)).toContain("messenger-chat-send-disabled");
});

// ---------------------------------------------------------------- D7

test("D7. 보기 판은 슬롯 높이를 px로 직접 받는다(퍼센트 · 부모 flex에 기대지 않는다)", () => {
  mountChatOpen({ probe: presenceProbe("absent") });
  const slot = slotHeight();
  tapId(ids.ideasButton);

  const style = screen.getByTestId(ids.ideasPanel).getAttribute("style") ?? "";

  expect(style).toMatch(new RegExp(`(^|;\\s*)height:\\s*${slot}px`));
});

// 기기 점검 2회차(2026-11-09): 판 높이를 px로 준 뒤에도 SE에서 셋째 보기가 화면 밖으로 잘리고 스크롤도 안 됐다 —
// Lynx scroll-view는 flex 기준(1 1 0px)만으로 높이가 정해지지 않아 내용 높이로 자란다. 스크롤 칸에도 px 높이를 준다.
test("D7b. 보기 스크롤 칸은 판 높이에서 위 12 · 머리 32 · 사이 8 · 아래(inset + 8)를 뺀 px 높이를 받는다", () => {
  mountChatOpen({ probe: presenceProbe("absent") });
  const slot = slotHeight();
  tapId(ids.ideasButton);

  const scroll = screen
    .getByTestId(ids.ideasPanel)
    .querySelector('[class~="messenger-chat-ideas-scroll"]');
  const style = scroll?.getAttribute("style") ?? "";

  expect(style).toMatch(new RegExp(`(^|;\\s*)height:\\s*${Number(slot) - 12 - 32 - 8 - 8}px`));
});

// ---------------------------------------------------------------- M2

test("M2. 작은 단추는 hit-slop으로 터치 영역을 44 가까이 넓힌다", () => {
  mountChatOpen();
  tapId(ids.ideasButton);
  const withSlop = [
    ids.snapshot,
    ids.snapVoice,
    ids.more,
    ids.ideasButton,
    ids.send,
    ids.ideasTypeMyself,
    ids.toggle("learning"),
    ids.toggle("phone"),
  ];

  for (const testId of withSlop) {
    expect(screen.getByTestId(testId).getAttribute("hit-slop"), testId).not.toBeNull();
  }
});

// ---------------------------------------------------------------- M4

test("M4. 학습 키보드 입력 칸의 낭독 이름은 늘 「Message」이고 글은 value로 읽힌다", () => {
  mountChatOpen();
  const display = () => screen.getByTestId(ids.display);
  expect(display().getAttribute("accessibility-label")).toBe("Message");
  expect(display().getAttribute("accessibility-value")).toBeNull();

  tapKeys(...KEYS_AN);

  expect(display().getAttribute("accessibility-label")).toBe("Message");
  expect(display().getAttribute("accessibility-value")).toBe("안");
});

// ---------------------------------------------------------------- M5 · M7

test("M5. 전구가 열리면 낭독 라벨이 「Reply ideas, open」으로 바뀐다", () => {
  mountChatOpen({ probe: presenceProbe("absent") });
  expect(screen.getByTestId(ids.ideasButton).getAttribute("accessibility-label")).toBe(
    "Reply ideas",
  );

  tapId(ids.ideasButton);

  expect(screen.getByTestId(ids.ideasButton).getAttribute("accessibility-label")).toBe(
    "Reply ideas, open",
  );
});

test("M5. 「…」 메뉴가 열리면 낭독 라벨이 「More, expanded」로 바뀐다", () => {
  mountChatOpen();
  expect(screen.getByTestId(ids.more).getAttribute("accessibility-label")).toBe("More");

  tapId(ids.more);

  expect(screen.getByTestId(ids.more).getAttribute("accessibility-label")).toBe("More, expanded");
});

test("M7. 「…」 메뉴가 열리면 다음 프레임에 첫 항목으로 접근성 초점을 보낸다", async () => {
  const focus = await import("./chat-input-focus");
  mountChatOpen();

  tapId(ids.more);
  expect(focus.restoreAccessibilityFocus).not.toHaveBeenCalled();
  advance(16);

  expect(focus.restoreAccessibilityFocus).toHaveBeenCalledTimes(1);
  expect(focus.restoreAccessibilityFocus).toHaveBeenCalledWith(ids.moreItem("ideas"));
  expect(screen.getByTestId(ids.moreItem("ideas")).getAttribute("id")).toBe(ids.moreItem("ideas"));
});
