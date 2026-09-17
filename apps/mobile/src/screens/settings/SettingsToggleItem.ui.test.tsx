import { expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { SettingsToggleItem } from "./SettingsToggleItem";
import {
  sessionOptionAccessibilityLabel,
  sessionOptionKeys,
  sessionOptionLabel,
  sessionOptionStateLabel,
} from "../../lib/session-options";

// `ui` 계층: 실제 컴포넌트를 렌더하고 상태·상호작용을 검증한다(ADR-0006 D4).
// 기대값은 `sessionOptionLabel` · `sessionOptionStateLabel` · `sessionOptionAccessibilityLabel`의
// 결과로 비교한다 — 문구 리터럴을 이 파일이 다시 짓지 않는다(test-plan.md 「ui」 서문).
// `toBeChecked` · `toBeVisible` · `toHaveStyle` · `toHaveClass`를 쓰지 않는다
// (`docs/conventions/code.md` 「jest-dom 매처는 절반만 쓴다」). 토글 상태 판정은
// `accessibility-label` 접미사로만 한다(ADR-0016) — `accessibility-value`를 쓰지 않는다.
//
// 계약: .agent-harness/work/lib-259/spec.md §2.7 · §4.3 · §4.8.
// 계획: .agent-harness/work/lib-259/test-plan.md ui § `SettingsToggleItem.ui.test.tsx` TG1~TG8.

const KEY = sessionOptionKeys[0]!; // "auto-play-audio"

// TG1: value=true — data-checked="true" · accessibility-label = "<라벨>, 켜짐" ·
// 상태 텍스트 = "켜짐".
test("[TG1] value=true: data-checked='true' · accessibility-label · 상태 텍스트가 켜짐이다", () => {
  render(<SettingsToggleItem optionKey={KEY} value={true} onToggle={vi.fn()} />);

  const root = screen.getByTestId(`settings-toggle-item-${KEY}`);
  expect(root).toHaveAttribute("data-checked", "true");
  expect(root).toHaveAttribute("accessibility-label", sessionOptionAccessibilityLabel(KEY, true));
  expect(screen.getByTestId(`settings-toggle-item-state-${KEY}`)).toHaveTextContent(
    sessionOptionStateLabel(true),
  );
});

// TG2: value=false — 세 채널 전부가 value=true와 갈린다(spec §4.3).
test("[TG2] value=false: data-checked='false' · accessibility-label · 상태 텍스트가 꺼짐이고, 세 채널이 모두 value=true와 갈린다", () => {
  const { unmount } = render(
    <SettingsToggleItem optionKey={KEY} value={true} onToggle={vi.fn()} />,
  );
  const checkedWhenOn = screen
    .getByTestId(`settings-toggle-item-${KEY}`)
    .getAttribute("data-checked");
  const labelWhenOn = screen
    .getByTestId(`settings-toggle-item-${KEY}`)
    .getAttribute("accessibility-label");
  const stateTextWhenOn = screen.getByTestId(`settings-toggle-item-state-${KEY}`).textContent;
  unmount();

  render(<SettingsToggleItem optionKey={KEY} value={false} onToggle={vi.fn()} />);

  const root = screen.getByTestId(`settings-toggle-item-${KEY}`);
  expect(root).toHaveAttribute("data-checked", "false");
  expect(root).toHaveAttribute("accessibility-label", sessionOptionAccessibilityLabel(KEY, false));
  const stateText = screen.getByTestId(`settings-toggle-item-state-${KEY}`);
  expect(stateText).toHaveTextContent(sessionOptionStateLabel(false));

  expect(root.getAttribute("data-checked")).not.toBe(checkedWhenOn);
  expect(root.getAttribute("accessibility-label")).not.toBe(labelWhenOn);
  expect(stateText.textContent).not.toBe(stateTextWhenOn);
});

// TG3: 키 둘 각각 — 라벨 텍스트 = sessionOptionLabel(key).
test.each(sessionOptionKeys)(
  "[TG3] settings-toggle-item-label-%s 텍스트가 sessionOptionLabel(key)와 같다",
  (key) => {
    render(<SettingsToggleItem optionKey={key} value={true} onToggle={vi.fn()} />);

    expect(screen.getByTestId(`settings-toggle-item-label-${key}`)).toHaveTextContent(
      sessionOptionLabel(key),
    );
  },
);

// TG4: 루트 tap → onToggle 정확히 1회 · 인자가 optionKey. value가 true·false 둘 다.
test.each([true, false])(
  "[TG4] value=%s에서 루트 tap → onToggle 1회 · 인자가 optionKey다",
  (value) => {
    const onToggle = vi.fn();
    render(<SettingsToggleItem optionKey={KEY} value={value} onToggle={onToggle} />);

    fireEvent.tap(screen.getByTestId(`settings-toggle-item-${KEY}`), {});

    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledWith(KEY);
  },
);

// TG5: 조작 단위가 루트 하나다 — [accessibility-element]·[accessibility-traits="button"]
// 목록이 각각 settings-toggle-item-<key> 하나.
test("[TG5] 트리의 조작 단위가 루트 settings-toggle-item-<key> 하나다", () => {
  const { container } = render(
    <SettingsToggleItem optionKey={KEY} value={true} onToggle={vi.fn()} />,
  );

  expect(
    [...container.querySelectorAll("[accessibility-element]")].map((el) =>
      el.getAttribute("data-testid"),
    ),
  ).toEqual([`settings-toggle-item-${KEY}`]);
  expect(
    [...container.querySelectorAll('[accessibility-traits="button"]')].map((el) =>
      el.getAttribute("data-testid"),
    ),
  ).toEqual([`settings-toggle-item-${KEY}`]);
});

// TG6 (가드): 두 값 어디에도 accessibility-value · disabled가 없고, accessibility-traits에
// selected · adjustable이 0건이다(spec §2.7의 버린 값들).
test.each([true, false])(
  "[TG6] value=%s에서 accessibility-value·disabled·selected·adjustable이 0건이다",
  (value) => {
    const { container } = render(
      <SettingsToggleItem optionKey={KEY} value={value} onToggle={vi.fn()} />,
    );

    expect(container.querySelectorAll("[accessibility-value]")).toHaveLength(0);
    expect(container.querySelectorAll("[disabled]")).toHaveLength(0);
    expect(container.querySelectorAll('[accessibility-traits="selected"]')).toHaveLength(0);
    expect(container.querySelectorAll('[accessibility-traits="adjustable"]')).toHaveLength(0);
  },
);

// TG7 (가드): 두 값에서 트리의 class 속성 목록이 한 글자도 갈리지 않는다 —
// 예약 상태어(ADR-0003 D7)를 늘리지 않았다는 자동 판정(ListeningPrompt.ui의 같은 형태).
test("[TG7] 두 값에서 class 속성 목록이 한 글자도 갈리지 않는다", () => {
  const { container: onContainer } = render(
    <SettingsToggleItem optionKey={KEY} value={true} onToggle={vi.fn()} />,
  );
  const classesWhenOn = [...onContainer.querySelectorAll("[class]")].map((el) =>
    el.getAttribute("class"),
  );

  const { container: offContainer } = render(
    <SettingsToggleItem optionKey={KEY} value={false} onToggle={vi.fn()} />,
  );
  const classesWhenOff = [...offContainer.querySelectorAll("[class]")].map((el) =>
    el.getAttribute("class"),
  );

  expect(classesWhenOff).toEqual(classesWhenOn);
});

// TG8: 표식 묶음이 가림을 진다 — 상태 낱말의 parentElement에
// accessibility-elements-hidden="true"가 붙고, 라벨 <text>에는 붙지 않는다
// (ADR-0016 D5). 값은 두 상태 모두 "true"다.
test.each([true, false])(
  "[TG8] value=%s에서 상태 낱말의 parentElement가 accessibility-elements-hidden='true'이고 라벨에는 없다",
  (value) => {
    render(<SettingsToggleItem optionKey={KEY} value={value} onToggle={vi.fn()} />);

    const stateText = screen.getByTestId(`settings-toggle-item-state-${KEY}`);
    const mark = stateText.parentElement;
    expect(mark).not.toBeNull();
    expect(mark).toHaveAttribute("accessibility-elements-hidden", "true");

    const label = screen.getByTestId(`settings-toggle-item-label-${KEY}`);
    expect(label).not.toHaveAttribute("accessibility-elements-hidden");
  },
);
