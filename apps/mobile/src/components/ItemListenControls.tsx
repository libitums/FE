import type { ReactNode } from "@lynx-js/react";

import pause from "@libitums/icons/lynx/pause";
import volume from "@libitums/icons/lynx/volume";
import { RoundButton } from "@libitums/ui-lynx/round-button";

import { stopAudio } from "../lib/audio";
import { useUiCopy } from "../lib/ui-copy";
import { SlowPlaybackToggle } from "./SlowPlaybackToggle";
import type { ListenAudioControl } from "./use-listen-audio";

import "./item-listen-controls.css";

export type ItemListenControlsProps = {
  readonly control: ListenAudioControl;
  readonly testId: string;
};

/**
 * 문항 곁에 얹는 간이 줄(다시 듣기 · 「천천히」)입니다. 누르면 처음부터 다시 들려 주고, 재생 중에는 같은 단추가 멈춤이 됩니다(WCAG 1.4.2). 양쪽 슬롯이 같은 폭이라 보통 글자 크기에서는 토글이 켜져 넓어져도 다시
 * 듣기 단추가 움직이지 않고(접근성 큰 글자에서 토글이 칸보다 넓어지면 밀립니다 — ADR-0082 「대가」), 토글이 없어도(속도 재생
 * 미지원) 슬롯 폭을 지킵니다.
 *
 * 다시 듣기의 이름 · 탭은 안쪽 `RoundButton`이 집니다(스크린 리더가 읽는 요소와 같음). 감싼 상자는 testid만
 * 가집니다.
 */
export function ItemListenControls({ control, testId }: ItemListenControlsProps): ReactNode {
  const copy = useUiCopy();
  const playing = control.playback === "playing";
  const stop = (): void => {
    "background only";
    stopAudio();
    control.markStopped?.();
  };
  return (
    <view className="item-listen-controls" data-testid={testId}>
      <view className="item-listen-controls-start">
        <view data-testid={`${testId}-again`}>
          <RoundButton
            accessibilityLabel={playing ? copy.listening.stop : copy.listening.playAgain}
            icon={playing ? pause : volume}
            variant="neutral"
            size="l"
            bindtap={playing ? stop : control.replay}
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
