import type { ReactNode } from "@lynx-js/react";

import pause from "@libitums/icons/lynx/pause";
import play from "@libitums/icons/lynx/play";
import refresh from "@libitums/icons/lynx/refresh";
import { color } from "@libitums/design-tokens";

import { playbackActionFor } from "../lib/listen-playback";
import type { ListeningPlaybackAction } from "../lib/listen-playback";
import { useUiCopy } from "../lib/ui-copy";
import { SlowPlaybackToggle } from "./SlowPlaybackToggle";
import type { ListenAudioControl } from "./use-listen-audio";

import "./listen-playback-controls.css";

export type ListenPlaybackControlsProps = {
  readonly control: ListenAudioControl;
  readonly testIdPrefix: string;
};

// 아이콘 모양이 색과 독립인 채널입니다(WCAG 1.4.1). 이름은 감싼 상자가 지고 아이콘에는 접근성 속성을 붙이지
// 않습니다(ADR-0016 D5). 일시정지(❚❚)는 「누르면 이어서 재생된다」는 약속이 참일 때만 씁니다.
const playbackIconByAction: Record<ListeningPlaybackAction, string> = {
  pause,
  resume: play,
  play,
};

/**
 * 듣기 3열 줄입니다 — 다시 듣기 · 재생/일시정지 · 「천천히」. 루트 testid 없이 줄만 그립니다(듣기 제시 컴포넌트가
 * 쓰는 모양). DOM 순서 = 읽는 순서입니다.
 *
 * 재생 버튼은 늘 줄 한가운데입니다. 속도 재생을 지원하면 양쪽 슬롯이 같은 폭(`flex: 1 1 0`)이라 토글이 켜져
 * 넓어져도 재생 원이 움직이지 않고, 지원하지 않으면 다시 듣기와 같은 폭의 빈 칸이 마주 봅니다.
 * 언제나 렌더됩니다 — 모듈이 없다고 숨기거나 `disabled`를 두지 않습니다(ADR-0016 D10).
 */
export function ListenPlaybackRow({
  control,
  testIdPrefix,
}: ListenPlaybackControlsProps): ReactNode {
  const copy = useUiCopy();
  const action = playbackActionFor(control.playback);
  const supported = control.slowPlayback === "supported";

  const replay = (
    <view
      className="listening-prompt-replay"
      data-testid={`${testIdPrefix}-replay`}
      accessibility-element={true}
      accessibility-label={copy.listening.playFromStart}
      accessibility-traits="button"
      bindtap={control.replay}
    >
      <svg
        className="listening-prompt-replay-icon"
        data-testid={`${testIdPrefix}-replay-icon`}
        content={refresh}
        current-color={color.fg.neutral}
      />
    </view>
  );

  return (
    <view className="listening-prompt-controls">
      {supported ? <view className="listening-prompt-controls-start">{replay}</view> : replay}
      <view
        className="listening-prompt-playback"
        data-testid={`${testIdPrefix}-playback`}
        accessibility-element={true}
        accessibility-label={copy.listening.playback[action]}
        accessibility-traits="button"
        bindtap={control.toggle}
      >
        <svg
          className="listening-prompt-playback-icon"
          data-testid={`${testIdPrefix}-playback-icon`}
          content={playbackIconByAction[action]}
          current-color={color.fg.neutral}
        />
      </view>
      {supported ? (
        <view className="listening-prompt-controls-end">
          <SlowPlaybackToggle
            pace={control.pace}
            onToggle={control.togglePace}
            testId={`${testIdPrefix}-slow`}
          />
        </view>
      ) : (
        <view className="listening-prompt-controls-spacer" />
      )}
    </view>
  );
}

/** 듣기 3열을 루트 testid(`testIdPrefix`)로 감싼 줄입니다. */
export function ListenPlaybackControls(props: ListenPlaybackControlsProps): ReactNode {
  return (
    <view data-testid={props.testIdPrefix}>
      <ListenPlaybackRow {...props} />
    </view>
  );
}

export type ListenControlPartProps = {
  readonly control: ListenAudioControl;
  readonly testId: string;
};

function ReplayPart({ testId }: ListenControlPartProps): ReactNode {
  return <view data-testid={testId} />;
}

function PlaybackPart({ testId }: ListenControlPartProps): ReactNode {
  return <view data-testid={testId} />;
}

function SlowPart({ testId }: ListenControlPartProps): ReactNode {
  return <view data-testid={testId} />;
}

/** 듣기 조작 부품입니다(다시 듣기 · 재생 · 천천히). 껍데기만 있는 단계입니다 — 아직 그리지 않습니다. */
export const ListenControls = { Replay: ReplayPart, Playback: PlaybackPart, Slow: SlowPart };
