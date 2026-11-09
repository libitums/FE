import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@lynx-js/react/testing-library";

import {
  clearBackHandlers,
  mountChat,
  systemBack,
  tapButtonIn,
  tapId,
} from "./chat-ui.test-support";
import { DeleteChatDialog } from "./DeleteChatDialog";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";

// `ui` 계층(MC-UI19 뒷부분): 대화 지우기 확인 — 버튼 둘(cancel / delete) · delete → deleteRoom 뒤 방이 사라져 onExit ·
// cancel · 시스템 뒤로 → 사이드바로 돌아감.

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
  vi.useRealTimers();
});

function mountDialog() {
  const handlers = { onConfirm: vi.fn<() => void>(), onCancel: vi.fn<() => void>() };
  render(<DeleteChatDialog name="미나" {...handlers} />);
  return handlers;
}

test("MC-UI19. 제목과 상대 이름이 든 설명이 서고 버튼 둘의 id가 cancel · delete다", () => {
  mountDialog();

  const dialog = screen.getByTestId(ids.deleteDialog);
  expect(dialog.textContent).toContain("Delete this chat?");
  expect(dialog.textContent).toContain("Your chat with 미나 will be removed.");
  expect(screen.getByTestId("ui-lynx-dialog-action-cancel").textContent).toContain("Cancel");
  expect(screen.getByTestId("ui-lynx-dialog-action-delete").textContent).toContain("Delete");
  expect(screen.getAllByTestId(/^ui-lynx-dialog-action-/)).toHaveLength(2);
});

test("MC-UI19. delete는 onConfirm을, cancel은 onCancel을 한 번씩 부른다", () => {
  const { onConfirm, onCancel } = mountDialog();

  tapButtonIn("ui-lynx-dialog-action-delete");
  expect(onConfirm).toHaveBeenCalledTimes(1);
  expect(onCancel).not.toHaveBeenCalled();
  tapButtonIn("ui-lynx-dialog-action-cancel");
  expect(onCancel).toHaveBeenCalledTimes(1);
});

// ----------------------------------------------------------------------- 화면 결선

function openDelete() {
  const mounted = mountChat();
  tapId(ids.settings);
  tapId(ids.sidebarDelete);
  return mounted;
}

test("MC-UI19. 화면: 사이드바의 Delete chat이 확인 대화상자를 연다", () => {
  openDelete();

  expect(screen.getByTestId(ids.deleteDialog)).toBeTruthy();
});

test("MC-UI19. 화면: delete는 deleteRoom을 부르고 방이 사라져 onExit이 한 번 불린다", () => {
  const { source, onExit } = openDelete();
  const deleteRoom = vi.spyOn(source, "deleteRoom");

  tapButtonIn("ui-lynx-dialog-action-delete");

  expect(deleteRoom).toHaveBeenCalledTimes(1);
  expect(deleteRoom).toHaveBeenCalledWith("mina");
  expect(source.thread("mina")).toBeNull();
  expect(onExit).toHaveBeenCalledTimes(1);
});

test("MC-UI19. 화면: cancel은 사이드바로 돌아가고 아무것도 지우지 않는다", () => {
  const { source, onExit } = openDelete();
  const deleteRoom = vi.spyOn(source, "deleteRoom");

  tapButtonIn("ui-lynx-dialog-action-cancel");

  expect(screen.queryByTestId(ids.deleteDialog)).toBeNull();
  expect(screen.getByTestId(ids.sidebar)).toBeTruthy();
  expect(deleteRoom).not.toHaveBeenCalled();
  expect(onExit).not.toHaveBeenCalled();
});

test("MC-UI19. 화면: 시스템 뒤로도 사이드바로 돌아간다", () => {
  openDelete();

  expect(systemBack()).toBe(true);

  expect(screen.queryByTestId(ids.deleteDialog)).toBeNull();
  expect(screen.getByTestId(ids.sidebar)).toBeTruthy();
});
