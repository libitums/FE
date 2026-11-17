import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, render, screen } from "@lynx-js/react/testing-library";

import {
  clearBackHandlers,
  mountChat,
  systemBack,
  tapButtonIn,
  tapId,
} from "./chat-ui.test-support";
import { ClearChatDialog } from "./ClearChatDialog";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";

// `ui` 계층(CC-UI4 ~ UI8, ADR-0156): 대화 비우기 확인 — 버튼 둘(cancel / clear) · clear → clearRoom 뒤 방은 남고 대화만
// 비며 겹침이 모두 닫힘 · 못 비우면(busy · failed) 대화상자에 까닭이 서고 대화는 그대로 · cancel · 시스템 뒤로 → 사이드바.

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
  vi.useRealTimers();
});

function mountDialog(failure: "busy" | "failed" | null = null) {
  const handlers = { onConfirm: vi.fn<() => void>(), onCancel: vi.fn<() => void>() };
  render(<ClearChatDialog name="미나" failure={failure} {...handlers} />);
  return handlers;
}

test("CC-UI4. 제목 · 무엇이 지워지는지(대화 · 기억, 되돌릴 수 없음, 사진은 앨범에 남음)가 서고 버튼 둘이 cancel · clear다", () => {
  mountDialog();

  const dialog = screen.getByTestId(ids.clearDialog);
  expect(dialog.textContent).toContain("Clear this chat?");
  expect(dialog.textContent).toContain("미나");
  expect(dialog.textContent).toContain("can't be undone");
  expect(dialog.textContent).toContain("album");
  expect(screen.getByTestId("ui-lynx-dialog-action-cancel").textContent).toContain("Cancel");
  expect(screen.getByTestId("ui-lynx-dialog-action-clear").textContent).toContain("Clear");
  expect(screen.getAllByTestId(/^ui-lynx-dialog-action-/)).toHaveLength(2);
});

test("CC-UI4. clear는 onConfirm을, cancel은 onCancel을 한 번씩 부른다", () => {
  const { onConfirm, onCancel } = mountDialog();

  tapButtonIn("ui-lynx-dialog-action-clear");
  expect(onConfirm).toHaveBeenCalledTimes(1);
  expect(onCancel).not.toHaveBeenCalled();
  tapButtonIn("ui-lynx-dialog-action-cancel");
  expect(onCancel).toHaveBeenCalledTimes(1);
});

test("CC-UI5. 못 비웠으면 까닭이 선다 — 답을 기다리는 중(busy) · 연결 실패(failed)", () => {
  mountDialog("busy");
  expect(screen.getByTestId(ids.clearDialog).textContent).toContain("reply");
  cleanup();
  mountDialog("failed");
  expect(screen.getByTestId(ids.clearDialog).textContent).toContain("try again");
});

// ----------------------------------------------------------------------- 화면 결선

function openClear() {
  const mounted = mountChat();
  tapId(ids.settings);
  tapId(ids.sidebarClear);
  return mounted;
}

const settle = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

test("CC-UI6. 화면: 사이드바의 Clear chat이 확인 대화상자를 연다", () => {
  openClear();

  expect(screen.getByTestId(ids.clearDialog)).toBeTruthy();
});

test("CC-UI7. 화면: clear는 clearRoom을 부르고 방은 남은 채 대화가 비며 겹침이 모두 닫힌다(나가지 않는다)", async () => {
  const { source, onExit } = openClear();
  const clearRoom = vi.spyOn(source, "clearRoom");
  act(() => source.sendText("mina", "안녕하세요"));
  expect(source.thread("mina")?.messages.length ?? 0).toBeGreaterThan(1);

  tapButtonIn("ui-lynx-dialog-action-clear");
  await settle();

  expect(clearRoom).toHaveBeenCalledWith("mina");
  expect(source.thread("mina")).not.toBeNull();
  expect(source.thread("mina")?.messages.length ?? 0).toBeLessThanOrEqual(1);
  expect(screen.queryByTestId(ids.clearDialog)).toBeNull();
  expect(screen.queryByTestId(ids.sidebar)).toBeNull();
  expect(onExit).not.toHaveBeenCalled();
});

test("CC-UI8. 화면: 못 비우면 대화상자가 남아 까닭을 보이고 대화는 그대로다", async () => {
  const { source } = openClear();
  vi.spyOn(source, "clearRoom").mockResolvedValue("failed");
  act(() => source.sendText("mina", "안녕하세요"));
  const before = source.thread("mina")?.messages.length ?? 0;

  tapButtonIn("ui-lynx-dialog-action-clear");
  await settle();

  expect(screen.getByTestId(ids.clearDialog).textContent).toContain("try again");
  expect(source.thread("mina")?.messages.length).toBe(before);
});

test("CC-UI6. 화면: cancel은 사이드바로 돌아가고 아무것도 지우지 않는다", () => {
  const { source, onExit } = openClear();
  const clearRoom = vi.spyOn(source, "clearRoom");

  tapButtonIn("ui-lynx-dialog-action-cancel");

  expect(screen.queryByTestId(ids.clearDialog)).toBeNull();
  expect(screen.getByTestId(ids.sidebar)).toBeTruthy();
  expect(clearRoom).not.toHaveBeenCalled();
  expect(onExit).not.toHaveBeenCalled();
});

test("CC-UI6. 화면: 시스템 뒤로도 사이드바로 돌아간다", () => {
  openClear();

  expect(systemBack()).toBe(true);

  expect(screen.queryByTestId(ids.clearDialog)).toBeNull();
  expect(screen.getByTestId(ids.sidebar)).toBeTruthy();
});
