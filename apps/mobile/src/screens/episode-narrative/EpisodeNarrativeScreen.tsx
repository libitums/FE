import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import arrowLeft03 from "@libitums/icons/lynx/arrow-left-03";
import { Avatar } from "@libitums/ui-lynx/avatar";
import { RoundButton } from "@libitums/ui-lynx/round-button";
import { VisualNovelDialog } from "@libitums/ui-lynx/visual-novel-dialog";

import storyBackground from "../../assets/story/story-background.png";
import storyCharacter from "../../assets/story/story-character.png";
import type { SafeAreaInsets } from "../../lib/safe-area";
import {
  episodeNarrativeProgressLabel,
  nextEpisodeNarrativeBeat,
  type EpisodeNarrative,
} from "./episode-narrative";

import "./episode-narrative-screen.css";

export type EpisodeNarrativeScreenProps = {
  /** 가장자리 여백입니다. 그림은 가장자리까지 깔고, 버튼 · 대화만 이 여백 안에 둡니다. */
  readonly insets: SafeAreaInsets;
  /** 머리 제목입니다 — `Episode 0.` */
  readonly label: string;
  readonly narrative: EpisodeNarrative;
  /** 마지막 장면에서 한 번 더 넘기면 불립니다. 표지를 지나 누른 유닛이 열립니다. */
  readonly onFinish: () => void;
  /** 뒤로(맵으로)입니다. */
  readonly onExit: () => void;
};

// 탭 전파만 끊습니다. `catchtap`은 핸들러가 있어야 붙습니다.
function stopTap() {
  "background only";
}

/**
 * 에피소드 서사입니다(Figma 79-6304). 서사 표지의 `Next` 뒤에 서는 비주얼 노벨이고, 장면
 * 그림 위에 대화 패널 하나가 섭니다. 화면 어디를 눌러도 다음 장면으로 넘어가고, 마지막
 * 장면 뒤에는 누른 유닛이 열립니다.
 *
 * 장면 번호는 이 화면의 것입니다 — 뒤로 나가면 버려지고, 다시 들어오면 처음부터입니다.
 */
export function EpisodeNarrativeScreen({
  insets,
  label,
  narrative,
  onFinish,
  onExit,
}: EpisodeNarrativeScreenProps): ReactNode {
  const [beatIndex, setBeatIndex] = useState(0);
  const beat = narrative.beats[beatIndex] ?? narrative.beats[0];

  const handleAdvance = () => {
    "background only";
    const next = nextEpisodeNarrativeBeat(narrative, beatIndex);
    if (next === null) {
      onFinish();
      return;
    }
    setBeatIndex(next);
  };

  return (
    // 화면 어디를 눌러도 넘어갑니다 — 탭은 자식에서 이 루트까지 올라옵니다. 덮는 층에
    // 핸들러를 두고 위 상자들을 `event-through`로 비우는 방식은 기기에서 탭이 층까지
    // 닿지 않았습니다.
    <view
      className="episode-narrative-screen"
      data-testid="episode-narrative-screen"
      bindtap={handleAdvance}
    >
      {/* 장면 그림 · 위 명암은 순수 장식입니다. `<image>`는 기본 접근성 정지라 래퍼가
          자손을 통째로 가립니다(ADR-0016 D5). */}
      <view className="episode-narrative-screen-scene" accessibility-elements-hidden={true}>
        <image
          className="episode-narrative-screen-background"
          src={storyBackground}
          mode="aspectFill"
        />
        <view className="episode-narrative-screen-character-slot">
          <image
            className="episode-narrative-screen-character"
            src={storyCharacter}
            mode="aspectFit"
          />
        </view>
        <view className="episode-narrative-screen-shade" />
      </view>

      {/* 넘기기 층 — 보조기술에 「다음 대사」 버튼 하나로 섭니다. 버튼 특성을 가진 요소라
          스스로 탭을 받습니다(스크린리더의 두 번 탭이 여기로 옵니다). `catchtap`이라 루트의
          넘기기와 겹치지 않습니다. */}
      <view
        className="episode-narrative-screen-advance"
        data-testid="episode-narrative-screen-advance"
        accessibility-element={true}
        accessibility-traits="button"
        accessibility-label={`다음 대사, ${episodeNarrativeProgressLabel(narrative, beatIndex)}`}
        catchtap={handleAdvance}
      />

      <view
        className="episode-narrative-screen-safe"
        style={{
          paddingTop: `${insets.top}px`,
          paddingBottom: `${insets.bottom}px`,
          paddingLeft: `${insets.left}px`,
          paddingRight: `${insets.right}px`,
        }}
      >
        <view className="episode-narrative-screen-header">
          {/* 나가기의 탭은 루트까지 올라가 장면을 넘기면 안 됩니다 — 여기서 끊습니다. */}
          <view data-testid="episode-narrative-screen-back" catchtap={stopTap}>
            <RoundButton
              accessibilityLabel="맵으로"
              icon={arrowLeft03}
              variant="neutral"
              size="xl"
              bindtap={onExit}
            />
          </view>
          <text
            className="episode-narrative-screen-title"
            data-testid="episode-narrative-screen-title"
            accessibility-traits="header"
          >
            {label}
          </text>
          {/* 제목을 가운데에 두려고 나가기와 같은 폭을 오른쪽에 비워 둡니다. */}
          <view className="episode-narrative-screen-header-spacer" />
        </view>

        <view className="episode-narrative-screen-spacer" />

        <view
          className="episode-narrative-screen-dialog"
          data-testid="episode-narrative-screen-dialog"
        >
          <VisualNovelDialog
            speakerName={beat.speakerName}
            avatar={<Avatar name={beat.speakerName} size="sm" accessibility="hidden" />}
            line={beat.line}
            translation={beat.translation}
            surface="translucent"
            contentLanguage="learning"
            languageTag="ko"
            // 패널은 스스로는 탭을 흘려보내므로(`event-through`) 여기서 넘기기를 직접 겁니다.
            // 패널이 전파를 끊어 루트의 넘기기와 겹치지 않습니다.
            bindtap={handleAdvance}
          />
        </view>
      </view>
    </view>
  );
}
