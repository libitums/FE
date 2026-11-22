import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@lynx-js/react/testing-library";

import { AdultAckSheet } from "./AdultAckSheet";
import { clearBackHandlers, systemBack, tapId } from "./chat-ui.test-support";
import { suggestedFriendsTestIds as ids } from "./suggested-friends.contract";
import type { FriendGender } from "./suggested-friends.contract";

// `ui` 계층(AA1 ~ AA3): 「Get closer」 시트(ADR-0164 D4, 디자인 B1 SoftSheet). 얼굴 · 제목 · 본문 · 회색 안내 두 줄 ·
// Sounds good · Just friends for now. 막 탭 · 시스템 뒤로가기는 닫기만(추가하지 않음).

afterEach(() => {
  cleanup();
  clearBackHandlers();
});

function mount(gender: FriendGender = "female") {
  const handlers = { onConfirm: vi.fn(), onDecline: vi.fn(), onClose: vi.fn() };
  render(
    <AdultAckSheet
      name="차서연"
      avatarUrl="https://img/seoyeon.webp"
      gender={gender}
      {...handlers}
    />,
  );
  return handlers;
}

test("AA1. 제목 · 본문 · 안내 두 줄 · 두 단추(대명사는 인물 데이터)", () => {
  mount("female");
  const sheet = screen.getByTestId(ids.adultAck);
  const text = sheet.textContent ?? "";
  expect(text).toContain("Get closer with 차서연?");
  expect(text).toContain("She can be warmer and more personal with you");
  expect(text).toContain("Always kind and respectful. Never anything explicit.");
  expect(text).toContain("Want to keep it casual later? Just tell her.");
  expect(screen.getByTestId(ids.adultAckConfirm).textContent).toContain("Sounds good");
  expect(screen.getByTestId(ids.adultAckDecline).textContent).toContain("Just friends for now");
  expect(sheet.querySelector('[data-testid="ui-lynx-avatar"]')).not.toBeNull();
});

test("AA2. Sounds good → onConfirm, Just friends for now → onDecline", () => {
  const { onConfirm, onDecline, onClose } = mount("male");
  expect(screen.getByTestId(ids.adultAck).textContent).toContain("Just tell him.");
  tapId(ids.adultAckConfirm);
  expect(onConfirm).toHaveBeenCalledTimes(1);
  tapId(ids.adultAckDecline);
  expect(onDecline).toHaveBeenCalledTimes(1);
  expect(onClose).not.toHaveBeenCalled();
});

test("AA3. 시스템 뒤로가기는 닫기만", () => {
  const { onConfirm, onDecline, onClose } = mount(null);
  expect(systemBack()).toBe(true);
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(onConfirm).not.toHaveBeenCalled();
  expect(onDecline).not.toHaveBeenCalled();
});
