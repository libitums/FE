import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";
import arrowLeft03 from "@libitums/icons/lynx/arrow-left-03";
import arrowRight from "@libitums/icons/lynx/arrow-right";
import { Button } from "@libitums/ui-lynx/button";
import { Dialog } from "@libitums/ui-lynx/dialog";
import { RoundButton } from "@libitums/ui-lynx/round-button";

import { lightStatusBarIcons } from "../../lib/status-bar-icons";
import { useLayerBack, useScreenBack } from "../../lib/use-back-handler";
import { useUiCopy } from "../../lib/ui-copy";
import { NarrativeBackground } from "../episode-narrative/NarrativeBackground";
import type { EpisodeIntroScreenProps } from "./episode-intro.contract";

import "./episode-intro-screen.css";

/**
 * 에피소드의 서사 표지입니다(Figma 80-7869). 에피소드의 유닛을 처음 열 때 그 앞에 한
 * 번 섭니다. 위에 에피소드의 두 줄, 아래에 `Skip` · `Next`가 섭니다.
 *
 * **그림은 받은 것만 깝니다.** 디자인은 화면 전체에 장면 그림을 깝니다. 표지 전용 그림은 콘텐츠에
 * 없어 카탈로그 에피소드는 그 에피소드의 첫 컷 그림을 받고(`backgroundImageUrl`), 튜토리얼은 받지 않아
 * 어두운 면만 그립니다. 위 · 아래 그러데이션이 그림 위의 글자를 읽히게 합니다.
 *
 * 오른쪽 위 설정 버튼은 그리지 않습니다 — 갈 곳이 정해지지 않았습니다.
 */
export function EpisodeIntroScreen({
  insets,
  label,
  title,
  titleLines,
  skipDescription,
  backgroundImageUrl = null,
  onBack,
  onSkip,
  onNext,
}: EpisodeIntroScreenProps): ReactNode {
  const copy = useUiCopy();
  // `Skip`은 곧장 건너뛰지 않고 한 번 묻습니다 — 건너뛴 서사는 이 세션에서 다시 서지
  // 않으므로, 손가락이 잘못 닿아 이야기를 잃지 않게 합니다.
  const [confirmingSkip, setConfirmingSkip] = useState(false);

  const handleConfirmAction = (id: string) => {
    "background only";
    setConfirmingSkip(false);
    if (id === "skip") {
      onSkip();
    }
  };
  // 시스템 뒤로가기: 확인창이 떠 있으면 그 확인창만 닫고(건너뛰지 않습니다), 아니면 보이는 뒤로와 같습니다.
  useScreenBack(onBack);
  useLayerBack(confirmingSkip ? () => handleConfirmAction("stay") : null);

  return (
    <view
      className="episode-intro-screen"
      data-testid="episode-intro-screen"
      data-statusbar={lightStatusBarIcons}
    >
      {/* 명암 두 겹은 순수 장식입니다. */}
      <view className="episode-intro-screen-backdrop" accessibility-elements-hidden={true}>
        {/* 그림은 움직이지 않고 로드되면 나타납니다 — 첫 컷 화면이 같은 그림으로 이어 받습니다. */}
        {backgroundImageUrl === null ? null : (
          <NarrativeBackground src={backgroundImageUrl} previousSrc={null} animated={false} />
        )}
        <view className="episode-intro-screen-shade-top" />
        <view className="episode-intro-screen-shade-bottom" />
      </view>

      {/* 여백 상자 — 가장자리 여백을 인라인으로 잡습니다(값이 기기마다 달라 CSS가 가질
          수 없습니다). 화면 여백 토큰은 그 안의 상자가 집니다. */}
      <view
        className="episode-intro-screen-safe"
        // 확인 모달이 떠 있는 동안 뒤쪽을 가립니다(ADR-0016 D9).
        accessibility-elements-hidden={confirmingSkip}
        data-testid="episode-intro-screen-safe"
        style={{
          paddingTop: `${insets.top}px`,
          paddingBottom: `${insets.bottom}px`,
          paddingLeft: `${insets.left}px`,
          paddingRight: `${insets.right}px`,
        }}
      >
        <view className="episode-intro-screen-body">
          <view className="episode-intro-screen-top">
            <view className="episode-intro-screen-back" data-testid="episode-intro-screen-back">
              <RoundButton
                accessibilityLabel={copy.common.exitTo.journey}
                icon={arrowLeft03}
                variant="neutral"
                size="xl"
                bindtap={onBack}
              />
            </view>
            {/* 두 줄을 한 머리말로 묶습니다 — 따로 두면 `Episode 0.`와 이름이 두 번 멈춰
            읽힙니다. */}
            <view
              className="episode-intro-screen-heading"
              data-testid="episode-intro-screen-heading"
              accessibility-element={true}
              accessibility-traits="header"
              accessibility-label={`${label} ${titleLines === undefined ? title : titleLines.join(" ")}`}
            >
              <text className="episode-intro-screen-label" data-testid="episode-intro-screen-label">
                {label}
              </text>
              {titleLines === undefined ? (
                <text
                  className="episode-intro-screen-title"
                  data-testid="episode-intro-screen-title"
                >
                  {title}
                </text>
              ) : (
                // 줄마다 글자 하나입니다 — 줄 사이 간격은 줄 높이가 집니다.
                <view className="episode-intro-screen-title-lines">
                  {titleLines.map((line, index) => (
                    <text
                      // 같은 글자의 줄이 둘일 수 있어 자리로 구분합니다(줄은 재배열되지 않습니다).
                      key={`${index}:${line}`}
                      className="episode-intro-screen-title"
                      data-testid="episode-intro-screen-title"
                    >
                      {line}
                    </text>
                  ))}
                </view>
              )}
            </view>
          </view>

          <view className="episode-intro-screen-actions">
            <view className="episode-intro-screen-skip" data-testid="episode-intro-screen-skip">
              <Button
                label="Skip"
                variant="subtle"
                size="xl"
                width="fill"
                bindtap={() => setConfirmingSkip(true)}
              />
            </view>
            <view className="episode-intro-screen-next" data-testid="episode-intro-screen-next">
              <Button
                label="Next"
                variant="brand"
                size="xl"
                width="fill"
                icon={arrowRight}
                iconPosition="trailing"
                bindtap={onNext}
              />
            </view>
          </view>
        </view>
      </view>
      {/* [겹침 레이어] 화면 루트의 직계 자식입니다. 첫 동작이 건너뛰기이고, 마지막이
          취소(계속 보기)입니다 — `Dialog`는 마지막 동작을 취소로 읽습니다. */}
      {confirmingSkip ? (
        <view className="episode-intro-screen-confirm" data-testid="episode-intro-screen-confirm">
          <Dialog
            title={copy.episodeIntro.skipDialog.title}
            description={skipDescription ?? copy.episodeIntro.skipDialog.description}
            actions={[
              { id: "skip", label: copy.episodeIntro.skipDialog.skip },
              { id: "stay", label: copy.episodeIntro.skipDialog.keepWatching },
            ]}
            phase="visible"
            bindaction={handleConfirmAction}
          />
        </view>
      ) : null}
    </view>
  );
}
