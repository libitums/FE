import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@lynx-js/react/testing-library";

import { AdultAckDialog } from "./AdultAckDialog";
import { clearBackHandlers, systemBack } from "./chat-ui.test-support";
import { friendProfileTestIds as ids } from "./friend-profile.contract";

// `ui` 계층(AA-UI1 ~ UI2): 성인 확인 창(ADR-0163 D4) — 앱의 확인 창 그대로, 확인 · 취소 · 시스템 뒤로가기(= 취소).

afterEach(() => {
  cleanup();
  clearBackHandlers();
});

test("AA-UI1. 제목 · 본문(이름) · 확인 · 취소", () => {
  const onConfirm = vi.fn<() => void>();
  const onCancel = vi.fn<() => void>();
  render(<AdultAckDialog name="차서연" onConfirm={onConfirm} onCancel={onCancel} />);
  const dialog = screen.getByTestId(ids.adultDialog);
  expect(dialog.textContent).toContain("Before you add this friend");
  expect(dialog.textContent).toContain(
    "차서연 may talk in a romantic, couple-like tone. Please confirm you are an adult.",
  );
  expect(dialog.textContent).toContain("I'm an adult");
  expect(dialog.textContent).toContain("Skip");
});

test("AA-UI2. 시스템 뒤로가기는 취소와 같다", () => {
  const onCancel = vi.fn<() => void>();
  render(<AdultAckDialog name="차서연" onConfirm={vi.fn<() => void>()} onCancel={onCancel} />);
  expect(systemBack()).toBe(true);
  expect(onCancel).toHaveBeenCalledTimes(1);
});
