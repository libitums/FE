import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@lynx-js/react/testing-library";

import { clearBackHandlers, tapButtonIn } from "./chat-ui.test-support";
import { friendsTestIds as ids } from "./chat-friends.contract";
import { FriendAdultDialog } from "./FriendAdultDialog";

// `ui` 계층(RF-UI20 · UI21): 성인 확인 대화상자 — 제목 · 설명(이름 · 로맨틱 · 성인) · 단추 둘. 확인은 onConfirm, 취소는 onCancel.

afterEach(() => {
  cleanup();
  clearBackHandlers();
});

test("RF-UI20 제목 · 이름이 든 설명 · 단추 둘(confirm · cancel)이 선다", () => {
  render(<FriendAdultDialog name="차서연" onConfirm={vi.fn()} onCancel={vi.fn()} />);
  const dialog = screen.getByTestId(ids.adultDialog);
  expect(dialog.textContent).toContain("Confirm you're an adult");
  expect(dialog.textContent).toContain("차서연");
  expect(dialog.textContent).toContain("romantic");
  expect(screen.getAllByTestId(/^ui-lynx-dialog-action-/)).toHaveLength(2);
});

test("RF-UI21 확인은 onConfirm, 취소는 onCancel을 한 번씩 부른다", () => {
  const onConfirm = vi.fn<() => void>();
  const onCancel = vi.fn<() => void>();
  render(<FriendAdultDialog name="권해준" onConfirm={onConfirm} onCancel={onCancel} />);
  tapButtonIn("ui-lynx-dialog-action-confirm");
  expect(onConfirm).toHaveBeenCalledTimes(1);
  tapButtonIn("ui-lynx-dialog-action-cancel");
  expect(onCancel).toHaveBeenCalledTimes(1);
});
