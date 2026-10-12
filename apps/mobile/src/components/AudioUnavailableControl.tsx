import type { ReactNode } from "@lynx-js/react";

import type { AudioUnavailableControlProps } from "./audio-unavailable.contract";

import "./audio-unavailable-control.css";

// 오디오가 아직 없는 문항의 눌리지 않는 재생 조작입니다.
export function AudioUnavailableControl({ testId }: AudioUnavailableControlProps): ReactNode {
  return <view className="audio-unavailable-control" data-testid={testId} />;
}
