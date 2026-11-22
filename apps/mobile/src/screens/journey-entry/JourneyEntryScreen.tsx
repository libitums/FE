import type { ReactNode } from "@lynx-js/react";

import arrowLeft from "@libitums/icons/lynx/arrow-left-03";
import { Button } from "@libitums/ui-lynx/button";
import { Fog } from "@libitums/ui-lynx/fog";
import { RoundButton } from "@libitums/ui-lynx/round-button";

import { entryLanguageLabel } from "../../lib/entry-language";
import { lightStatusBarIcons } from "../../lib/status-bar-icons";
import { useUiCopy } from "../../lib/ui-copy";
import { useScreenBack } from "../../lib/use-back-handler";
import { useLeaveOnce } from "../../lib/use-leave-once";
import journeyBackground from "./assets/journey.png";
import type { JourneyEntryScreenProps } from "./journey-entry.contract";

import "./journey-entry-screen.css";

// 고른 언어의 라벨을 그대로 한 줄 보입니다.
//
// ⟨2026-09-28⟩ **이 화면은 셸의 안쪽 여백을 받지 않습니다.** 그림이 화면 끝까지 깔려야
// 하는데 셸이 가려지는 가장자리만큼 여백을 잡으면 위 · 아래에 그림이 닿지 않는 띠가
// 남습니다(기기에서 그렇게 보였습니다). 대신 가장자리를 피하는 일을 글자 묶음 둘이
// `safeArea`로 직접 집니다 — 스플래시가 셸 배경색을 바꿔 같은 문제를 푸는 것과 갈리는
// 자리이고, 여기서는 배경이 색이 아니라 사진이라 그 방법이 안 통합니다.
//
// 2026-09-21 디자인 반영: 화면 전체에 여정 그림(journey.png)을 깔고, 위 · 아래에
// 검은 Fog로 명암을 더합니다. 위에는 제목(heading-l) + 고른 언어(label, gray.500)가 섭니다.
//
// ⟨2026-11-22⟩ Start 하나가 두 길이 됐습니다(ADR-0176, 시안 A안): 아래에 큰 제목 · 안내 ·
// 「기초부터」(흰 면 · 보조 줄) · 「바로 입장」(brand.primary) · AI 고지가 섭니다. 둘을 빠르게
// 이어 눌러도 한 길만 고릅니다. 작은 기기 · 긴 번역 · 큰 글꼴에서는 글자 묶음이 스크롤합니다.
export function JourneyEntryScreen({
  safeArea,
  language,
  onSelectPath,
  onBack,
}: JourneyEntryScreenProps): ReactNode {
  const leave = useLeaveOnce();
  // 시스템 뒤로가기 = 보이는 뒤로 버튼과 같은 함수입니다(버튼이 없으면 등록하지 않습니다). 뒤로도 떠나는 동작이라 한 번입니다.
  const handleBack = onBack === undefined ? undefined : () => leave(onBack);
  useScreenBack(handleBack);
  const uiCopy = useUiCopy();
  const copy = uiCopy.journeyEntry;
  const handleBasics = () => {
    "background only";
    leave(() => onSelectPath("basics"));
  };
  const handleStory = () => {
    "background only";
    leave(() => onSelectPath("story"));
  };
  return (
    <view className="journey-entry-screen" data-statusbar={lightStatusBarIcons}>
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

      <scroll-view
        className="journey-entry-screen-scroll"
        data-testid="journey-entry-screen-scroll"
        scroll-orientation="vertical"
        scroll-bar-enable={false}
      >
        <view className="journey-entry-screen-content">
          {/* 가려지는 가장자리를 **글자 묶음이** 피합니다 — 셸이 이 화면에는 여백을 잡지
              않기 때문입니다(`App.tsx`). 그래야 그림과 Fog가 화면 끝까지 갑니다.

              값이 상황마다 갈리므로 인라인입니다(토큰이 아니라 호스트가 재서 넘긴 수치입니다).
              바깥 상자의 안쪽 여백이고, 짝 CSS가 안쪽 상자에 주는 여백에 **더합니다** — 디자인의 여백은
              그대로 두고 가장자리 몫만 얹습니다. 바깥 상자가 어두운 면을 지므로(글자가 작은 기기 · 큰 글꼴에서
              가운데로 밀려도 읽히게) 면은 가장자리까지 닿습니다. */}
          <view className="journey-entry-screen-top" style={{ paddingTop: `${safeArea.top}px` }}>
            <view className="journey-entry-screen-top-body">
              {/* 그림 위라 면 없는 overlay RoundButton(흰 아이콘)을 씁니다. */}
              <view
                className="journey-entry-screen-header"
                data-testid="journey-entry-screen-header"
              >
                {handleBack ? (
                  <RoundButton
                    accessibilityLabel={uiCopy.common.back}
                    icon={arrowLeft}
                    variant="overlay"
                    size="xl"
                    bindtap={handleBack}
                  />
                ) : null}
              </view>
              <text
                className="journey-entry-screen-title"
                data-testid="journey-entry-screen-title"
                flatten={false}
                accessibility-element={true}
                accessibility-heading={true}
                accessibility-traits="header"
              >
                {copy.title}
              </text>
              <text
                className="journey-entry-screen-language"
                data-testid="journey-entry-screen-language"
                flatten={false}
                accessibility-element={true}
              >
                {entryLanguageLabel(language)}
              </text>
            </view>
          </view>

          <view
            className="journey-entry-screen-bottom"
            style={{ paddingBottom: `${safeArea.bottom}px` }}
          >
            <view className="journey-entry-screen-bottom-body">
              {/* 구분선은 큰 제목 글자 폭만큼만 긋습니다 — 묶음을 글자 폭으로 줄입니다. */}
              <view className="journey-entry-screen-display-group">
                <text
                  className="journey-entry-screen-display"
                  data-testid="journey-entry-screen-display"
                  flatten={false}
                  accessibility-element={true}
                >
                  {copy.display}
                </text>
                <view
                  className="journey-entry-screen-separator"
                  data-testid="journey-entry-screen-separator"
                />
              </view>
              <text
                className="journey-entry-screen-caption"
                data-testid="journey-entry-screen-caption"
                flatten={false}
                accessibility-element={true}
              >
                {copy.caption}
              </text>
              {/* 흰 면 + 보조 줄입니다 — Button에는 두 줄 자리가 없어 직접 그립니다. TalkBack은
                  `accessibility-enable-tap`이 있어야 두 번 탭으로 누릅니다. */}
              <view
                className="journey-entry-screen-basics"
                data-testid="journey-entry-screen-basics"
                flatten={false}
                accessibility-element={true}
                accessibility-label={`${copy.basics}, ${copy.basicsDetail}`}
                accessibility-traits="button"
                accessibility-enable-tap={true}
                bindtap={handleBasics}
              >
                <text className="journey-entry-screen-basics-label" accessibility-element={false}>
                  {copy.basics}
                </text>
                <text className="journey-entry-screen-basics-detail" accessibility-element={false}>
                  {copy.basicsDetail}
                </text>
              </view>
              <view className="journey-entry-screen-story" data-testid="journey-entry-screen-story">
                <Button
                  label={copy.story}
                  variant="brand"
                  size="xl"
                  width="fill"
                  bindtap={handleStory}
                />
              </view>
              <text
                className="journey-entry-screen-notice"
                data-testid="journey-entry-screen-notice"
                flatten={false}
                accessibility-element={true}
              >
                {copy.notice}
              </text>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>
  );
}
