import { expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { SettingsNavItem } from "./SettingsNavItem";
import { settingsNavLabel, settingsNavTargets } from "./settings";

// `ui` 계층: 실제 컴포넌트를 렌더하고 상태·상호작용을 검증합니다(ADR-0006 D4).
// 라벨의 정본은 `settingsNavLabel`의 결과입니다 — 문구 리터럴을 이 파일이 다시 짓지
// 않습니다. `toHaveClass`·`toHaveStyle`·`toBeVisible`을 쓰지 않습니다
// (`docs/conventions/code.md`).

test.each(settingsNavTargets)(
  "[SN-I1] settings-nav-item-%s에 accessibility-element·traits·label이 붙는다",
  (target) => {
    render(<SettingsNavItem target={target} onSelect={vi.fn()} />);

    const root = screen.getByTestId(`settings-nav-item-${target}`);
    expect(root).toHaveAttribute("accessibility-element", "true");
    expect(root).toHaveAttribute("accessibility-traits", "button");
    expect(root).toHaveAttribute("accessibility-label", settingsNavLabel(target));
  },
);

// SN-I2 — 라벨 텍스트와 루트의 accessibility-label이 같은 문자열입니다. 둘이 갈리면
// 음성 제어가 화면에 보이는 이름으로 이 항목을 찾지 못합니다(WCAG 2.5.3).
test.each(settingsNavTargets)(
  "[SN-I2] settings-nav-item-label-%s 텍스트가 루트 accessibility-label과 같은 문자열이다",
  (target) => {
    render(<SettingsNavItem target={target} onSelect={vi.fn()} />);

    const label = screen.getByTestId(`settings-nav-item-label-${target}`);
    expect(label).toHaveTextContent(settingsNavLabel(target));

    const root = screen.getByTestId(`settings-nav-item-${target}`);
    expect(root.getAttribute("accessibility-label")).toBe(label.textContent);
  },
);

test.each(settingsNavTargets)(
  "[SN-I3] settings-nav-item-%s tap → onSelect 1회 · 인자가 %s",
  (target) => {
    const onSelect = vi.fn();
    render(<SettingsNavItem target={target} onSelect={onSelect} />);

    fireEvent.tap(screen.getByTestId(`settings-nav-item-${target}`), {});

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(target);
  },
);

// SN-I4 (가드) — 이동 항목에는 애초에 해당하지 않는 값들이라, 하나라도 붙으면 잘못
// 붙은 것입니다.
test.each(settingsNavTargets)(
  "[SN-I4] settings-nav-item-%s 트리에 accessibility-value·disabled·accessibility-elements-hidden이 0건이다",
  (target) => {
    const { container } = render(<SettingsNavItem target={target} onSelect={vi.fn()} />);

    expect(container.querySelectorAll("[accessibility-value]")).toHaveLength(0);
    expect(container.querySelectorAll("[disabled]")).toHaveLength(0);
    expect(container.querySelectorAll("[accessibility-elements-hidden]")).toHaveLength(0);
  },
);
