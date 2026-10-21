import type { ReactNode } from "@lynx-js/react";

import tick from "@libitums/icons/lynx/tick";
import { color } from "@libitums/design-tokens";
import { useMotion } from "@libitums/ui-lynx/motion";

import { listenPaceAccessibilityLabel } from "../lib/listen-pace";
import type { ListenPace } from "../lib/listen-pace";
import { useUiCopy } from "../lib/ui-copy";

import "./slow-playback-toggle.css";

export type SlowPlaybackToggleProps = {
  readonly pace: ListenPace;
  readonly onToggle: () => void;
  readonly testId: string;
};

// 「천천히」 토글입니다. 부모가 호스트 지원이 확인됐을 때만 렌더합니다(없는 능력은 숨기고 꺼 두지 않습니다).
//
// 루트 하나가 접근성 요소이고 이름은 `Slow, on` / `Slow, off`입니다. 켜짐은 색 말고도 테두리와 앞의 체크
// 아이콘으로 구별됩니다(WCAG 1.4.1). 안의 글자 · 아이콘 · 막에는 접근성 속성을 붙이지 않습니다.
export function SlowPlaybackToggle({ pace, onToggle, testId }: SlowPlaybackToggleProps): ReactNode {
  const copy = useUiCopy();
  const motion = useMotion();
  const on = pace === "slow";
  const reduced = motion === "reduced";

  function handleTap(): void {
    "background only";
    onToggle();
  }

  return (
    <view
      className={`slow-playback-toggle${on ? " slow-playback-toggle-on" : ""}${
        reduced ? " slow-playback-toggle-reduced" : ""
      }`}
      data-testid={testId}
      data-state={on ? "on" : "off"}
      accessibility-element={true}
      accessibility-label={listenPaceAccessibilityLabel(pace, copy)}
      accessibility-traits="button"
      bindtap={handleTap}
    >
      {reduced ? <view className="slow-playback-toggle-shade" /> : null}
      {on ? (
        <svg className="slow-playback-toggle-icon" content={tick} current-color={color.fg.brand} />
      ) : null}
      <text className="slow-playback-toggle-label">{copy.listening.slow}</text>
    </view>
  );
}
