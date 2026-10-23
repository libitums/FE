import type { ReactNode } from "@lynx-js/react";

import pause from "@libitums/icons/lynx/pause";
import play from "@libitums/icons/lynx/play";
import refresh from "@libitums/icons/lynx/refresh";
import { RoundButton } from "@libitums/ui-lynx/round-button";

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

// 아이콘 모양이 색과 독립인 채널입니다(WCAG 1.4.1). 이름은 안쪽 `RoundButton`이 지고 아이콘에는 접근성 속성을
// 붙이지 않습니다(ADR-0016 D5). 일시정지(❚❚)는 「누르면 이어서 재생된다」는 약속이 참일 때만 씁니다.
const playbackIconByAction: Record<ListeningPlaybackAction, string> = {
  pause,
  resume: play,
  play,
};

export type ListenControlPartProps = {
  readonly control: ListenAudioControl;
  readonly testId: string;
};

export type ListenPlaybackPartProps = ListenControlPartProps & {
  /** 재생 단추의 색 갈래입니다. 기본은 neutral이고, 듣고 조립(S7) 머리만 brand를 씁니다. */
  readonly variant?: "neutral" | "brand";
};

// 바깥 상자는 testid만 갖고 이름 · 탭은 안쪽 `RoundButton`이 집니다(스크린 리더가 읽는 요소와 같음).
function ReplayPart({ control, testId }: ListenControlPartProps): ReactNode {
  const copy = useUiCopy();
  return (
    <view data-testid={testId}>
      <RoundButton
        accessibilityLabel={copy.listening.playFromStart}
        icon={refresh}
        variant="neutral"
        size="l"
        bindtap={control.replay}
      />
    </view>
  );
}

function PlaybackPart({
  control,
  testId,
  variant = "neutral",
}: ListenPlaybackPartProps): ReactNode {
  const copy = useUiCopy();
  const action = playbackActionFor(control.playback);
  return (
    <view data-testid={testId}>
      <RoundButton
        accessibilityLabel={copy.listening.playback[action]}
        icon={playbackIconByAction[action]}
        variant={variant}
        size="xl"
        bindtap={control.toggle}
      />
    </view>
  );
}

// 호스트가 속도 재생을 지원할 때만 서고, 지원하지 않으면 그리지 않습니다.
function SlowPart({ control, testId }: ListenControlPartProps): ReactNode {
  if (control.slowPlayback !== "supported") return null;
  return <SlowPlaybackToggle pace={control.pace} onToggle={control.togglePace} testId={testId} />;
}

/** 듣기 조작 부품입니다 — 다시 듣기(l) · 재생/일시정지(xl) · 「천천히」 토글. */
export const ListenControls = { Replay: ReplayPart, Playback: PlaybackPart, Slow: SlowPart };

/**
 * 듣기 3열 줄입니다 — 다시 듣기 · 재생/일시정지 · 「천천히」. 루트 testid 없이 줄만 그립니다(듣기 제시 컴포넌트가
 * 쓰는 모양). DOM 순서 = 읽는 순서입니다.
 *
 * 재생 버튼은 늘 줄 한가운데입니다. 속도 재생을 지원하면 양쪽 칸이 같은 폭(격자 `1fr`)이라 보통 글자 크기에서는
 * 토글이 켜져 넓어져도 재생 원이 움직이지 않고(큰 글자에서 토글이 칸보다 넓어지면 밀립니다 — ADR-0082 「대가」), 지원하지 않으면 다시 듣기와 같은 폭의 빈 칸이 마주 봅니다.
 * 언제나 렌더됩니다 — 모듈이 없다고 숨기거나 `disabled`를 두지 않습니다(ADR-0016 D10).
 */
export function ListenPlaybackRow({
  control,
  testIdPrefix,
}: ListenPlaybackControlsProps): ReactNode {
  const supported = control.slowPlayback === "supported";
  const replay = <ListenControls.Replay control={control} testId={`${testIdPrefix}-replay`} />;

  return (
    <view className="listening-prompt-controls">
      {supported ? (
        <view className="listening-prompt-controls-start">{replay}</view>
      ) : (
        <view className="listening-prompt-replay">{replay}</view>
      )}
      <ListenControls.Playback control={control} testId={`${testIdPrefix}-playback`} />
      {supported ? (
        <view className="listening-prompt-controls-end">
          <ListenControls.Slow control={control} testId={`${testIdPrefix}-slow`} />
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
