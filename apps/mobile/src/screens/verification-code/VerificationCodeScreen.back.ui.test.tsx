import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";
import { verificationCodeLength } from "./verification-code";
import { VerificationCodeScreen } from "./VerificationCodeScreen";

function renderVerification(overrides: {
  onExit: () => void;
  onVerifyCode?: Parameters<typeof VerificationCodeScreen>[0]["onVerifyCode"];
}) {
  return render(
    <VerificationCodeScreen
      phoneNumber={{ e164: "+821012345678", display: "+82 10 1234 5678" }}
      onVerifyCode={
        overrides.onVerifyCode ?? (() => Promise.resolve({ status: "verified" as const }))
      }
      onResendCode={() => Promise.resolve({ status: "sent" as const })}
      onExit={overrides.onExit}
    />,
  );
}

function typeCode(value: string) {
  const EventConstructor = document.defaultView?.CustomEvent;
  if (!EventConstructor) throw new Error("CustomEvent is unavailable");
  Array.from(value).forEach((digit, index) => {
    const ref = lynx
      .createSelectorQuery()
      .select(`.verification-code-screen-digit-${index} .ui-lynx-compact-numeric-input`);
    fireEvent(
      ref as unknown as Element,
      new EventConstructor("bindEvent:input", { detail: { value: digit } }),
    );
  });
}

// `ui` 계층: 시스템 뒤로가기(`backHandlers.runTop()`)가 보이는 닫기를 누른 것과 같은 결과를
// 내는지 봅니다. 스택은 실물이고, 케이스 사이에 정리 뒤 비어 있어야 합니다.

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  if (backHandlers.runTop()) {
    throw new Error("뒤로가기 핸들러가 정리되지 않았습니다");
  }
});

function pressBack(): boolean {
  let handled = false;
  act(() => {
    handled = backHandlers.runTop();
  });
  return handled;
}

test("[US21] 요청 중이 아니면 뒤로가기는 onExit 1회", () => {
  const onExit = vi.fn<() => void>();
  renderVerification({ onExit });

  expect(pressBack()).toBe(true);

  expect(onExit).toHaveBeenCalledTimes(1);
});

test("[UN4] 요청 중 → runTop()은 true(등록은 됐다)지만 onExit은 0회", () => {
  const onExit = vi.fn<() => void>();
  const onVerifyCode = vi.fn(() => new Promise<never>(() => {}));
  renderVerification({ onExit, onVerifyCode });
  typeCode("1".repeat(verificationCodeLength));
  fireEvent.tap(
    within(screen.getByTestId("verification-code-screen-submit")).getByTestId("ui-lynx-button"),
    {},
  );
  expect(onVerifyCode).toHaveBeenCalledTimes(1);

  expect(pressBack()).toBe(true);

  expect(onExit).not.toHaveBeenCalled();
});
