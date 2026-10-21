import type { ReactNode } from "@lynx-js/react";

import type { ListenAudioControl } from "./use-listen-audio";

export type ItemListenControlsProps = {
  readonly control: ListenAudioControl;
  readonly testId: string;
};

// 문항 곁에 얹는 간이 줄(다시 듣기 · 「천천히」)입니다.
export function ItemListenControls({ control, testId }: ItemListenControlsProps): ReactNode {
  return (
    <view data-testid={testId}>
      <view data-testid={`${testId}-again`} bindtap={control.replay} />
    </view>
  );
}
