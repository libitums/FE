import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@lynx-js/react/testing-library";

import {
  clearBackHandlers,
  mountChat,
  nativeInput,
  systemBack,
  tapId,
} from "./chat-ui.test-support";
import { FixRequestDialog } from "./FixRequestDialog";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";

// `ui` 계층(MC-UI18): 고쳐 주세요 대화상자(O2) — TextField 카운터 n/200 · native maxlength 200 · 입력 → 상태 · 201자는
// 200자로 · 빈 글은 보내기 꺼짐 · 보내기 → requestFix · Cancel · 시스템 뒤로.

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
  vi.useRealTimers();
});

const FIELD_INPUT = "ui-lynx-text-field-input";
const counterText = (): string =>
  screen.getByTestId(ids.fixField).querySelector(".ui-lynx-text-field-counter")?.textContent ?? "";

function mountDialog(text = "") {
  const handlers = {
    onInput: vi.fn<(value: string) => void>(),
    onSend: vi.fn<() => void>(),
    onCancel: vi.fn<() => void>(),
  };
  render(<FixRequestDialog text={text} {...handlers} />);
  return handlers;
}

test("MC-UI18. 대화상자에 제목 · 설명이 서고 입력 칸은 maxlength 200에 카운터 0/200이다", () => {
  mountDialog();

  const dialog = screen.getByTestId(ids.fixDialog);
  expect(dialog.textContent).toContain("Ask for a fix");
  expect(dialog.textContent).toContain("Tell us what felt wrong in this chat.");
  expect(screen.getByTestId(FIELD_INPUT).getAttribute("maxlength")).toBe("200");
  expect(counterText()).toBe("0/200");
});

test("MC-UI18. 입력하면 카운터가 n/200으로 따라가고 onInput이 값을 받는다", () => {
  const { onInput } = mountDialog();

  nativeInput("input", "안녕하세요", FIELD_INPUT);

  expect(onInput).toHaveBeenCalledWith("안녕하세요");
  expect(counterText()).toBe("5/200");
});

test("MC-UI18. 글이 비면 Send가 꺼져 있고 눌러도 onSend가 없다", () => {
  const { onSend } = mountDialog("");

  expect(screen.getByTestId(ids.fixSend).getAttribute("data-enabled")).toBe("false");
  tapId(ids.fixSend);

  expect(onSend).not.toHaveBeenCalled();
});

test("MC-UI18. 공백만 있는 글도 Send가 꺼져 있다", () => {
  mountDialog("   ");

  expect(screen.getByTestId(ids.fixSend).getAttribute("data-enabled")).toBe("false");
});

test("MC-UI18. 글이 있으면 Send가 켜지고 탭하면 onSend가 한 번, Cancel은 onCancel이 한 번 불린다", () => {
  const { onSend, onCancel } = mountDialog("틀렸어요");

  expect(screen.getByTestId(ids.fixSend).getAttribute("data-enabled")).toBe("true");
  tapId(ids.fixSend);
  expect(onSend).toHaveBeenCalledTimes(1);
  tapId(ids.fixCancel);
  expect(onCancel).toHaveBeenCalledTimes(1);
});

// ----------------------------------------------------------------------- 화면 결선

function openFix() {
  const mounted = mountChat();
  tapId(ids.more);
  tapId(ids.moreItem("fix"));
  return mounted;
}

test("MC-UI18. 화면: 201자를 입력해도 상태는 200자이고 보내면 200자가 requestFix로 간다", () => {
  const { source } = openFix();
  const requestFix = vi.spyOn(source, "requestFix");

  nativeInput("input", "a".repeat(201), FIELD_INPUT);
  tapId(ids.fixSend);

  expect(requestFix).toHaveBeenCalledTimes(1);
  expect(requestFix).toHaveBeenCalledWith("mina", "a".repeat(200));
  expect(screen.queryByTestId(ids.fixDialog)).toBeNull();
});

test("MC-UI18. 화면: 빈 상태에서는 Send가 꺼져 있고 글을 넣으면 켜진다", () => {
  openFix();
  expect(screen.getByTestId(ids.fixSend).getAttribute("data-enabled")).toBe("false");

  nativeInput("input", "여기가 이상해요", FIELD_INPUT);

  expect(screen.getByTestId(ids.fixSend).getAttribute("data-enabled")).toBe("true");
});

test("MC-UI18. 화면: Cancel과 시스템 뒤로가 닫고 아무것도 보내지 않는다", () => {
  const { source } = openFix();
  const requestFix = vi.spyOn(source, "requestFix");
  nativeInput("input", "내용", FIELD_INPUT);

  tapId(ids.fixCancel);
  expect(screen.queryByTestId(ids.fixDialog)).toBeNull();

  tapId(ids.more);
  tapId(ids.moreItem("fix"));
  expect(screen.getByTestId(ids.fixDialog)).toBeTruthy();
  expect(systemBack()).toBe(true);

  expect(screen.queryByTestId(ids.fixDialog)).toBeNull();
  expect(requestFix).not.toHaveBeenCalled();
});

test("MC-UI18. 화면: 다시 열면 글이 비어 있다", () => {
  openFix();
  nativeInput("input", "내용", FIELD_INPUT);
  tapId(ids.fixCancel);

  tapId(ids.more);
  tapId(ids.moreItem("fix"));

  expect(counterText()).toBe("0/200");
  expect(screen.getByTestId(ids.fixSend).getAttribute("data-enabled")).toBe("false");
});
