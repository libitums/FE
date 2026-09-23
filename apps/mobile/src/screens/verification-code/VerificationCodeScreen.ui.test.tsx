import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { VerificationCodeScreen } from "./VerificationCodeScreen";
import { verificationCodeValidSeconds } from "./verification-code";

// `ui` 계층: 실제 컴포넌트를 렌더하고 코드 칸 · 완성 판정 · 카운트다운 · 뒤로가기를 본다
// (ADR-0006 D4). 완성 판정은 `isVerificationCodeComplete`의 결과를 화면이 그리기만 한다
// (계약 §2.5) — 이 파일은 그 로직을 다시 적지 않는다.
//
// 2026-09-21 디자인 반영: 머리는 로그인과 같은 RoundButton 뒤로가기 · 제목 · 안내 · 번호,
// 입력은 한 자리 칸 넷(CompactNumericInput), 그 아래 5분 카운트다운 · Resend · Continue다.
// 칸마다 숫자만 받으므로(input-filter) 옛 TextField 오류 채널(VC-U2 · VC-U8)은 없어졌다.

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

function submitButton(): HTMLElement {
  return within(screen.getByTestId("verification-code-screen-submit")).getByTestId(
    "ui-lynx-button",
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

describe("VerificationCodeScreen (LIB-261)", () => {
  it("[VC-U1] 제목 · 안내 · 번호 · 칸 넷 · 카운트다운 · Resend · Continue · 뒤로가기가 선다", () => {
    render(
      <VerificationCodeScreen phoneNumber="+82 10 1234 5678" onSubmit={vi.fn()} onExit={vi.fn()} />,
    );

    expect(screen.getByTestId("verification-code-screen-title")).toHaveTextContent(
      "Verification code OTP",
    );
    expect(screen.getByTestId("verification-code-screen-description")).toHaveTextContent(
      "A verification code has been sent to",
    );
    expect(screen.getByTestId("verification-code-screen-phone")).toHaveTextContent(
      "+82 10 1234 5678",
    );
    expect(
      within(screen.getByTestId("verification-code-screen-input")).getAllByTestId(
        "ui-lynx-compact-numeric-input",
      ),
    ).toHaveLength(4);
    expect(screen.getByTestId("verification-code-screen-timer")).toHaveTextContent("05:00");
    expect(screen.getByTestId("verification-code-screen-resend")).toHaveTextContent("Resend");
    expect(submitButton()).toBeInTheDocument();

    const scroll = screen.getByTestId("verification-code-screen-scroll");
    const accessibilityAttrs = Array.from(scroll.attributes).filter((attr) =>
      attr.name.startsWith("accessibility-"),
    );
    expect(accessibilityAttrs).toHaveLength(0);
  });

  it("[VC-U2] 번호가 없으면 번호 줄을 그리지 않는다", () => {
    render(<VerificationCodeScreen onSubmit={vi.fn()} onExit={vi.fn()} />);

    expect(screen.getByTestId("verification-code-screen-description")).toBeInTheDocument();
    expect(screen.queryByTestId("verification-code-screen-phone")).not.toBeInTheDocument();
  });

  it("[VC-U3] 4자리 전에는 Continue가 data-complete='false'이고 눌러도 onSubmit이 0회다", () => {
    const onSubmit = vi.fn();
    render(<VerificationCodeScreen onSubmit={onSubmit} onExit={vi.fn()} />);

    typeCode("123");
    expect(screen.getByTestId("verification-code-screen-submit")).toHaveAttribute(
      "data-complete",
      "false",
    );

    fireEvent.tap(submitButton(), {});
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("[VC-U4] 4자리를 채우면 data-complete='true'이고 누르면 onSubmit이 1회다", () => {
    const onSubmit = vi.fn();
    render(<VerificationCodeScreen onSubmit={onSubmit} onExit={vi.fn()} />);

    typeCode("1234");
    expect(screen.getByTestId("verification-code-screen-submit")).toHaveAttribute(
      "data-complete",
      "true",
    );

    fireEvent.tap(submitButton(), {});
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("[VC-U5] 뒤로가기는 'Back' 이름의 RoundButton이고 누르면 onExit 1회다", () => {
    const onExit = vi.fn();
    render(<VerificationCodeScreen onSubmit={vi.fn()} onExit={onExit} />);

    const back = within(screen.getByTestId("verification-code-screen-exit")).getByTestId(
      "ui-lynx-round-button",
    );
    expect(back).toHaveAttribute("accessibility-label", "Back");

    fireEvent.tap(back, {});
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it("[VC-U6] 제목이 header이고, Continue에 accessibility-traits='disabled'가 붙지 않는다", () => {
    render(<VerificationCodeScreen onSubmit={vi.fn()} onExit={vi.fn()} />);

    expect(screen.getByTestId("verification-code-screen-title")).toHaveAttribute(
      "accessibility-traits",
      "header",
    );
    const submit = submitButton();
    expect(submit).toBeInTheDocument();
    expect(submit).not.toHaveAttribute("accessibility-traits", "disabled");
  });

  it("[VC-U7] 조작 단위가 뒤로가기 · Resend · Continue 셋이고 코드 칸 넷은 접근성 트리에 남는다", () => {
    const { container } = render(<VerificationCodeScreen onSubmit={vi.fn()} onExit={vi.fn()} />);

    expect(actionUnitIds(container)).toEqual([
      "verification-code-screen-exit",
      "verification-code-screen-resend",
      "verification-code-screen-submit",
    ]);

    const digits = screen.getAllByTestId("ui-lynx-compact-numeric-input");
    expect(digits.map((digit) => digit.getAttribute("accessibility-label"))).toEqual([
      "Digit 1 of 4",
      "Digit 2 of 4",
      "Digit 3 of 4",
      "Digit 4 of 4",
    ]);
    for (const digit of digits) {
      expect(digit).toHaveAttribute("accessibility-element", "true");
    }
  });

  it("[VC-U8] 카운트다운이 1초마다 줄고 Resend를 누르면 5분부터 다시 센다", () => {
    vi.useFakeTimers();
    try {
      render(<VerificationCodeScreen onSubmit={vi.fn()} onExit={vi.fn()} />);
      const timer = screen.getByTestId("verification-code-screen-timer");

      // 1초짜리 타이머를 한 회차씩 새로 걸므로(다 센 뒤 깨우지 않으려고) 1초씩 흘린다.
      for (let tick = 0; tick < 3; tick += 1) {
        act(() => {
          vi.advanceTimersByTime(1000);
        });
      }
      expect(timer).toHaveTextContent("04:57");

      fireEvent.tap(
        within(screen.getByTestId("verification-code-screen-resend")).getByTestId("ui-lynx-button"),
        {},
      );
      expect(screen.getByTestId("verification-code-screen-timer")).toHaveTextContent("05:00");

      for (let tick = 0; tick < verificationCodeValidSeconds; tick += 1) {
        act(() => {
          vi.advanceTimersByTime(1000);
        });
      }
      expect(screen.getByTestId("verification-code-screen-timer")).toHaveTextContent("00:00");

      // 다 센 뒤에는 타이머를 걸지 않는다 — 더 흘려도 바뀌지 않고 대기 중인 타이머도 없다.
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(screen.getByTestId("verification-code-screen-timer")).toHaveTextContent("00:00");
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("[VC-U9] Resend를 누르면 입력한 코드가 지워지고, 그대로 Continue를 눌러도 제출되지 않는다", () => {
    const onSubmit = vi.fn();
    render(<VerificationCodeScreen onSubmit={onSubmit} onExit={vi.fn()} />);

    typeCode("1234");
    expect(screen.getByTestId("verification-code-screen-submit")).toHaveAttribute(
      "data-complete",
      "true",
    );

    fireEvent.tap(
      within(screen.getByTestId("verification-code-screen-resend")).getByTestId("ui-lynx-button"),
      {},
    );

    // 재전송한 코드는 아직 아무것도 입력되지 않은 상태다. 이전 코드가 남아 있으면
    // 사용자가 아무것도 치지 않고 Continue를 눌러 옛 코드를 제출하게 된다.
    expect(screen.getByTestId("verification-code-screen-submit")).toHaveAttribute(
      "data-complete",
      "false",
    );
    fireEvent.tap(submitButton(), {});
    expect(onSubmit).not.toHaveBeenCalled();

    // 지운 뒤에도 새 코드를 받는다.
    typeCode("5678");
    expect(screen.getByTestId("verification-code-screen-submit")).toHaveAttribute(
      "data-complete",
      "true",
    );
    fireEvent.tap(submitButton(), {});
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
