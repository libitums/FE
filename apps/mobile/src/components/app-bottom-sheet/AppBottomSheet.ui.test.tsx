import { afterEach, expect, test } from "vitest";
import { cleanup, render, screen } from "@lynx-js/react/testing-library";

import { AppBottomSheet } from "./AppBottomSheet";

// `ui` 계층(SB-UI1 · SB-UI2 · SB-UI2b): 앱의 바텀 시트는 호스트가 넘긴 아래 시스템 바만큼 패널 맨 아래를 비운다 — Android 3버튼 ·
// 제스처 바가 시트 버튼을 가리던 것. 입력은 `lynx.__globalProps`, 관찰은 ui-lynx 시트의 빈 자리입니다.

function setGlobalProps(value: unknown): void {
  (lynx as unknown as { __globalProps: unknown }).__globalProps = value;
}

afterEach(() => {
  cleanup();
  setGlobalProps(undefined);
});

function renderSheet() {
  return render(
    <AppBottomSheet
      title="Birth year"
      closeAccessibilityLabel="Close"
      actions={[{ id: "save", label: "Save" }]}
      ondismiss={() => undefined}
    />,
  );
}

test("SB-UI1: Android 3버튼(아래 48) → 패널 맨 아래 48을 비운다", () => {
  setGlobalProps({
    safeAreaInsets: { top: 48, bottom: 48, left: 0, right: 0 },
    tappableBottomInset: 48,
  });
  renderSheet();
  const inset = screen.getByTestId("ui-lynx-bottom-sheet-inset");
  expect(inset.getAttribute("style") ?? "").toMatch(/height:\s*48px/);
});

test("SB-UI1b: Android 제스처(아래 24, 가로채지 않음) → 24를 비운다", () => {
  setGlobalProps({
    safeAreaInsets: { top: 48, bottom: 24, left: 0, right: 0 },
    tappableBottomInset: 0,
  });
  renderSheet();
  const inset = screen.getByTestId("ui-lynx-bottom-sheet-inset");
  expect(inset.getAttribute("style") ?? "").toMatch(/height:\s*24px/);
});

test("SB-UI2: iOS 홈 인디케이터(아래 34) → 기본 여백 20을 뺀 14를 더 비워 단추가 안전 영역 밖에 선다", () => {
  setGlobalProps({ safeAreaInsets: { top: 62, bottom: 34, left: 0, right: 0 } });
  renderSheet();
  const inset = screen.getByTestId("ui-lynx-bottom-sheet-inset");
  expect(inset.getAttribute("style") ?? "").toMatch(/height:\s*14px/);
});

test("SB-UI2b: iOS 홈 인디케이터 없음(SE, 아래 0) → 빈 자리 없음, 지금 모양 그대로", () => {
  setGlobalProps({ safeAreaInsets: { top: 20, bottom: 0, left: 0, right: 0 } });
  renderSheet();
  expect(screen.queryByTestId("ui-lynx-bottom-sheet-inset")).toBeNull();
});
