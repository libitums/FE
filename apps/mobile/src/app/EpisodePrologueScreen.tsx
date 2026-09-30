import { useRef, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import type { SafeAreaInsets } from "../lib/safe-area";
import type { EpisodePrologue } from "../screens/episode-intro/episode-intro.contract";
import { PrologueCallScreen } from "../screens/episode-intro/PrologueCallScreen";
import { PrologueChatScreen } from "../screens/episode-intro/PrologueChatScreen";
import { EpisodeNarrativeScreen } from "../screens/episode-narrative/EpisodeNarrativeScreen";
import jiminPortrait from "../screens/visual-novel/assets/cafe/character-jimin-smile.png";

export type EpisodePrologueScreenProps = {
  readonly insets: SafeAreaInsets;
  readonly label: string;
  readonly prologue: EpisodePrologue;
  readonly guided?: boolean;
  readonly onComplete: () => void;
  readonly onExit: () => void;
};

/** 시작 유닛 안의 구간을 잇습니다. 각 화면은 기존 디자인과 자체 상호작용을 유지합니다. */
export function EpisodePrologueScreen({
  insets,
  label,
  prologue,
  guided = false,
  onComplete,
  onExit,
}: EpisodePrologueScreenProps): ReactNode {
  const [segmentIndex, setSegmentIndex] = useState(0);
  const completedIndex = useRef(-1);
  const segments = prologue.kind === "sequence" ? prologue.segments : [prologue];
  const segment = segments[segmentIndex]!;

  const handleComplete = () => {
    "background only";
    // 화면 교체 전에 연속 탭이 와도 같은 구간을 두 번 완료하지 않습니다.
    if (completedIndex.current >= segmentIndex) return;
    completedIndex.current = segmentIndex;
    if (segmentIndex + 1 === segments.length) {
      onComplete();
    } else {
      setSegmentIndex(segmentIndex + 1);
    }
  };

  switch (segment.kind) {
    case "visual-novel":
      return (
        <EpisodeNarrativeScreen
          key={segmentIndex}
          guided={guided}
          insets={insets}
          label={label}
          narrative={segment.narrative}
          onFinish={handleComplete}
          onExit={onExit}
        />
      );
    case "messenger":
      return (
        <PrologueChatScreen
          key={segmentIndex}
          guided={guided}
          insets={insets}
          episodeLabel={label}
          chat={segment.chat}
          onComplete={handleComplete}
          onBack={onExit}
        />
      );
    case "call":
      return (
        <PrologueCallScreen
          key={segmentIndex}
          guided={guided}
          insets={insets}
          episodeLabel={label}
          call={segment.call}
          callerPortrait={
            segment.callerPortrait === undefined ? jiminPortrait : segment.callerPortrait
          }
          onComplete={handleComplete}
          onBack={onExit}
        />
      );
    default: {
      const exhaustive: never = segment;
      return exhaustive;
    }
  }
}
