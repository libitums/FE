import type { ReactNode } from "@lynx-js/react";

import { VisualNovelDialog } from "@libitums/ui-lynx/visual-novel-dialog";

// 최종 테스트(RP · 이야기 파이널)의 상대 대사 줄입니다 — 접근성 요소 하나로 읽히고 안쪽 대화창은 가려 이름이 겹치지 않습니다.
// 큰 글자에서는 대사가 화면을 다 차지해 답안 판 · 버튼을 밀어내므로, 줄이 줄고 대화창은 **제 스크롤 안에서** 잘립니다.
// 대화창이 z-index를 가져 스크롤을 독립 레이어로 만듭니다(`catalog-final-screen.css`의 `-line-scroll`).
export function FinalCounterpartLine({
  testId,
  accessibilityLabel,
  speakerName,
  line,
  reducedMotion,
}: {
  readonly testId: string;
  readonly accessibilityLabel: string;
  readonly speakerName: string;
  readonly line: { readonly ko: string; readonly roman: string | null; readonly en: string | null };
  readonly reducedMotion: boolean;
}): ReactNode {
  return (
    <view
      className="catalog-final-screen-line"
      data-testid={testId}
      accessibility-element={true}
      accessibility-traits="text"
      accessibility-label={accessibilityLabel}
    >
      <scroll-view
        className="catalog-final-screen-line-scroll"
        scroll-orientation="vertical"
        scroll-bar-enable={false}
        accessibility-elements-hidden={true}
      >
        <VisualNovelDialog
          speakerName={speakerName}
          line={line.ko}
          translation={line.en ?? line.roman ?? undefined}
          reveal="instant"
          continueIndicator="off"
          surface="translucent"
          contentLanguage="learning"
          languageTag="ko"
          reducedMotion={reducedMotion}
        />
      </scroll-view>
    </view>
  );
}
