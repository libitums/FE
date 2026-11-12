import { afterEach, expect, test } from "vitest";
import { cleanup, render, screen, within } from "@lynx-js/react/testing-library";

import { ChatHeader, ChatHeaderSide } from "./ChatHeader";
import { realChildren } from "../../lib/dom.test-support";

// `ui` 계층(MC-UI2): 공용 채팅 머리 — 호출자가 넘긴 test-id · 제목 header trait · end null이면 빈 옆 칸 · 새 클래스 이름.

afterEach(cleanup);

const testIds = { root: "x-header", title: "x-title" };

function mount(end: "none" | "button" = "none", insetTop = 0) {
  render(
    <ChatHeader
      title="미나"
      insetTop={insetTop}
      testIds={testIds}
      start={
        <ChatHeaderSide testId="x-back">
          <view data-testid="x-back-button" />
        </ChatHeaderSide>
      }
      end={
        end === "none" ? null : (
          <ChatHeaderSide testId="x-end">
            <view data-testid="x-end-button" />
          </ChatHeaderSide>
        )
      }
    />,
  );
}

test("MC-UI2. 루트와 제목이 호출자가 넘긴 test-id로 서고, 제목은 header trait이다", () => {
  mount();

  expect(screen.getByTestId("x-header")).toBeTruthy();
  expect(screen.getByTestId("x-title").textContent).toBe("미나");
  expect(screen.getByTestId("x-title").getAttribute("accessibility-traits")).toBe("header");
});

test("MC-UI2. start 칸에 앞 단추가 들고, 클래스는 chat-header 계열이다", () => {
  mount();

  const header = screen.getByTestId("x-header");
  expect(header.className).toContain("chat-header");
  expect(within(screen.getByTestId("x-back")).getByTestId("x-back-button")).toBeTruthy();
  expect(screen.getByTestId("x-back").className).toContain("chat-header-side");
  expect(screen.getByTestId("x-title").className).toContain("chat-title");
  expect(header.querySelector(".chat-header-row")).not.toBeNull();
});

test("MC-UI2. end가 null이면 빈 옆 칸이 남아 제목이 가운데에 선다(옆 칸 둘)", () => {
  mount("none");

  const row = screen.getByTestId("x-header").querySelector(".chat-header-row");
  const sides = row?.querySelectorAll(".chat-header-side") ?? [];
  expect(sides).toHaveLength(2);
  expect(realChildren(sides[1])).toHaveLength(0);
});

test("MC-UI2. end가 있으면 그 칸 안에 뒤 단추가 든다", () => {
  mount("button");

  expect(within(screen.getByTestId("x-end")).getByTestId("x-end-button")).toBeTruthy();
});

test("MC-UI2. insetTop은 머리 위 여백(paddingTop)으로 실린다", () => {
  mount("none", 47);

  expect(screen.getByTestId("x-header").style.paddingTop).toBe("47px");
});

// ------------------------------------------------------------------ MC2-UI13 subtitle 슬롯(messenger-chat-1-5 spec §3.2)

function mountWithSubtitle(withSubtitle: boolean) {
  const extra = withSubtitle ? { subtitle: <text data-testid="x-subtitle">3 of 3 left</text> } : {};
  render(
    <ChatHeader
      title="미나"
      insetTop={0}
      testIds={testIds}
      start={
        <ChatHeaderSide testId="x-back">
          <view data-testid="x-back-button" />
        </ChatHeaderSide>
      }
      end={null}
      {...extra}
    />,
  );
}

test("MC2-UI13. subtitle이 없으면 구조가 지금과 같다 — 제목이 row의 직계 text이고 stack이 없다", () => {
  mountWithSubtitle(false);

  const row = screen.getByTestId("x-header").querySelector(".chat-header-row");
  const kids = realChildren(row);
  expect(kids).toHaveLength(3);
  expect(kids[1]?.getAttribute("data-testid")).toBe("x-title");
  expect(kids[1]?.tagName.toLowerCase()).toBe("text");
  expect(screen.getByTestId("x-header").querySelector(".chat-title-stack")).toBeNull();
});

test("MC2-UI13. subtitle이 있으면 row 가운데에 chat-title-stack이 서고 제목 → 부제 순서로 든다", () => {
  mountWithSubtitle(true);

  const row = screen.getByTestId("x-header").querySelector(".chat-header-row");
  const kids = realChildren(row);
  expect(kids).toHaveLength(3);
  const stack = kids[1];
  expect(stack?.className).toContain("chat-title-stack");
  const inner = realChildren(stack);
  expect(inner).toHaveLength(2);
  expect(inner[0]?.getAttribute("data-testid")).toBe("x-title");
  expect(inner[1]?.getAttribute("data-testid")).toBe("x-subtitle");
  expect(screen.getByTestId("x-title").getAttribute("accessibility-traits")).toBe("header");
  expect(screen.getByTestId("x-title").className).toContain("chat-title");
  expect(screen.getByTestId("x-subtitle").textContent).toBe("3 of 3 left");
});

test("F1. 묶음 안 제목은 chat-title-stacked를 더 달고, 묶음 밖 제목은 달지 않는다(학습 메신저 머리 그대로)", () => {
  mountWithSubtitle(true);
  expect(screen.getByTestId("x-title").className).toContain("chat-title-stacked");
  cleanup();
  mountWithSubtitle(false);
  expect(screen.getByTestId("x-title").className).not.toContain("chat-title-stacked");
});

test("MC2-UI13. subtitle이 있어도 앞 칸과 뒤 빈 칸(옆 칸 둘)은 그대로다", () => {
  mountWithSubtitle(true);

  const row = screen.getByTestId("x-header").querySelector(".chat-header-row");
  expect(row?.querySelectorAll(".chat-header-side")).toHaveLength(2);
  expect(within(screen.getByTestId("x-back")).getByTestId("x-back-button")).toBeTruthy();
});

test("F3. 부제가 있을 때만 제목이 한 줄로 잘린다(text-maxline) — 부제 없는 학습 메신저 머리는 속성이 없다", () => {
  mountWithSubtitle(true);
  expect(screen.getByTestId("x-title").getAttribute("text-maxline")).toBe("1");
  cleanup();
  mountWithSubtitle(false);
  expect(screen.getByTestId("x-title").hasAttribute("text-maxline")).toBe(false);
});
