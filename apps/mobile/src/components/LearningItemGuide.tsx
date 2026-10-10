// 학습 문항 안내입니다. 화면 루트 뒤의 형제로 서서 화면 전체를 덮습니다. 안쪽 요소의
// 클래스는 첫 단원 안내와 공유하고, 루트와 스크림은 자기 CSS 파일이 정합니다.

import { useGlobalProps } from "@lynx-js/react";

import arrowDown03 from "@libitums/icons/lynx/arrow-down-03";
import { color } from "@libitums/design-tokens";
import { Overlay } from "@libitums/ui-lynx/overlay";

import type { LearningItemGuideProps } from "../lib/learning-item-guide.contract";
import { safeAreaInsetsFrom } from "../lib/safe-area";
import { lightStatusBarIcons } from "../lib/status-bar-icons";
import { useUiCopy } from "../lib/ui-copy";
import { useLayerBack } from "../lib/use-back-handler";
import "./first-unit-guide.css";
import "./learning-item-guide.css";

export function LearningItemGuide({ kind, onDismiss }: LearningItemGuideProps) {
  // 이 레이어는 셸 밖(`position: fixed`)이라 안전 영역을 스스로 읽습니다(lib/safe-area.ts).
  const insets = safeAreaInsetsFrom(useGlobalProps());
  const uiCopy = useUiCopy();
  const message = uiCopy.learningItemGuide[kind];
  const continueText = uiCopy.episodeIntro.guide.continue;
  const handleDismiss = () => {
    "background only";
    onDismiss();
  };
  // 시스템 뒤로가기 = 아무 데나 탭과 같은 함수입니다. 안내가 서 있는 동안만 등록됩니다.
  useLayerBack(handleDismiss);
  return (
    <view
      className="learning-item-guide"
      data-testid={`learning-item-guide-${kind}`}
      data-statusbar={lightStatusBarIcons}
      catchtap={handleDismiss}
      style={{
        paddingTop: `${insets.top}px`,
        paddingBottom: `${insets.bottom}px`,
        paddingLeft: `${insets.left}px`,
        paddingRight: `${insets.right}px`,
      }}
    >
      <Overlay scope="area" />
      <view
        className="first-unit-guide-content"
        accessibility-element={true}
        accessibility-exclusive-focus={true}
        accessibility-traits="button"
        accessibility-label={`${message.title}. ${message.description} ${continueText}`}
      >
        <text
          className="first-unit-guide-title"
          accessibility-element={false}
          data-testid="learning-item-guide-title"
        >
          {message.title}
        </text>
        <text
          className="first-unit-guide-description"
          accessibility-element={false}
          data-testid="learning-item-guide-description"
        >
          {message.description}
        </text>
        <view className="first-unit-guide-continue">
          <svg
            className="first-unit-guide-arrow"
            content={arrowDown03}
            current-color={color.brand.primary}
          />
          <text className="first-unit-guide-instruction" accessibility-element={false}>
            {continueText}
          </text>
        </view>
      </view>
    </view>
  );
}
