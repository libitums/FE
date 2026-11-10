import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@lynx-js/react/testing-library";

import {
  clearBackHandlers,
  ideaSetA,
  ideaSetB,
  mountChat,
  systemBack,
  tapButtonIn,
  tapId,
} from "./chat-ui.test-support";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";
import { RegenerateIdeasDialog } from "./RegenerateIdeasDialog";

// `ui` 계층(MC-UI19 앞부분): 새 답장 보기 만들기 확인 — 아이콘 없음 · 버튼 둘(cancel / confirm) ·
// confirm → regenerateIdeas · 열려 있던 보기 패널은 그대로 새 보기(picked 없음) · Cancel · 뒤로.

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
  render(<RegenerateIdeasDialog {...handlers} />);
  return handlers;
}

test("MC-UI19. 제목 · 한 줄 설명이 서고 아이콘이 없다", () => {
  mountDialog();

  const dialog = screen.getByTestId(ids.regenDialog);
  expect(dialog.textContent).toContain("Make new reply ideas?");
  expect(dialog.textContent).toContain("The ideas you see now will be replaced.");
  expect(dialog.querySelector('[data-testid="ui-lynx-button-icon"]')).toBeNull();
});

test("MC-UI19. 버튼은 cancel · confirm 둘이고 문구는 Cancel / Make new다", () => {
  mountDialog();

  expect(screen.getByTestId("ui-lynx-dialog-action-cancel").textContent).toContain("Cancel");
  expect(screen.getByTestId("ui-lynx-dialog-action-confirm").textContent).toContain("Make new");
  expect(screen.getAllByTestId(/^ui-lynx-dialog-action-/)).toHaveLength(2);
});

test("MC-UI19. confirm은 onConfirm을, cancel은 onCancel을 한 번씩 부른다", () => {
  const { onConfirm, onCancel } = mountDialog();

  tapButtonIn("ui-lynx-dialog-action-confirm");
  expect(onConfirm).toHaveBeenCalledTimes(1);
  expect(onCancel).not.toHaveBeenCalled();
  tapButtonIn("ui-lynx-dialog-action-cancel");
  expect(onCancel).toHaveBeenCalledTimes(1);
});

// ----------------------------------------------------------------------- 화면 결선

function openRegen() {
  const mounted = mountChat();
  tapId(ids.more);
  tapId(ids.moreItem("ideas"));
  return mounted;
}

test("MC-UI19. 화면: confirm이 출처의 regenerateIdeas를 부르고 대화상자를 닫는다", () => {
  const { source } = openRegen();
  const regenerate = vi.spyOn(source, "regenerateIdeas");

  tapButtonIn("ui-lynx-dialog-action-confirm");

  expect(regenerate).toHaveBeenCalledTimes(1);
  expect(regenerate).toHaveBeenCalledWith("mina");
  expect(screen.queryByTestId(ids.regenDialog)).toBeNull();
});

test("MC-UI19. 화면: 보기 패널이 열려 있으면 그대로 새 보기로 바뀌고 고른 표시가 없다", () => {
  mountChat();
  tapId(ids.ideasButton);
  tapId(ids.idea(0));
  expect(screen.getByTestId(ids.idea(0)).textContent).toContain(ideaSetA[0].ko);
  expect(screen.getByTestId(ids.idea(0)).getAttribute("data-state")).toBe("picked");
  tapId(ids.more);
  tapId(ids.moreItem("ideas"));

  tapButtonIn("ui-lynx-dialog-action-confirm");

  expect(screen.getByTestId(ids.ideasPanel)).toBeTruthy();
  expect(screen.getByTestId(ids.idea(0)).textContent).toContain(ideaSetB[0].ko);
  expect(screen.getByTestId(ids.idea(0)).getAttribute("data-state")).toBe("idle");
});

test("MC-UI19. 화면: Cancel과 시스템 뒤로는 아무것도 바꾸지 않고 닫는다", () => {
  const { source } = openRegen();
  const regenerate = vi.spyOn(source, "regenerateIdeas");

  tapButtonIn("ui-lynx-dialog-action-cancel");
  expect(screen.queryByTestId(ids.regenDialog)).toBeNull();

  tapId(ids.more);
  tapId(ids.moreItem("ideas"));
  expect(systemBack()).toBe(true);

  expect(screen.queryByTestId(ids.regenDialog)).toBeNull();
  expect(regenerate).not.toHaveBeenCalled();
});
