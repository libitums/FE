import type { ReactNode } from "@lynx-js/react";

import volume from "@libitums/icons/lynx/volume";
import { RoundButton } from "@libitums/ui-lynx/round-button";

import { useUiCopy } from "../lib/ui-copy";
import { SlowPlaybackToggle } from "./SlowPlaybackToggle";
import type { ListenAudioControl } from "./use-listen-audio";

import "./item-listen-controls.css";

export type ItemListenControlsProps = {
  readonly control: ListenAudioControl;
  readonly testId: string;
};

/**
 * 문항 곁에 얹는 간이 줄(다시 듣기 · 「천천히」)입니다. 일시정지는 없고 누르면 처음부터 다시 들려 줍니다. 재생
 * 중이라고 따로 표시하지 않습니다. 양쪽 슬롯이 같은 폭이라 토글이 켜져 넓어져도 다시 듣기 단추는 움직이지
 * 않고, 토글이 없어도(속도 재생 미지원) 슬롯 폭을 지킵니다.
 *
 * 다시 듣기의 이름 · 탭은 안쪽 `RoundButton`이 집니다(스크린 리더가 읽는 요소와 같음). 감싼 상자는 testid만
 * 가집니다.
 */
export function ItemListenControls({ control, testId }: ItemListenControlsProps): ReactNode {
  const copy = useUiCopy();
  return (
    <view className="item-listen-controls" data-testid={testId}>
      <view className="item-listen-controls-start">
        <view data-testid={`${testId}-again`}>
          <RoundButton
            accessibilityLabel={copy.listening.playAgain}
            icon={volume}
            variant="neutral"
            size="l"
            bindtap={control.replay}
          />
        </view>
      </view>
      <view className="item-listen-controls-end">
        {control.slowPlayback === "supported" ? (
          <SlowPlaybackToggle
            pace={control.pace}
            onToggle={control.togglePace}
            testId={`${testId}-slow`}
          />
        ) : null}
      </view>
    </view>
  );
}
