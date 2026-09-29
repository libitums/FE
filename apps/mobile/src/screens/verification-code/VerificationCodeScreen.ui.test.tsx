import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { authFailureMessage } from "../../lib/auth-failure";
import type {
  PhoneNumber,
  PhoneOtpRequestResult,
  PhoneOtpVerifyOutcome,
} from "../../lib/auth-session.contract";
import { verificationCodeLength } from "./verification-code";
import type { VerificationCodeScreenProps } from "./verification-code.contract";
import { VerificationCodeScreen } from "./VerificationCodeScreen";

// `ui` 계층: 실제 컴포넌트를 렌더하고 코드 칸·완성 판정·카운트다운·요청 상태·오류를
// 봅니다(ADR-0006 D4). 완성 판정은 `isVerificationCodeComplete`의 결과를 화면이
// 그리기만 합니다 — 이 파일은 그 로직을 다시 적지 않습니다.
//
// 계약 개정(spec.md §2.3): `phoneNumber`가 필수(`PhoneNumber`)로 바뀌고
// `onSubmit()` → `onVerifyCode(request)`(비동기) · `onResendCode`(신규, 비동기)로
// 갈립니다. 네트워크는 부르지 않습니다 — 끝나지 않는 요청은 `new Promise(() => {})`,
// 끝나는 요청은 풀 수 있는 Promise(deferred)로 짓습니다.

const defaultPhone: PhoneNumber = { e164: "+821012345678", display: "+82 10 1234 5678" };

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

function fireDigit(index: number, value: string) {
  const EventConstructor = document.defaultView?.CustomEvent;
  if (!EventConstructor) throw new Error("CustomEvent is unavailable");
  const ref = lynx
    .createSelectorQuery()
    .select(`.verification-code-screen-digit-${index} .ui-lynx-compact-numeric-input`);
  fireEvent(
    ref as unknown as Element,
    new EventConstructor("bindEvent:input", { detail: { value } }),
  );
}

function submitButton(): HTMLElement {
  return within(screen.getByTestId("verification-code-screen-submit")).getByTestId(
    "ui-lynx-button",
  );
}

function resendButton(): HTMLElement {
  return within(screen.getByTestId("verification-code-screen-resend")).getByTestId(
    "ui-lynx-button",
  );
}

function exitButton(): HTMLElement {
  return within(screen.getByTestId("verification-code-screen-exit")).getByTestId(
    "ui-lynx-round-button",
  );
}

function actionUnitIds(container: Element): (string | null)[] {
  return [
    ...container.querySelectorAll('[accessibility-element="true"][accessibility-traits="button"]'),
  ].map(
    (el) =>
      el.closest('[data-testid^="verification-code-screen-"]')?.getAttribute("data-testid") ?? null,
  );
}

// ------------------------------------------------------------ 렌더 헬퍼
//
// 넷 다 필수라 기본값을 여기서 쥡니다. 개별 케이스는 필요한 콜백만 갈아 끼웁니다.

function renderVerification(
  overrides: {
    phoneNumber?: PhoneNumber;
    onVerifyCode?: VerificationCodeScreenProps["onVerifyCode"];
    onResendCode?: VerificationCodeScreenProps["onResendCode"];
    onExit?: VerificationCodeScreenProps["onExit"];
  } = {},
) {
  return render(
    <VerificationCodeScreen
      phoneNumber={overrides.phoneNumber ?? defaultPhone}
      onVerifyCode={
        overrides.onVerifyCode ?? (() => Promise.resolve({ status: "verified" as const }))
      }
      onResendCode={overrides.onResendCode ?? (() => Promise.resolve({ status: "sent" as const }))}
      onExit={overrides.onExit ?? vi.fn()}
    />,
  );
}

// ------------------------------------------------------------ Promise 짓기

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

async function flushMicrotasks() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

// ------------------------------------------------------------ announce 대역
//
// 형태의 정본은 `AssessmentScreen.ui.test.tsx:36-62`입니다.

type HostCall = { args: readonly unknown[] };

