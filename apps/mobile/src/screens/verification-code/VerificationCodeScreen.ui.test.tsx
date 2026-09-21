import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { VerificationCodeScreen } from "./VerificationCodeScreen";

// `ui` 계층: 실제 컴포넌트를 렌더하고 입력 정규화·완성 판정·오류 채널·나가기를 본다
// (ADR-0006 D4). 완성 판정은 `isVerificationCodeComplete`의 결과를 화면이 그리기만 한다
// (계약 §2.5) — 이 파일은 그 로직을 다시 적지 않는다. `default-value`는 실기에서 일회성
// 채널이라(§0.10 (6)) 이 파일은 그 속성을 더 이상 단언하지 않는다 — VC-U2 참고.
//
// 계약: .agent-harness/work/lib-261/spec.md §0.3 D-c(TextField 하나) · §2.5(순수 로직) ·
//       §4.2~§4.5(구조·상태 채널·testid) · §4.3(확인의 data-complete, disabled trait을
//       붙이지 않는다) · §0.10 (2)(C-1 — 오류 채널) · §2.6(오류 supporting) · §8(오류 문구).
// 계획: .agent-harness/work/lib-261/test-plan.md ui § `VerificationCodeScreen.ui.test.tsx`
//       VC-U1~VC-U8(VC-U2는 술어 교체, VC-U7·VC-U8은 보정 r0.3 신설 — m-1·C-1).
//
// 입력 이벤트는 CompactNumericInput.ui.test.tsx 선례와 같은 형태로 쏜다.

function dispatchTextFieldInput(anchor: HTMLElement, value: string) {
  const EventConstructor = anchor.ownerDocument.defaultView?.CustomEvent;
  if (!EventConstructor) throw new Error("CustomEvent is unavailable");
  const ref = lynx.createSelectorQuery().select('[data-testid="ui-lynx-text-field-input"]');
  fireEvent(
    ref as unknown as Element,
    new EventConstructor("bindEvent:input", { detail: { value } }),
  );
}

function typeCode(value: string) {
  const field = screen.getByTestId("verification-code-screen-input");
  const input = within(field).getByTestId("ui-lynx-text-field-input");
  dispatchTextFieldInput(input, value);
}

