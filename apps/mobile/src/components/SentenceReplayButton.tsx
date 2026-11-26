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
  /**
   * 면 톤입니다 — `light`(기본, 레슨 판정 줄) 밝은 면, `dialog`(이야기 컷) 대사 상자와 같은 짙은 면 + 밝은 아이콘입니다
   * (ADR-0188 개정 D7 · ADR-0189). 소리 없는 회색 단추도 같은 면에 흐린 아이콘으로 섭니다.
   */
  readonly tone?: "light" | "dialog";
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
  tone = "light",
  onReplayed,
}: SentenceReplayButtonProps): ReactNode {
  const copy = useUiCopy();
  const frameClass = `sentence-replay sentence-replay-${size}${tone === "dialog" ? " sentence-replay-dialog" : ""}`;
  if (replay.kind === "unavailable") {
    return (
      <view className={frameClass}>
        <AudioUnavailableControl testId={testId} icon={volume} size={size} tone={tone} />
      </view>
    );
  }
  const handleTap = () => {
    "background only";
    playAudio(replay.source, noop);
    onReplayed?.();
  };
  return (
    <view className={frameClass} data-testid={testId} data-state="available">
      <RoundButton
        accessibilityLabel={copy.sentenceReplay.label}
        icon={volume}
        // dialog 톤은 면 없는 흰 아이콘(overlay)을 대사 상자 색 원(`sentence-replay-dialog`) 위에 얹습니다.
        variant={tone === "dialog" ? "overlay" : "neutral"}
        size={size}
        bindtap={handleTap}
      />
    </view>
  );
}
