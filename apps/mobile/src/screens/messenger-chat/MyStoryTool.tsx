import type { ReactNode } from "@lynx-js/react";

import { playSound } from "../../lib/sound-effects";

/** 편집 오른쪽 도구 열의 단추 하나(Aa · Words) — 둥근 그림 + 이름. */
export function MyStoryTool({
  testId,
  label,
  onTap,
  children,
}: {
  readonly testId: string;
  readonly label: string;
  readonly onTap: () => void;
  readonly children: ReactNode;
}): ReactNode {
  return (
    <view
      className="my-story-tool"
      data-testid={testId}
      accessibility-element={true}
      accessibility-label={label}
      accessibility-traits="button"
      accessibility-enable-tap={true}
      flatten={false}
      bindtap={() => {
        "background only";
        playSound("button");
        onTap();
      }}
    >
      <view className="my-story-tool-icon" accessibility-elements-hidden={true}>
        {children}
      </view>
      <text className="my-story-tool-text" accessibility-elements-hidden={true}>
        {label}
      </text>
    </view>
  );
}
