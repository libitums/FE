import type { ReactNode } from "@lynx-js/react";

import { color } from "@libitums/design-tokens";
import tick from "@libitums/icons/lynx/tick";

import "./chat-overlays.css";

export type CheckRowProps = {
  readonly testId: string;
  readonly label: string;
  readonly checked: boolean;
  /** 체크 상태를 담은 낭독 문장(「…, checked」). */
  readonly spoken: string;
  readonly onToggle: () => void;
};

// 줄 전체가 체크 터치입니다(신고 시트 · 👎 시트). 체크 상태는 data-checked(시각)와 낭독 문장 둘 다에 싣습니다.
export function CheckRow({ testId, label, checked, spoken, onToggle }: CheckRowProps): ReactNode {
  const handleTap = () => {
    "background only";
    onToggle();
  };
  return (
    <view
      className="chat-check-row"
      data-testid={testId}
      data-checked={checked ? "true" : "false"}
      flatten={false}
      accessibility-element={true}
      accessibility-label={spoken}
      accessibility-traits="button"
      accessibility-role-description="checkbox"
      accessibility-enable-tap={true}
      bindtap={handleTap}
    >
      <view
        className={`chat-check-box${checked ? " chat-check-box-on" : ""}`}
        accessibility-elements-hidden={true}
      >
        {checked ? (
          <svg className="chat-check-icon" content={tick} current-color={color.white} />
        ) : null}
      </view>
      <text className="chat-check-label" accessibility-elements-hidden={true}>
        {label}
      </text>
    </view>
  );
}
