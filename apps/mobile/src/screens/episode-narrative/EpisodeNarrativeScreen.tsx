import { FirstUnitGuide } from "../../components/FirstUnitGuide";
import { useFirstUnitGuide } from "../../components/first-unit-guide";
import { useEffect, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import arrowLeft03 from "@libitums/icons/lynx/arrow-left-03";
import { Avatar } from "@libitums/ui-lynx/avatar";
import { RoundButton } from "@libitums/ui-lynx/round-button";
import { VisualNovelDialog } from "@libitums/ui-lynx/visual-novel-dialog";
import { useTypewriter } from "@libitums/ui-lynx/typewriter";

import storyBackground from "../../assets/story/story-background.png";
import storyCharacter from "../../assets/story/story-character.png";
import type { SafeAreaInsets } from "../../lib/safe-area";
import { useScreenBack } from "../../lib/use-back-handler";
import { useUiCopy } from "../../lib/ui-copy";
import { playAudio, stopAudio } from "../../lib/audio";
import { nextEpisodeNarrativeBeat, type EpisodeNarrative } from "./episode-narrative";
import { NarrativeBackground } from "./NarrativeBackground";

import "./episode-narrative-screen.css";

export type EpisodeNarrativeScreenProps = {
  /** 가장자리 여백입니다. 그림은 가장자리까지 깔고, 버튼 · 대화만 이 여백 안에 둡니다. */
  readonly insets: SafeAreaInsets;
  /** 머리 제목입니다 — `Episode 0.` */
  readonly label: string;
  readonly narrative: EpisodeNarrative;
  /** 첫 유닛의 조작 안내를 표시할 수 있는 화면입니다. */
  readonly guided?: boolean;
  /** 마지막 장면에서 한 번 더 넘기면 불립니다. */
  readonly onFinish: () => void;
  /** 뒤로(맵으로)입니다. */
  readonly onExit: () => void;
  /** 배경 전환·확대와 대사 타이핑·계속 표시의 모션을 줄입니다. */
  readonly reducedMotion?: boolean;
};

// 탭 전파만 끊습니다. `catchtap`은 핸들러가 있어야 붙습니다.
function stopTap() {
  "background only";
}

/**
 * 에피소드 서사입니다(Figma 79-6304). 서사 표지의 `Next` 뒤에 서는 비주얼 노벨이고, 장면
 * 그림 위에 대화 패널 하나가 섭니다. 출력 중 탭은 대사를 완성하고, 완료 후 탭은 다음
 * 장면으로 넘어갑니다. 마지막 장면 뒤에는 누른 유닛이 열립니다.
 *
 * 장면 번호는 이 화면의 것입니다 — 뒤로 나가면 버려지고, 다시 들어오면 처음부터입니다.
 */
export function EpisodeNarrativeScreen({
  insets,
  guided = false,
  label,
  narrative,
  onFinish,
  onExit,
  reducedMotion = false,
}: EpisodeNarrativeScreenProps): ReactNode {
  const copy = useUiCopy();
  const guide = useFirstUnitGuide("story", guided);
  const [beatIndex, setBeatIndex] = useState(0);
  const beat = narrative.beats[beatIndex] ?? narrative.beats[0];
  const typing = useTypewriter({
    text: beat.line,
    enabled: !guide.visible,
    resetKey: beatIndex,
    reducedMotion,
    delayMs: beat.revealTiming?.delayMs,
    intervalMs: beat.revealTiming
      ? beat.revealTiming.durationMs / Math.max(1, Array.from(beat.line).length)
      : undefined,
  });
  const background = beat.background ?? storyBackground;
  const previousBackground = narrative.beats[beatIndex - 1]?.background ?? storyBackground;
  const character = narrative.character === undefined ? storyCharacter : narrative.character;
  const audioSource = beat.audioSource;

  useEffect(() => {
    if (guide.visible || audioSource === undefined) return undefined;
    // 음원이 끝나도 독백을 읽을 시간은 사용자가 정합니다. 자동으로 넘기지 않습니다.
    const outcome = playAudio(audioSource, () => {});
    return outcome === "started" ? () => stopAudio() : undefined;
  }, [audioSource, beatIndex, guide.visible]);

  const handleAdvance = () => {
    "background only";
    if (guide.visible) return;
    if (!typing.isComplete) {
      typing.finish();
      return;
    }
    const next = nextEpisodeNarrativeBeat(narrative, beatIndex);
    if (next === null) {
      if (audioSource !== undefined) stopAudio();
      onFinish();
      return;
    }
    setBeatIndex(next);
  };

  const handleExit = () => {
    "background only";
    if (audioSource !== undefined) stopAudio();
    onExit();
  };
  // 시스템 뒤로가기 = 보이는 나가기와 같은 함수입니다(오디오 정지 포함).
  useScreenBack(handleExit);

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
        <NarrativeBackground
          key={background}
          src={background}
          previousSrc={beat.transitionFrom ?? (beatIndex > 0 ? previousBackground : null)}
          animated={beat.background !== undefined}
          transition={beat.transition}
          reducedMotion={reducedMotion}
        />
        {character === null ? null : (
          <view className="episode-narrative-screen-character-slot">
            <image
              className="episode-narrative-screen-character"
              src={character}
              mode="aspectFit"
            />
          </view>
        )}
        <view
          className={
            beat.background === undefined
              ? "episode-narrative-screen-shade"
              : "episode-narrative-screen-shade episode-narrative-screen-shade-story"
          }
        />
      </view>

      {/* 넘기기 층 — 보조기술에 「다음 대사」 버튼 하나로 섭니다. 버튼 특성을 가진 요소라
          스스로 탭을 받습니다(스크린리더의 두 번 탭이 여기로 옵니다). `catchtap`이라 루트의
          넘기기와 겹치지 않습니다. */}
      <view
        className="episode-narrative-screen-advance"
        flatten={false}
        accessibility-elements-hidden={guide.visible}
        data-testid="episode-narrative-screen-advance"
        accessibility-element={true}
        accessibility-traits="button"
        accessibility-label={copy.episodeNarrative.nextLine(beatIndex + 1, narrative.beats.length)}
        catchtap={handleAdvance}
      />

      <view
        className="episode-narrative-screen-safe"
        flatten={false}
        accessibility-elements-hidden={guide.visible}
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
              accessibilityLabel={copy.common.exitTo.journey}
              icon={arrowLeft03}
              variant="neutral"
              size="xl"
              bindtap={handleExit}
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
          flatten={false}
          accessibility-elements-hidden={guide.visible}
          data-testid="episode-narrative-screen-dialog"
        >
          <VisualNovelDialog
            {...(beat.variant === "narration"
              ? { variant: "narration" as const }
              : {
                  variant: beat.variant,
                  speakerName: beat.speakerName,
                  avatar: <Avatar name={beat.speakerName} size="sm" accessibility="hidden" />,
                })}
            line={beat.line}
            reveal="typewriter"
            status={typing.isComplete ? "ready" : "revealing"}
            visibleCharacterCount={typing.visibleCharacterCount}
            reducedMotion={reducedMotion}
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
      {guide.visible ? <FirstUnitGuide step="story" onDismiss={guide.dismiss} /> : null}
    </view>
  );
}
