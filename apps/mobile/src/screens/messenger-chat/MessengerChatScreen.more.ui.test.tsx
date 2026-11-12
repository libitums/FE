import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, screen } from "@lynx-js/react/testing-library";

import * as inputFocus from "./chat-input-focus";
import {
  advance,
  clearBackHandlers,
  mountChat,
  presenceProbe,
  systemBack,
  tapButtonIn,
  tapId,
} from "./chat-ui.test-support";
import { isInDocumentOrder } from "../../lib/dom.test-support";
import { chatFeedbackTestIds } from "./chat-feedback.contract";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";

// `ui` 계층(MC-UI16): 「…」 메뉴 — 항목 셋 고정 순서 · 항목 → 신고 · 고쳐 주세요 · 다시 만들기 겹침 ·
// 시스템 뒤로로 닫힘 · 겹침이 닫힌 뒤 접근성 초점 복귀(origin test-id) · 휴대폰 모드에서 겹침을 열면 초점을 내린다.

vi.mock("./chat-input-focus", () => ({
  focusPhoneInput: vi.fn<() => void>(),
  blurPhoneInput: vi.fn<() => void>(),
  clearPhoneInput: vi.fn<() => void>(),
  restoreAccessibilityFocus: vi.fn<(testId: string) => void>(),
}));

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
  vi.useRealTimers();
});

test("MC-UI16. 처음에는 메뉴가 없고 「…」 단추는 closed이다", () => {
  mountChat();

  expect(screen.queryByTestId(ids.moreMenu)).toBeNull();
  expect(screen.getByTestId(ids.more).getAttribute("data-state")).toBe("closed");
});

test("MC-UI16. 「…」를 누르면 메뉴가 열려 항목 셋이 ideas · fix · report 순서로 서고 단추는 open이다", () => {
  mountChat();

  tapId(ids.more);

  expect(screen.getByTestId(ids.more).getAttribute("data-state")).toBe("open");
  const menu = screen.getByTestId(ids.moreMenu);
  const items = (["ideas", "report"] as const).map((action) =>
    screen.getByTestId(ids.moreItem(action)),
  );
  for (const item of items) expect(menu.contains(item)).toBe(true);
  const [ideas, report] = items;
  expect(isInDocumentOrder(items)).toBe(true);
  expect(ideas?.textContent).toContain("New reply ideas");
  // 「Ask for a fix」는 👎 이유가 대신합니다(ADR-0129).
  expect(screen.queryByTestId("messenger-chat-more-fix")).toBeNull();
  expect(report?.textContent).toContain("Report");
});

test("MC-UI16. 「…」를 다시 누르면 메뉴가 닫힌다", () => {
  mountChat();
  tapId(ids.more);

  tapId(ids.more);

  expect(screen.queryByTestId(ids.moreMenu)).toBeNull();
  expect(screen.getByTestId(ids.more).getAttribute("data-state")).toBe("closed");
});

test("MC-UI16. 시스템 뒤로가기가 메뉴를 닫는다", () => {
  mountChat();
  tapId(ids.more);

  const handled = systemBack();

  expect(handled).toBe(true);
  expect(screen.queryByTestId(ids.moreMenu)).toBeNull();
});

test("MC-UI16. Report 항목은 메뉴를 닫고 신고 시트를 연다", () => {
  mountChat();
  tapId(ids.more);

  tapId(ids.moreItem("report"));

  expect(screen.queryByTestId(ids.moreMenu)).toBeNull();
  expect(screen.getByTestId(ids.reportSheet)).toBeTruthy();
});

test("MC-UI16. New reply ideas 항목은 다시 만들기 확인을 연다", () => {
  mountChat();
  tapId(ids.more);

  tapId(ids.moreItem("ideas"));

  expect(screen.queryByTestId(ids.moreMenu)).toBeNull();
  expect(screen.getByTestId(ids.regenDialog)).toBeTruthy();
});

test("MC-UI16. 겹침은 늘 하나다 — 신고 시트가 열린 동안 다른 겹침이 없다", () => {
  mountChat();
  tapId(ids.more);
  tapId(ids.moreItem("report"));

  expect(screen.queryByTestId(chatFeedbackTestIds.sheet)).toBeNull();
  expect(screen.queryByTestId(ids.regenDialog)).toBeNull();
  expect(screen.queryByTestId(ids.sidebar)).toBeNull();
});

test("MC-UI16. 신고 시트를 Cancel로 닫으면 접근성 초점이 「…」 단추로 돌아간다(한 번)", () => {
  mountChat();
  tapId(ids.more);
  tapId(ids.moreItem("report"));
  expect(inputFocus.restoreAccessibilityFocus).not.toHaveBeenCalled();

  tapButtonIn("ui-lynx-bottom-sheet-action-cancel");
  advance(16); // 복원은 뒤 화면이 낭독에 다시 나타난 다음 프레임에 부른다(a11y C1)

  expect(screen.queryByTestId(ids.reportSheet)).toBeNull();
  expect(inputFocus.restoreAccessibilityFocus).toHaveBeenCalledTimes(1);
  expect(inputFocus.restoreAccessibilityFocus).toHaveBeenCalledWith(ids.more);
});

test("MC-UI16. 메뉴를 시스템 뒤로로 닫아도 초점이 「…」 단추로 돌아간다", () => {
  mountChat();
  tapId(ids.more);

  systemBack();
  advance(16);

  expect(inputFocus.restoreAccessibilityFocus).toHaveBeenCalledTimes(1);
  expect(inputFocus.restoreAccessibilityFocus).toHaveBeenCalledWith(ids.more);
});

test("MC-UI16. 휴대폰 모드에서 겹침을 열면 입력 초점을 내린다", () => {
  mountChat({ probe: presenceProbe("present") });

  tapId(ids.more);

  expect(inputFocus.blurPhoneInput).toHaveBeenCalled();
});

test("MC-UI16. 학습 모드에서는 겹침을 열어도 입력 초점을 건드리지 않는다", () => {
  mountChat({ probe: presenceProbe("absent") });

  tapId(ids.more);
  tapId(ids.moreItem("report"));

  expect(screen.getByTestId(ids.reportSheet)).toBeTruthy();
  expect(inputFocus.blurPhoneInput).not.toHaveBeenCalled();
});

// 기기 점검(사용자, 2026-11-10): 항목을 눌러도 열리지 않았다 — 메뉴가 기능 줄 상자 밖(위)으로 튀어나와 그려져
// 탭이 닿지 않았다. 메뉴는 대화 영역(머리 + 로그) 안에 있고, 기능 줄 감싸개 안에는 없다.
test("MC-UI16b. 「…」 메뉴는 기능 줄 감싸개가 아니라 대화 영역 안에 그려진다", () => {
  mountChat();
  tapId(ids.more);

  const menu = screen.getByTestId(ids.moreMenu);
  const classesUp: string[] = [];
  for (let el = menu.parentElement; el !== null; el = el.parentElement) {
    classesUp.push(el.getAttribute("class") ?? "");
  }

  expect(classesUp.some((c) => c.split(/\s+/).includes("messenger-chat-features-wrap"))).toBe(
    false,
  );
  expect(classesUp.some((c) => c.split(/\s+/).includes("messenger-chat-main"))).toBe(true);
});
