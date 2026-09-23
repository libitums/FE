import type { ReactNode } from "@lynx-js/react";

import "./step-sheet.css";

/** 낭독 순서는 `제목 → 설명 → 시작 → 닫기`입니다. `닫기`를 시트 머리로 올리지 않습니다. */
export type StepSheetProps = {
  title: string;
  description: string;
  onStart: () => void;
  onClose: () => void;
};

export function StepSheet({ title, description, onStart, onClose }: StepSheetProps): ReactNode {
  return (
    <view className="step-sheet">
      {/* 딤 토큰이 없어 배경을 선언하지 않습니다. 존재 이유는 하나, 맵으로 가는 탭을
          가로채는 것입니다. `bindtap`이 없어도 트리에 얹혀 시각적으로 맵 위에
          겹치고(z-index), 손가락도 받습니다.

          배경 없는 `<view>`가 hit-testing에서 빠질 것을 의심해 `docs/e2e/journey-map.md`
          5번으로 걸었고, 2026-09-03 iPhone 13 mini · iOS 26.6.1 Release에서
          통과했습니다. 맵에 시트 열림 가드가 없어(`JourneyMapScreen`의 스텝 노드는
          시트가 떠 있어도 `bindtap`이 살아 있습니다) 그때 손가락을 막은 것은 이
          가림막 하나뿐입니다. 그래서 빈 `bindtap`을 얹지 않습니다 — 증명된 메커니즘
          위에 죽은 핸들러를 올리면 5번이 무엇을 증명했는지가 흐려집니다(PR #34 리뷰). */}
      <view className="step-sheet-scrim" accessibility-elements-hidden={true} />
      <view className="step-sheet-panel" data-testid="step-sheet-panel">
        <text
          className="step-sheet-title"
          data-testid="step-sheet-title"
          accessibility-traits="header"
        >
          {title}
        </text>
        <text className="step-sheet-description" data-testid="step-sheet-description">
          {description}
        </text>
        <view
          className="step-sheet-start"
          data-testid="step-sheet-start"
          accessibility-element={true}
          accessibility-label="시작"
          accessibility-traits="button"
          bindtap={onStart}
        >
          <text className="step-sheet-start-label">시작</text>
        </view>
        <view
          className="step-sheet-close"
          data-testid="step-sheet-close"
          accessibility-element={true}
          accessibility-label="닫기"
          accessibility-traits="button"
          bindtap={onClose}
        >
          <text className="step-sheet-close-label">닫기</text>
        </view>
      </view>
    </view>
  );
}
