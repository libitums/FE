import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import {
  clearBackHandlers,
  mountChat,
  systemBack,
  tapButtonIn,
  tapId,
} from "./chat-ui.test-support";
import type { ChatReportReasonId } from "./chat-source.contract";
import { isInDocumentOrder } from "../../lib/dom.test-support";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";
import { ReportSheet } from "./ReportSheet";

// `ui` 계층(MC-UI17): 신고 시트(O1) — 사유 다섯 체크 줄(data-checked 다중) · 보내기는 하나 이상 체크해야 켜짐 ·
// 보내기 → source.report(사유들) 뒤 닫힘 · scrim · 닫기 · Cancel · 시스템 뒤로로 닫힘.

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
  vi.useRealTimers();
});

const reasonIds: readonly ChatReportReasonId[] = [
  "rude",
  "sexual",
  "hateful",
  "wrong-korean",
  "other",
];

function mountSheet(reasons: readonly ChatReportReasonId[] = []) {
  const handlers = {
    onToggle: vi.fn<(id: ChatReportReasonId) => void>(),
    onSend: vi.fn<() => void>(),
    onClose: vi.fn<() => void>(),
  };
  render(<ReportSheet reasons={reasons} {...handlers} />);
  return handlers;
}

const sendDisabled = () =>
  within(screen.getByTestId("ui-lynx-bottom-sheet-action-send"))
    .getByTestId("ui-lynx-button")
    .getAttribute("data-disabled");

test("MC-UI17. 시트에 제목 · 설명과 사유 다섯 줄이 정해진 순서로 선다", () => {
  mountSheet();

  const sheet = screen.getByTestId(ids.reportSheet);
  expect(sheet.textContent).toContain("Report this chat");
  expect(sheet.textContent).toContain("Choose what's wrong. You can pick more than one.");
  const rows = reasonIds.map((id) => screen.getByTestId(ids.reportReason(id)));
  expect(rows.every((row) => sheet.contains(row))).toBe(true);
  expect(isInDocumentOrder(rows)).toBe(true);
  expect(rows[0]?.textContent).toContain("Rude or harassing");
  expect(rows[3]?.textContent).toContain("Wrong Korean or mistakes");
});

test("MC-UI17. 사유 줄은 checkbox 역할이고 data-checked가 reasons를 따르며 낭독에 checked가 든다(다중)", () => {
  mountSheet(["rude", "hateful"]);

  for (const id of reasonIds) {
    const row = screen.getByTestId(ids.reportReason(id));
    const on = id === "rude" || id === "hateful";
    expect(row.getAttribute("accessibility-role-description")).toBe("checkbox");
    expect(row.getAttribute("data-checked")).toBe(on ? "true" : "false");
    expect(row.getAttribute("accessibility-label")).toContain(on ? ", checked" : ", not checked");
  }
});

test("MC-UI17. 사유 줄을 탭하면 onToggle이 그 id로 한 번 불린다", () => {
  const { onToggle } = mountSheet();

  fireEvent.tap(screen.getByTestId(ids.reportReason("sexual")), {});

  expect(onToggle).toHaveBeenCalledTimes(1);
  expect(onToggle).toHaveBeenCalledWith("sexual");
});

test("MC-UI17. 아무것도 체크하지 않으면 Send report가 꺼져 있고 눌러도 onSend가 없다", () => {
  const { onSend } = mountSheet([]);

  expect(sendDisabled()).toBe("true");
  tapButtonIn("ui-lynx-bottom-sheet-action-send");

  expect(onSend).not.toHaveBeenCalled();
});

test("MC-UI17. 하나라도 체크하면 Send report가 켜지고 탭하면 onSend가 한 번 불린다", () => {
  const { onSend } = mountSheet(["other"]);

  expect(sendDisabled()).toBe("false");
  tapButtonIn("ui-lynx-bottom-sheet-action-send");

  expect(onSend).toHaveBeenCalledTimes(1);
});

test("MC-UI17. scrim · 닫기 단추 · Cancel이 각각 onClose를 부른다", () => {
  const { onClose } = mountSheet(["rude"]);

  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-sheet-scrim"), {});
  expect(onClose).toHaveBeenCalledTimes(1);
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-sheet-close"), {});
  expect(onClose).toHaveBeenCalledTimes(2);
  tapButtonIn("ui-lynx-bottom-sheet-action-cancel");
  expect(onClose).toHaveBeenCalledTimes(3);
});

// ----------------------------------------------------------------------- 화면 결선

function openReport() {
  const mounted = mountChat();
  tapId(ids.more);
  tapId(ids.moreItem("report"));
  return mounted;
}

test("MC-UI17. 화면: 두 사유를 체크하고 보내면 출처에 사유가 정해진 순서로 가고 시트가 닫힌다", () => {
  const { source } = openReport();
  const report = vi.spyOn(source, "report");

  fireEvent.tap(screen.getByTestId(ids.reportReason("hateful")), {});
  fireEvent.tap(screen.getByTestId(ids.reportReason("rude")), {});
  expect(screen.getByTestId(ids.reportReason("rude")).getAttribute("data-checked")).toBe("true");
  tapButtonIn("ui-lynx-bottom-sheet-action-send");

  expect(report).toHaveBeenCalledTimes(1);
  expect(report).toHaveBeenCalledWith("mina", ["rude", "hateful"]);
  expect(screen.queryByTestId(ids.reportSheet)).toBeNull();
});

test("MC-UI17. 화면: 같은 사유를 두 번 탭하면 체크가 풀리고 다시 꺼진다", () => {
  openReport();

  fireEvent.tap(screen.getByTestId(ids.reportReason("other")), {});
  expect(sendDisabled()).toBe("false");
  fireEvent.tap(screen.getByTestId(ids.reportReason("other")), {});

  expect(screen.getByTestId(ids.reportReason("other")).getAttribute("data-checked")).toBe("false");
  expect(sendDisabled()).toBe("true");
});

test("MC-UI17. 화면: Cancel · 시스템 뒤로 · 열 때마다 처음 상태로 닫히고 다시 연다", () => {
  const { source } = openReport();
  const report = vi.spyOn(source, "report");
  fireEvent.tap(screen.getByTestId(ids.reportReason("rude")), {});

  tapButtonIn("ui-lynx-bottom-sheet-action-cancel");
  expect(screen.queryByTestId(ids.reportSheet)).toBeNull();
  expect(report).not.toHaveBeenCalled();

  tapId(ids.more);
  tapId(ids.moreItem("report"));
  expect(screen.getByTestId(ids.reportReason("rude")).getAttribute("data-checked")).toBe("false");

  expect(systemBack()).toBe(true);
  expect(screen.queryByTestId(ids.reportSheet)).toBeNull();
  expect(report).not.toHaveBeenCalled();
});
