import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, render, screen } from "@lynx-js/react/testing-library";
import { MotionProvider } from "@libitums/ui-lynx/motion";

import { StoryMessengerScreen } from "./StoryMessengerScreen";
import { storyMessengerTestIds as ids, type StoryChatView } from "./story-messenger.contract";
import { realChildren } from "../../lib/dom.test-support";

// `ui` 계층(MC-UI7, AC15): 학습 메신저가 공용 채팅 부품(components/chat)으로 옮겨 간 뒤에도
// test-id · DOM 순서 · 보기 줄 수가 그대로이고, 클래스만 spec §4.2의 새 이름이다.
// 기존 StoryMessengerScreen.ui.test.tsx는 이 이전 때문에 고치지 않고 그대로 통과해야 한다.

const insets = { top: 0, bottom: 0, left: 0, right: 0 };
const t = (ko: string, en = `e-${ko}`) => ({ ko, en });

const chat: StoryChatView = {
  counterpart: "미나",
  counterpartAvatarUrl: "https://cdn/images/profiles/mina-casual.webp",
  turns: [
    {
      kind: "message",
      self: false,
      speaker: "미나",
      text: t("식당 찾았어요?"),
      imageUrl: "https://cdn/photo.webp",
      afterOption: null,
    },
    { kind: "reply", options: [t("아니요", ""), t("어디예요?")] },
    {
      kind: "message",
      self: false,
      speaker: "미나",
      text: t("괜찮아요"),
      imageUrl: null,
      afterOption: 1,
    },
  ],
};

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const wait = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

function mount(reduced = false) {
  const screenNode = (
    <StoryMessengerScreen insets={insets} chat={chat} onComplete={() => {}} onExit={() => {}} />
  );
  render(reduced ? <MotionProvider motion="reduced">{screenNode}</MotionProvider> : screenNode);
}

test("MC-UI7. 루트 자식 순서는 머리 → 로그 → 입력창이고 test-id는 그대로다", () => {
  mount();

  const root = screen.getByTestId(ids.screen);
  const order = realChildren(root).map((c) => c.getAttribute("data-testid"));
  expect(order).toEqual([ids.header, ids.log, ids.composer]);
  expect(screen.getByTestId(ids.title).textContent).toBe("미나");
  expect(screen.getByTestId(ids.back)).toBeTruthy();
  expect(screen.getByTestId(ids.composerField)).toBeTruthy();
});

test("MC-UI7. 머리 · 로그가 옮긴 클래스 이름(chat-*)을 쓰고 옛 story-messenger 머리 클래스는 없다", () => {
  mount();

  const header = screen.getByTestId(ids.header);
  expect(header.className).toContain("chat-header");
  expect(header.className).not.toContain("story-messenger-header");
  expect(header.querySelector(".chat-header-row")).not.toBeNull();
  expect(header.querySelectorAll(".chat-header-side")).toHaveLength(2);
  expect(screen.getByTestId(ids.title).className).toContain("chat-title");
  expect(screen.getByTestId(ids.back).className).toContain("chat-header-side");
  const log = screen.getByTestId(ids.log);
  expect(log.className).toContain("chat-log");
  expect(log.className).not.toContain("story-messenger-log");
  expect(log.querySelector(".chat-log-inner")).not.toBeNull();
});

test("MC-UI7. 상대 줄 · 쌓음 · 사진이 새 클래스이고 test-id가 그대로다", () => {
  mount();
  wait(1200);
  wait(3000);

  const row = screen.getByTestId(ids.incoming);
  expect(row.className).toContain("chat-row");
  expect(row.className).not.toContain("story-messenger-row");
  expect(row.querySelector(".chat-stack")).not.toBeNull();
  const photo = screen.getByTestId(ids.photo);
  expect(photo.className).toContain("chat-photo-9x16");
  expect(photo.getAttribute("src")).toBe("https://cdn/photo.webp");
});

test("MC-UI7. 입력 중 줄은 chat-typing · chat-dot 셋이고 한 요소로 읽힌다", () => {
  mount();
  wait(1200);

  const typing = screen.getByTestId(ids.typing);
  expect(typing.className).toContain("chat-row");
  expect(typing.querySelector(".chat-typing")).not.toBeNull();
  expect(typing.querySelectorAll(".chat-dot")).toHaveLength(3);
  expect(typing.getAttribute("accessibility-element")).toBe("true");
  expect(typing.querySelector(".chat-typing-still")).toBeNull();
});

test("MC-UI7. 움직임 줄이기에서는 점이 chat-typing-still로 멈춘다", () => {
  mount(true);
  wait(1200);

  expect(screen.getByTestId(ids.typing).querySelector(".chat-typing-still")).not.toBeNull();
});

test("MC-UI7. 보기 줄 수와 test-id는 그대로이고 보기는 chat-reply-option이며 번역이 빈 보기의 낭독에 끝 쉼표가 없다", () => {
  mount();
  for (let i = 0; i < 8; i += 1) wait(5000);

  const first = screen.getByTestId(ids.option(0));
  const second = screen.getByTestId(ids.option(1));
  expect(screen.queryByTestId(ids.option(2))).toBeNull();
  expect(first.className).toContain("chat-reply-option");
  expect(first.className).not.toContain("story-messenger-option");
  expect(first.querySelector(".chat-reply-option-primary")?.textContent).toBe("아니요");
  expect(first.querySelectorAll(".chat-reply-option-line")).toHaveLength(0);
  expect(first.getAttribute("accessibility-label")).toBe("아니요");
  expect(second.querySelector(".chat-reply-option-line")?.textContent).toBe("e-어디예요?");
  expect(second.getAttribute("accessibility-label")).toBe("어디예요?, e-어디예요?");
});
