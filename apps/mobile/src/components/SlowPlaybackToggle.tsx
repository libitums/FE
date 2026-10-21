import type { ReactNode } from "@lynx-js/react";

import type { ListenPace } from "../lib/listen-pace";

export type SlowPlaybackToggleProps = {
  readonly pace: ListenPace;
  readonly onToggle: () => void;
  readonly testId: string;
};

// 「천천히」 토글입니다. 부모가 호스트 지원이 확인됐을 때만 렌더합니다.
export function SlowPlaybackToggle({ pace, onToggle, testId }: SlowPlaybackToggleProps): ReactNode {
  return (
    <view
      data-testid={testId}
      data-state={pace === "slow" ? "on" : "off"}
      accessibility-element={true}
      accessibility-traits="button"
      bindtap={onToggle}
    />
  );
}
