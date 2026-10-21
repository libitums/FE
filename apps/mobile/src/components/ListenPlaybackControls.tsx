import type { ReactNode } from "@lynx-js/react";

import type { ListenAudioControl } from "./use-listen-audio";

export type ListenPlaybackControlsProps = {
  readonly control: ListenAudioControl;
  readonly testIdPrefix: string;
};

// 듣기 3열(다시 듣기 · 재생/일시정지 · 「천천히」)입니다.
export function ListenPlaybackControls({
  control,
  testIdPrefix,
}: ListenPlaybackControlsProps): ReactNode {
  return (
    <view data-testid={testIdPrefix}>
      <view data-testid={`${testIdPrefix}-replay`} bindtap={control.replay} />
      <view data-testid={`${testIdPrefix}-playback`} bindtap={control.toggle} />
    </view>
  );
}