function stubAnnounceHost(): HostCall[] {
  const calls: HostCall[] = [];
  vi.stubGlobal("NativeModules", {
    LynxAccessibilityModule: {
      accessibilityAnnounce: (...args: readonly unknown[]) => void calls.push({ args }),
    },
  });
  return calls;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("VerificationCodeScreen", () => {
  it("[VC-U1] 제목 · 안내 · 번호 · 칸 여섯 · 카운트다운 · Resend · Continue · 뒤로가기가 선다", () => {
    renderVerification();

    expect(verificationCodeLength).toBe(6);

    expect(screen.getByTestId("verification-code-screen-title")).toHaveTextContent(
      "Verification code OTP",
    );
    expect(screen.getByTestId("verification-code-screen-description")).toHaveTextContent(
      "A verification code has been sent to",
    );
    expect(screen.getByTestId("verification-code-screen-phone")).toHaveTextContent(
      defaultPhone.display,
    );
    expect(
      within(screen.getByTestId("verification-code-screen-input")).getAllByTestId(
        "ui-lynx-compact-numeric-input",
      ),
    ).toHaveLength(6);
    expect(screen.getByTestId("verification-code-screen-timer")).toHaveTextContent("05:00");
    expect(screen.getByTestId("verification-code-screen-resend")).toHaveTextContent("Resend");
    expect(submitButton()).toBeInTheDocument();

    const scroll = screen.getByTestId("verification-code-screen-scroll");
    const accessibilityAttrs = Array.from(scroll.attributes).filter((attr) =>
      attr.name.startsWith("accessibility-"),
    );
    expect(accessibilityAttrs).toHaveLength(0);
  });

  it("[VC-U2] phoneNumber는 필수 prop이라 번호 줄이 늘 선다", () => {
    const phoneNumber: PhoneNumber = { e164: "+81901234567", display: "+81 90 1234 567" };
    renderVerification({ phoneNumber });

    expect(screen.getByTestId("verification-code-screen-phone")).toHaveTextContent(
      phoneNumber.display,
    );
  });

  it("[VC-U3] 5자리까지는 data-complete가 false이고 Continue를 눌러도 onVerifyCode가 0회다", () => {
    const onVerifyCode = vi.fn(() => Promise.resolve({ status: "verified" as const }));
    renderVerification({ onVerifyCode });

    typeCode("12345");
    expect(screen.getByTestId("verification-code-screen-submit")).toHaveAttribute(
      "data-complete",
      "false",
    );

    fireEvent.tap(submitButton(), {});
    expect(onVerifyCode).not.toHaveBeenCalled();
  });

  it("[VC-U4] 6자리를 채우면 data-complete가 true이고 Continue를 누르면 onVerifyCode가 1회 불린다", () => {
    const onVerifyCode = vi.fn(() => Promise.resolve({ status: "verified" as const }));
    renderVerification({ onVerifyCode });

    typeCode("123456");
    expect(screen.getByTestId("verification-code-screen-submit")).toHaveAttribute(
      "data-complete",
      "true",
    );

    fireEvent.tap(submitButton(), {});
    expect(onVerifyCode).toHaveBeenCalledTimes(1);
    expect(onVerifyCode).toHaveBeenCalledWith({ phone: defaultPhone, code: "123456" });
  });

  it("[VC-U5] 뒤로가기는 'Back' 이름의 RoundButton이고 누르면 onExit 1회다", () => {
    const onExit = vi.fn();
    renderVerification({ onExit });

    const back = exitButton();
    expect(back).toHaveAttribute("accessibility-label", "Back");

    fireEvent.tap(back, {});
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it("[VC-U6] 제목이 header이고, Continue에 accessibility-traits='disabled'가 붙지 않는다", () => {
    renderVerification();

    expect(screen.getByTestId("verification-code-screen-title")).toHaveAttribute(
      "accessibility-traits",
      "header",
    );
    const submit = submitButton();
    expect(submit).toBeInTheDocument();
    expect(submit).not.toHaveAttribute("accessibility-traits", "disabled");
  });

  it("조작 단위가 뒤로가기 · Resend · Continue 셋이고 코드 칸 여섯은 접근성 트리에 남는다", () => {
    const { container } = renderVerification();

    expect(actionUnitIds(container)).toEqual([
      "verification-code-screen-exit",
      "verification-code-screen-resend",
      "verification-code-screen-submit",
    ]);

    const digits = screen.getAllByTestId("ui-lynx-compact-numeric-input");
    for (const digit of digits) {
      expect(digit).toHaveAttribute("accessibility-element", "true");
    }
  });

  it("[VC-U7] 칸 라벨이 Digit 1 of 6 … Digit 6 of 6이다", () => {
    renderVerification();

    const digits = screen.getAllByTestId("ui-lynx-compact-numeric-input");
    expect(digits.map((digit) => digit.getAttribute("accessibility-label"))).toEqual([
      "Digit 1 of 6",
      "Digit 2 of 6",
      "Digit 3 of 6",
      "Digit 4 of 6",
      "Digit 5 of 6",
      "Digit 6 of 6",
    ]);
  });

  it("[VC-A1] 검증이 안 끝난 동안 data-status가 verifying이고 Continue·Resend·뒤로가기·칸 입력이 무동작이다", () => {
    const onVerifyCode = vi.fn(() => new Promise<PhoneOtpVerifyOutcome>(() => {}));
    const onResendCode = vi.fn();
    const onExit = vi.fn();
    renderVerification({ onVerifyCode, onResendCode, onExit });

    typeCode("123456");
    fireEvent.tap(submitButton(), {});

    const submit = screen.getByTestId("verification-code-screen-submit");
    expect(submit).toHaveAttribute("data-status", "verifying");

    fireEvent.tap(submitButton(), {});
    expect(onVerifyCode).toHaveBeenCalledTimes(1);

    fireEvent.tap(resendButton(), {});
    expect(onResendCode).not.toHaveBeenCalled();

    fireEvent.tap(exitButton(), {});
    expect(onExit).not.toHaveBeenCalled();

    // spec §5.2 개정(2026-09-29): 요청 중에는 코드 칸 입력도 무동작입니다 — 첫 칸을
    // 지워도 값이 바뀌지 않아 data-complete가 그대로 true입니다.
    fireDigit(0, "");
    expect(submit).toHaveAttribute("data-complete", "true");
  });

  it("[VC-A5] 요청 중에 막힌 입력은 칸을 지금 값으로 되돌린다 — 보이는 코드와 보낸 코드가 같다", () => {
    const onVerifyCode = vi.fn(() => new Promise<PhoneOtpVerifyOutcome>(() => {}));
    renderVerification({ onVerifyCode });

    typeCode("123456");
    fireEvent.tap(submitButton(), {});
    fireDigit(0, "");

    const cells = screen.getAllByTestId("ui-lynx-compact-numeric-input");
    expect(cells.map((cell) => cell.getAttribute("default-value"))).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
    ]);
  });

  it("[VC-A2] 검증이 invalid-code로 실패하면 오류가 서고 announce가 1회 불리며, 숫자를 넣으면 오류가 사라진다", async () => {
    const calls = stubAnnounceHost();
    const { promise, resolve } = deferred<PhoneOtpVerifyOutcome>();
    const onVerifyCode = vi.fn(() => promise);
    renderVerification({ onVerifyCode });

    typeCode("123456");
    fireEvent.tap(submitButton(), {});

    resolve({ status: "failed", reason: "invalid-code" });
    await flushMicrotasks();

    const submit = screen.getByTestId("verification-code-screen-submit");
    expect(submit).toHaveAttribute("data-status", "failed");
    expect(screen.getByTestId("verification-code-screen-error")).toHaveTextContent(
      authFailureMessage("invalid-code"),
    );
    expect(calls).toHaveLength(1);
    expect(calls[0]?.args[0]).toEqual({ content: authFailureMessage("invalid-code") });

    fireDigit(0, "9");

    expect(screen.queryByTestId("verification-code-screen-error")).not.toBeInTheDocument();
    expect(submit).toHaveAttribute("data-status", "idle");
  });

  it("[VC-U8] 3초 흐른 뒤 Resend를 누르면 onResendCode가 불리고, sent로 풀리면 타이머가 05:00이 된다", async () => {
    vi.useFakeTimers();
    try {
      const { promise, resolve } = deferred<PhoneOtpRequestResult>();
      const onResendCode = vi.fn(() => promise);
      renderVerification({ onResendCode });

      for (let tick = 0; tick < 3; tick += 1) {
        await act(async () => {
          await vi.advanceTimersByTimeAsync(1000);
        });
      }
      expect(screen.getByTestId("verification-code-screen-timer")).toHaveTextContent("04:57");

      fireEvent.tap(resendButton(), {});
      expect(onResendCode).toHaveBeenCalledTimes(1);
      expect(onResendCode).toHaveBeenCalledWith(defaultPhone);

      resolve({ status: "sent" });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(screen.getByTestId("verification-code-screen-timer")).toHaveTextContent("05:00");
    } finally {
      vi.useRealTimers();
    }
  });

  it("[VC-A3] Resend가 rate-limited로 실패하면 타이머가 되돌아가지 않고 입력이 남아 Continue가 동작한다", async () => {
    vi.useFakeTimers();
    try {
      const onVerifyCode = vi.fn(() => Promise.resolve({ status: "verified" as const }));
      const { promise, resolve } = deferred<PhoneOtpRequestResult>();
      const onResendCode = vi.fn(() => promise);
      renderVerification({ onVerifyCode, onResendCode });

      typeCode("123456");

      for (let tick = 0; tick < 3; tick += 1) {
        await act(async () => {
          await vi.advanceTimersByTimeAsync(1000);
        });
      }
      expect(screen.getByTestId("verification-code-screen-timer")).toHaveTextContent("04:57");

      fireEvent.tap(resendButton(), {});
      resolve({ status: "failed", reason: "rate-limited" });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(screen.getByTestId("verification-code-screen-timer")).toHaveTextContent("04:57");
      expect(screen.getByTestId("verification-code-screen-error")).toHaveTextContent(
        authFailureMessage("rate-limited"),
      );

      fireEvent.tap(submitButton(), {});
      expect(onVerifyCode).toHaveBeenCalledWith({ phone: defaultPhone, code: "123456" });
    } finally {
      vi.useRealTimers();
    }
  });

  it("[VC-U9] Resend가 sent로 풀린 뒤에 입력이 지워져 Continue가 무동작이다", async () => {
    const onVerifyCode = vi.fn(() => Promise.resolve({ status: "verified" as const }));
    const { promise, resolve } = deferred<PhoneOtpRequestResult>();
    const onResendCode = vi.fn(() => promise);
    renderVerification({ onVerifyCode, onResendCode });

    typeCode("123456");
    expect(screen.getByTestId("verification-code-screen-submit")).toHaveAttribute(
      "data-complete",
      "true",
    );

    fireEvent.tap(resendButton(), {});
    resolve({ status: "sent" });
    await flushMicrotasks();

    expect(screen.getByTestId("verification-code-screen-submit")).toHaveAttribute(
      "data-complete",
      "false",
    );

    fireEvent.tap(submitButton(), {});
    expect(onVerifyCode).not.toHaveBeenCalled();
  });

  it("[VC-A4] 재전송이 안 끝난 동안 data-status가 resending이고 Continue·뒤로가기·칸 입력이 무동작이다", () => {
    const onVerifyCode = vi.fn();
    const onExit = vi.fn();
    const onResendCode = vi.fn(() => new Promise<PhoneOtpRequestResult>(() => {}));
    renderVerification({ onVerifyCode, onExit, onResendCode });

    typeCode("123456");
    fireEvent.tap(resendButton(), {});

    const submit = screen.getByTestId("verification-code-screen-submit");
    expect(submit).toHaveAttribute("data-status", "resending");

    fireEvent.tap(submitButton(), {});
    expect(onVerifyCode).not.toHaveBeenCalled();

    fireEvent.tap(exitButton(), {});
    expect(onExit).not.toHaveBeenCalled();

    // spec §5.2 — resending도 verifying과 같은 무동작 규칙입니다(칸 입력 포함).
    fireDigit(0, "9");
    expect(submit).toHaveAttribute("data-complete", "true");
  });
});
