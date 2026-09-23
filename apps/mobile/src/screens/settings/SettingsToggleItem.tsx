import type { ReactNode } from "@lynx-js/react";

import toggleOn from "@libitums/icons/lynx/toggle-on";
import toggleOff from "@libitums/icons/lynx/toggle-off";
import { color } from "@libitums/design-tokens";

import type { SettingsToggleItemProps } from "./settings.contract";
import {
  sessionOptionAccessibilityLabel,
  sessionOptionLabel,
  sessionOptionStateLabel,
} from "../../lib/session-options";

import "./settings-toggle-item.css";

// 루트 하나가 조작 단위이고, 상태는 `data-checked` · `accessibility-label` 접미사 ·
// 보이는 낱말 셋으로만 나갑니다 — `accessibility-value`를 쓰지 않습니다(ADR-0016 D3).
// CSS 선언은 두 상태에서 한 글자도 갈리지 않습니다(상태 클래스 0개).
//
// 두 상태는 같은 상자에서 노브의 좌우만 다른 한 쌍이고, 색은 두 상태가 같은
// 상수입니다(색은 채널이 아닙니다 — WCAG 1.4.1).

export function SettingsToggleItem({
  optionKey,
  value,
  onToggle,
}: SettingsToggleItemProps): ReactNode {
  return (
    <view
      className="settings-toggle-item"
      data-testid={`settings-toggle-item-${optionKey}`}
      accessibility-element={true}
      accessibility-traits="button"
      accessibility-label={sessionOptionAccessibilityLabel(optionKey, value)}
      data-checked={value ? "true" : "false"}
      bindtap={() => onToggle(optionKey)}
    >
      {/* 보이는 이름을 지므로 가리지 않습니다(ADR-0016 D5). */}
      <text
        className="settings-toggle-item-label"
        data-testid={`settings-toggle-item-label-${optionKey}`}
      >
        {sessionOptionLabel(optionKey)}
      </text>
      {/* 표식 묶음 — 가릴 접근성 자손(상태 낱말)을 실제로 갖습니다. 값은 두 상태
          어디에서도 조건부로 빠지지 않고 언제나 `true`입니다. */}
      <view className="settings-toggle-item-mark" accessibility-elements-hidden={true}>
        <svg
          className="settings-toggle-item-mark-icon"
          content={value ? toggleOn : toggleOff}
          current-color={color.fg["neutral-muted"]}
        />
        <text
          className="settings-toggle-item-mark-label"
          data-testid={`settings-toggle-item-state-${optionKey}`}
        >
          {sessionOptionStateLabel(value)}
        </text>
      </view>
    </view>
  );
}
