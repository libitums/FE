import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

import {
  BOTTOM_SHEET_DRAG_DISMISS_THRESHOLD,
  getBottomSheetContract,
  shouldDismissBottomSheetDrag,
} from "./bottom-sheet.contract";

describe("BottomSheet contract", () => {
  test("기본 motion과 draggable 상태를 정규화한다", () => {
    expect(
      getBottomSheetContract({
        title: "잠깐 쉬어 갈까요?",
        closeAccessibilityLabel: "복습 시트 닫기",
        ondismiss: () => undefined,
      }),
    ).toMatchObject({
      title: "잠깐 쉬어 갈까요?",
      closeAccessibilityLabel: "복습 시트 닫기",
      draggable: true,
      motion: "standard",
      className: "ui-lynx-bottom-sheet ui-lynx-bottom-sheet-motion-standard",
    });
  });

  test.each([
    [{ title: "", closeAccessibilityLabel: "닫기", ondismiss: () => undefined }, "title"],
    [
      { title: "복습", closeAccessibilityLabel: "  ", ondismiss: () => undefined },
      "closeAccessibilityLabel",
    ],
  ])("필수 접근성 문자열을 검증한다: %s", (props, field) => {
    expect(() => getBottomSheetContract(props)).toThrow(field);
  });

  test("action id와 label을 검증한다", () => {
    const base = {
      title: "복습",
      closeAccessibilityLabel: "닫기",
      ondismiss: () => undefined,
    };
    expect(() => getBottomSheetContract({ ...base, actions: [{ id: "", label: "시작" }] })).toThrow(
      "action id",
    );
    expect(() =>
      getBottomSheetContract({ ...base, actions: [{ id: "start", label: "" }] }),
    ).toThrow("action label");
    expect(() =>
      getBottomSheetContract({
        ...base,
        actions: [
          { id: "start", label: "시작" },
          { id: "start", label: "다시 시작" },
        ],
      }),
    ).toThrow("unique");
  });

  test("description이 없으면 action만으로 빈 body를 만들지 않는다", () => {
    expect(
      getBottomSheetContract({
        title: "복습",
        closeAccessibilityLabel: "닫기",
        actions: [{ id: "start", label: "시작" }],
        ondismiss: () => undefined,
      }).hasBody,
    ).toBe(false);
  });

  test("아래 방향으로 48px 이상 끌었을 때만 닫는다", () => {
    expect(BOTTOM_SHEET_DRAG_DISMISS_THRESHOLD).toBe(48);
    expect(shouldDismissBottomSheetDrag(100, 147)).toBe(false);
    expect(shouldDismissBottomSheetDrag(100, 148)).toBe(true);
    expect(shouldDismissBottomSheetDrag(100, 40)).toBe(false);
  });

  test("원본 디자인의 surface, radius, spacing, motion, focus 토큰을 사용한다", () => {
    const styles = readFileSync(
      resolve(process.cwd(), "src/bottom-sheet/bottom-sheet.css"),
      "utf8",
    );
    expect(styles).toContain("var(--libitum-elevation-z-sheet)");
    expect(styles).toContain("rgba(26, 28, 32, 0.45)");
    expect(styles).toContain("var(--libitum-color-background-elevated)");
    expect(styles).toContain("var(--libitum-radius-lg)");
    expect(styles).toContain("var(--libitum-spacing-16)");
    expect(styles).toContain("env(safe-area-inset-bottom)");
    expect(styles).toMatch(/ui-lynx-bottom-sheet-body[\s\S]*flex:\s*1/);
    expect(styles).toMatch(/ui-lynx-bottom-sheet-actions[\s\S]*flex-shrink:\s*0/);
    expect(styles).toContain("var(--libitum-motion-duration-sheet)");
    expect(styles).toContain("var(--libitum-motion-easing-enter)");
    expect(styles).toContain("var(--libitum-color-border-strong)");
  });
});
