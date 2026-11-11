import type { ReactNode } from "@lynx-js/react";

import { color } from "@libitums/design-tokens";

import { SLOP_ROUND } from "./hit-slop";

import "./chat-settings.css";

// 기억 줄의 고치기 · 지우기 아이콘 단추입니다(ADR-0126). Android 접근성 트리에 남도록 flatten={false}.
type MemoryIconButtonProps = {
  readonly testId: string;
  readonly label: string;
  readonly icon: string;
  readonly onTap: () => void;
};

export function MemoryIconButton({ testId, label, icon, onTap }: MemoryIconButtonProps): ReactNode {
  return (
    <view
      className="chat-memory-icon-button"
      data-testid={testId}
      flatten={false}
      accessibility-element={true}
      accessibility-traits="button"
      accessibility-label={label}
      accessibility-enable-tap={true}
      hit-slop={SLOP_ROUND}
      bindtap={() => {
        "background only";
        onTap();
      }}
    >
      <svg
        className="chat-memory-icon"
        content={icon}
        current-color={color.fg["neutral-muted"]}
        accessibility-element={false}
      />
    </view>
  );
}
