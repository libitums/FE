import type { ReactNode } from "@lynx-js/react";

import volume from "@libitums/icons/lynx/volume";
import { RoundButton } from "@libitums/ui-lynx/round-button";

import { playAudio } from "../lib/audio";
import type { SentenceReplay } from "../lib/sentence-replay";
import { useUiCopy } from "../lib/ui-copy";
import { AudioUnavailableControl } from "./AudioUnavailableControl";

import "./sentence-replay-button.css";

export type SentenceReplayButtonProps = {
  readonly testId: string;
  readonly replay: SentenceReplay;
  /** `l` — 이야기 컷(면 44), `m` — 레슨 판정 줄(면 36). 누르는 자리는 둘 다 48입니다. */
  readonly size: "m" | "l";
  /** 소리를 다시 낸 뒤 한 번 부릅니다(측정). 회색 단추는 부르지 않습니다. */
  readonly onReplayed?: () => void;
};

const noop = (): void => {};

// 지나간 한국어 문장을 다시 듣는 스피커입니다(ADR-0189, 시안 docs/design/replay-audio.md). 소리가 있으면 누를 때마다
// 처음부터 다시 내고(재생 모듈은 하나라 앞 소리는 끊깁니다), 없으면 Letters와 같은 회색 꺼진 단추입니다(ADR-0173).
// 상태는 들지 않습니다 — 재생 중 표시가 없어 정지 · 끝을 읽을 일이 없습니다.
export function SentenceReplayButton({
  testId,
  replay,
  size,
  onReplayed,
}: SentenceReplayButtonProps): ReactNode {
  const copy = useUiCopy();
  if (replay.kind === "unavailable") {
    return (
      <view className={`sentence-replay sentence-replay-${size}`}>
        <AudioUnavailableControl testId={testId} icon={volume} size={size} />
      </view>
    );
  }
  const handleTap = () => {
    "background only";
    playAudio(replay.source, noop);
    onReplayed?.();
  };
  return (
    <view
      className={`sentence-replay sentence-replay-${size}`}
      data-testid={testId}
      data-state="available"
    >
      <RoundButton
        accessibilityLabel={copy.sentenceReplay.label}
        icon={volume}
        variant="neutral"
        size={size}
        bindtap={handleTap}
      />
    </view>
  );
}
