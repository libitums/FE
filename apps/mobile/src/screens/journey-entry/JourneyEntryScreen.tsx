import type { ReactNode } from "@lynx-js/react";

import arrowLeft from "@libitums/icons/lynx/arrow-left-03";
import { Button } from "@libitums/ui-lynx/button";
import { Fog } from "@libitums/ui-lynx/fog";
import { RoundButton } from "@libitums/ui-lynx/round-button";

import { entryLanguageLabel } from "../../lib/entry-language";
import { useScreenBack } from "../../lib/use-back-handler";
import journeyBackground from "./assets/journey.png";
import type { JourneyEntryScreenProps } from "./journey-entry.contract";

import "./journey-entry-screen.css";

// 고른 언어의 라벨을 그대로 한 줄 보입니다.
//
// ⟨2026-09-28⟩ **이 화면만 셸의 안쪽 여백을 받지 않습니다.** 그림이 화면 끝까지 깔려야
// 하는데 셸이 가려지는 가장자리만큼 여백을 잡으면 위 · 아래에 그림이 닿지 않는 띠가
// 남습니다(기기에서 그렇게 보였습니다). 대신 가장자리를 피하는 일을 글자 묶음 둘이
// `safeArea`로 직접 집니다 — 스플래시가 셸 배경색을 바꿔 같은 문제를 푸는 것과 갈리는
// 자리이고, 여기서는 배경이 색이 아니라 사진이라 그 방법이 안 통합니다.
//
// 2026-09-21 디자인 반영: 화면 전체에 여정 그림(journey.png)을 깔고, 위 · 아래에
// 검은 Fog로 명암을 더합니다. 위에는 제목(heading-l) + 고른 언어(label,
// gray.500), 아래에는 큰 제목(accent display) · 안내(caption, gray.500) · AI
// 생성 고지(gray.800) · 흰 Start 버튼이 섭니다. 제목 · 안내 · 큰 제목 문구는
// 자리표입니다(디자인 문구 확정 전).
export function JourneyEntryScreen({
  safeArea,
  language,
  onEnter,
  onBack,
}: JourneyEntryScreenProps): ReactNode {
  // 시스템 뒤로가기 = 보이는 뒤로 버튼과 같은 함수입니다(버튼이 없으면 등록하지 않습니다).
  useScreenBack(onBack);
  return (
    <view className="journey-entry-screen">
      {/* 배경 그림과 Fog는 순수 장식입니다. `<image>`는 기본 접근성 정지라서
          (ADR-0016 D5) 래퍼가 가립니다. */}
      <view className="journey-entry-screen-backdrop" accessibility-elements-hidden={true}>
        <image
          className="journey-entry-screen-background"
          data-testid="journey-entry-screen-background"
          src={journeyBackground}
          mode="aspectFill"
        />
        <view className="journey-entry-screen-fog-top">
          <Fog direction="top" size="full" color="dark" />
        </view>
        <view className="journey-entry-screen-fog-bottom">
          <Fog direction="bottom" size="full" color="dark" />
        </view>
      </view>

      {/* 가려지는 가장자리를 **글자 묶음이** 피합니다 — 셸이 이 화면에는 여백을 잡지
          않기 때문입니다(`App.tsx`). 그래야 그림과 Fog가 화면 끝까지 갑니다.

          값이 상황마다 갈리므로 인라인입니다(토큰이 아니라 호스트가 재서 넘긴 수치입니다).
          짝 CSS의 `padding-top`에 **더합니다** — 디자인의 안쪽 여백은 그대로 두고
          가장자리 몫만 얹는 것이라, 둘을 한 값으로 합치면 안 가려지는 기기에서 여백이
          사라집니다. */}
      <view className="journey-entry-screen-top" style={{ marginTop: `${safeArea.top}px` }}>
        {/* 그림 위라 면 없는 overlay RoundButton(흰 아이콘)을 씁니다. */}
        <view className="journey-entry-screen-header" data-testid="journey-entry-screen-header">
          {onBack ? (
            <RoundButton
              accessibilityLabel="Back"
              icon={arrowLeft}
              variant="overlay"
              size="xl"
              bindtap={onBack}
            />
          ) : null}
        </view>
        <text
          className="journey-entry-screen-title"
          data-testid="journey-entry-screen-title"
          accessibility-traits="header"
        >
          Your journey awaits
        </text>
        <text className="journey-entry-screen-language" data-testid="journey-entry-screen-language">
          {entryLanguageLabel(language)}
        </text>
      </view>

      <view
        className="journey-entry-screen-bottom"
        style={{ marginBottom: `${safeArea.bottom}px` }}
      >
        {/* 구분선은 큰 제목 글자 폭만큼만 긋습니다 — 묶음을 글자 폭으로 줄입니다. */}
        <view className="journey-entry-screen-display-group">
          <text className="journey-entry-screen-display" data-testid="journey-entry-screen-display">
            Start your story
          </text>
          <view
            className="journey-entry-screen-separator"
            data-testid="journey-entry-screen-separator"
          />
        </view>
        <text className="journey-entry-screen-caption" data-testid="journey-entry-screen-caption">
          Explore Seoul, meet new people, and learn Korean along the way.
        </text>
        <text className="journey-entry-screen-notice" data-testid="journey-entry-screen-notice">
          Some images in this service are generated using AI technology
        </text>
        <view className="journey-entry-screen-start" data-testid="journey-entry-screen-start">
          <Button label="Start" variant="neutral" size="xl" width="fill" bindtap={onEnter} />
        </view>
      </view>
    </view>
  );
}