describe("VerificationCodeScreen (LIB-261)", () => {
  // VC-U1 — n-3(보정 r0.3): 스크롤 상자에 accessibility-*가 0건임을 얹는다(SP1과 같은 형태).
  it("[VC-U1] 안내문·입력 칸·확인·나가기가 선다", () => {
    render(<VerificationCodeScreen onSubmit={vi.fn()} onExit={vi.fn()} />);

    expect(screen.getByTestId("verification-code-screen-description")).toBeInTheDocument();
    expect(screen.getByTestId("verification-code-screen-input")).toBeInTheDocument();
    expect(screen.getByTestId("verification-code-screen-submit")).toBeInTheDocument();
    expect(screen.getByTestId("verification-code-screen-exit")).toBeInTheDocument();

    const scroll = screen.getByTestId("verification-code-screen-scroll");
    const accessibilityAttrs = Array.from(scroll.attributes).filter((attr) =>
      attr.name.startsWith("accessibility-"),
    );
    expect(accessibilityAttrs).toHaveLength(0);
  });

  // VC-U2 ⚠ 술어 교체 r0.3(계약 §0.10 (2)). 옛 술어(`default-value` 속성 대조)는 실기에서
  // 무시되는 채널이라 버렸다 — `default-value`는 네이티브에서 일회성이라(§2.6) 첫 렌더 뒤
  // 갱신이 반영되지 않는다. 새 술어는 오류 채널(C-1 갈래 (b))을 본다: 어긋난 입력(`1*23`,
  // 칸은 찼는데 완성이 아니다)에서 입력 칸의 accessibility-label이 "오류: "를 포함하고,
  // `확인`이 data-complete="false"이며 눌러도 onSubmit이 0회다.
  it("[VC-U2] 어긋난 입력(1*23)에서 오류 채널이 선다", () => {
    const onSubmit = vi.fn();
    render(<VerificationCodeScreen onSubmit={onSubmit} onExit={vi.fn()} />);

    typeCode("1*23");

    const field = screen.getByTestId("verification-code-screen-input");
    const input = within(field).getByTestId("ui-lynx-text-field-input");
    expect(input.getAttribute("accessibility-label")).toContain("오류: ");

    const submit = screen.getByTestId("verification-code-screen-submit");
    expect(submit).toHaveAttribute("data-complete", "false");

    fireEvent.tap(submit, {});
    expect(onSubmit).not.toHaveBeenCalled();
  });

  // VC-U3
  it("[VC-U3] 4자리 전에는 확인이 data-complete='false'이고 눌러도 onSubmit이 0회다", () => {
    const onSubmit = vi.fn();
    render(<VerificationCodeScreen onSubmit={onSubmit} onExit={vi.fn()} />);

    typeCode("123");
    const submit = screen.getByTestId("verification-code-screen-submit");
    expect(submit).toHaveAttribute("data-complete", "false");

    fireEvent.tap(submit, {});
    expect(onSubmit).not.toHaveBeenCalled();
  });

  // VC-U4
  it("[VC-U4] 4자리를 채우면 data-complete='true'이고 누르면 onSubmit이 1회다", () => {
    const onSubmit = vi.fn();
    render(<VerificationCodeScreen onSubmit={onSubmit} onExit={vi.fn()} />);

    typeCode("1234");
    const submit = screen.getByTestId("verification-code-screen-submit");
    expect(submit).toHaveAttribute("data-complete", "true");

    fireEvent.tap(submit, {});
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  // VC-U5
  it("[VC-U5] 나가기의 보이는 낱말과 accessibility-label이 둘 다 '로그인으로'이고 누르면 onExit 1회다", () => {
    const onExit = vi.fn();
    render(<VerificationCodeScreen onSubmit={vi.fn()} onExit={onExit} />);

    const exit = screen.getByTestId("verification-code-screen-exit");
    expect(exit).toHaveTextContent("로그인으로");
    expect(exit).toHaveAttribute("accessibility-label", "로그인으로");

    fireEvent.tap(exit, {});
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  // VC-U6 — 후반부는 부재 단언(확인에 disabled가 붙지 않는다)이다. `확인`이 없으면
  // 참이 될 수 있으므로 먼저 그 존재를 앵커로 건다(getByTestId는 없으면 던진다).
  it("[VC-U6] 제목이 header이고, 확인에 accessibility-traits='disabled'가 붙지 않는다", () => {
    render(<VerificationCodeScreen onSubmit={vi.fn()} onExit={vi.fn()} />);

    expect(screen.getByTestId("verification-code-screen-title")).toHaveAttribute(
      "accessibility-traits",
      "header",
    );

    const submit = screen.getByTestId("verification-code-screen-submit");
    expect(submit).toBeInTheDocument();
    expect(submit).not.toHaveAttribute("accessibility-traits", "disabled");
  });

  // VC-U7 — 신설 r0.3(m-1) — 녹색 가드. LG-U5 둘째 단언과 같은 형태: 조작 단위 목록을
  // §4.4의 정의(accessibility-element="true" + traits="button")로 재 닫힌 집합으로 걸고,
  // 코드 입력 칸은 접근성 요소이지만 traits="button"이 아니라 그 목록에서 빠짐을 둘째
  // 단언으로 남겨 미래의 opt-out 회귀를 잡는다. 값 없는 [accessibility-element]는 쓰지
  // 않는다(TextField 라벨 <text>가 accessibility-element={false}를 붙여 매치되는 함정).
  it("[VC-U7] 조작 단위가 나가기·확인 둘뿐이고 코드 입력 칸은 접근성 트리에 남는다", () => {
    const { container } = render(<VerificationCodeScreen onSubmit={vi.fn()} onExit={vi.fn()} />);

    const actionUnits = [
      ...container.querySelectorAll(
        '[accessibility-element="true"][accessibility-traits="button"]',
      ),
    ].map((el) => el.getAttribute("data-testid"));
    expect(actionUnits).toEqual([
      "verification-code-screen-exit",
      "verification-code-screen-submit",
    ]);

    const codeInput = screen.getByTestId("ui-lynx-text-field-input");
    expect(codeInput).toHaveAttribute("accessibility-element", "true");
    expect(actionUnits).not.toContain("ui-lynx-text-field-input");
  });

  // VC-U8 — 신설 r0.3. 「어긋남이 풀리면 오류가 사라진다」는 부재 단언이다 — 존재 앵커
  // (오류가 실제로 섰다)를 먼저 걸지 않으면 오늘도 공허하게 통과한다(오류가 애초에
  // 없으므로). `1*23`에서 오류가 선 것을 먼저 확인한 뒤, 지워서 `1234`가 되면 오류가
  // 사라지고 data-complete가 true로 간다.
  it("[VC-U8] 어긋남이 풀리면 오류가 사라진다", () => {
    render(<VerificationCodeScreen onSubmit={vi.fn()} onExit={vi.fn()} />);

    const field = screen.getByTestId("verification-code-screen-input");
    const input = within(field).getByTestId("ui-lynx-text-field-input");
    const submit = screen.getByTestId("verification-code-screen-submit");

    typeCode("1*23");
    // 존재 앵커 — 오류가 실제로 섰음을 먼저 확인한다.
    expect(input.getAttribute("accessibility-label")).toContain("오류: ");

    typeCode("1234");
    expect(input.getAttribute("accessibility-label")).not.toContain("오류: ");
    expect(submit).toHaveAttribute("data-complete", "true");
  });
});
