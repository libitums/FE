import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { ChatReplyOption } from "./ChatReplyOption";

// `ui` 계층(MC-UI5): 답장 보기 — button trait · 낭독 · 빈 줄 생략 · data-state · 탭 → onPick 한 번.

afterEach(cleanup);

function mount(lines: readonly string[], state: "idle" | "picked" = "idle") {
  const onPick = vi.fn<() => void>();
  render(
    <ChatReplyOption primary="좋아요" lines={lines} state={state} testId="opt" onPick={onPick} />,
  );
  return onPick;
}

test("MC-UI5. 보기는 button trait이고 낭독은 첫 줄 + 아래 줄을 ', '로 잇는다", () => {
  mount(["joayo", "Sounds good"]);

  const option = screen.getByTestId("opt");
  expect(option.className).toContain("chat-reply-option");
  expect(option.getAttribute("accessibility-element")).toBe("true");
  expect(option.getAttribute("accessibility-traits")).toBe("button");
  expect(option.getAttribute("accessibility-label")).toBe("좋아요, joayo, Sounds good");
});

test("MC-UI5. 첫 줄과 아래 줄이 각자 클래스로 서고, 빈 문자열 줄은 그리지 않는다", () => {
  mount(["", "Sounds good"]);

  const option = screen.getByTestId("opt");
  expect(option.querySelector(".chat-reply-option-primary")?.textContent).toBe("좋아요");
  const lines = Array.from(option.querySelectorAll(".chat-reply-option-line"));
  expect(lines.map((line) => line.textContent)).toEqual(["Sounds good"]);
  expect(option.getAttribute("accessibility-label")).toBe("좋아요, Sounds good");
});

test("MC-UI5. 아래 줄이 모두 비면 낭독에 끝 쉼표가 없고 줄도 없다", () => {
  mount([""]);

  expect(screen.getByTestId("opt").getAttribute("accessibility-label")).toBe("좋아요");
  expect(screen.getByTestId("opt").querySelectorAll(".chat-reply-option-line")).toHaveLength(0);
});

test("MC-UI5. data-state가 idle / picked를 따른다", () => {
  mount([], "picked");
  expect(screen.getByTestId("opt").getAttribute("data-state")).toBe("picked");
  cleanup();
  mount([], "idle");
  expect(screen.getByTestId("opt").getAttribute("data-state")).toBe("idle");
});

test("MC-UI5. 탭하면 onPick이 정확히 한 번 불린다", () => {
  const onPick = mount(["joayo"]);

  fireEvent.tap(screen.getByTestId("opt"), {});

  expect(onPick).toHaveBeenCalledTimes(1);
});
