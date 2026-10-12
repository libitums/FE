import type { ReactNode } from "@lynx-js/react";

import play from "@libitums/icons/lynx/play";
import { color } from "@libitums/design-tokens";

import { useUiCopy } from "../lib/ui-copy";
import type { AudioUnavailableControlProps } from "./audio-unavailable.contract";

import "./audio-unavailable-control.css";

// 오디오가 아직 없는 문항의 눌리지 않는 재생 조작입니다.
//
// 영구히 눌리지 않는 버튼을 두지 않는다는 원칙(ADR-0016 D10)의 의도된 예외입니다 — 대본을
// 늘 보여 주고 「재생이 있어야 할 자리」를 비워 두지 않되, 소리가 없다는 사실을 꺼진 단추로
// 말합니다. 그래서 `bindtap`이 없고, 상태는 색이 아니라 `traits`와 `data-state`가 전합니다.
export function AudioUnavailableControl({ testId }: AudioUnavailableControlProps): ReactNode {
  const copy = useUiCopy();

  return (
    <view
      className="audio-unavailable-control"
      data-testid={testId}
      data-state="unavailable"
      accessibility-element={true}
      accessibility-traits="disabled"
      accessibility-label={copy.audioUnavailable.label}
    >
      {/* 이름은 감싼 상자가 지므로 아이콘에는 접근성 속성을 붙이지 않습니다(ADR-0016 D5). */}
      <svg
        className="audio-unavailable-control-icon"
        content={play}
        current-color={color.fg.neutral}
      />
    </view>
  );
}
