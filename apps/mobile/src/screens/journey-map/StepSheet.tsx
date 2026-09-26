import type { ReactNode } from "@lynx-js/react";

import { stepSheetProgress } from "./journey-map-sheet";

import "./step-sheet.css";

/**
 * 유닛을 누르면 그 유닛에 붙어 뜨는 말풍선입니다(Figma 79-5791). 낭독 순서는
 * `제목 → 진행 → 시작`이고, 닫기는 말풍선 밖이 집니다 — 디자인에 보이는 닫기 자리가
 * 없습니다.
 */
export type StepSheetProps = {
  title: string;
  /** 제목 앞에 서는 순번입니다. `Lesson 3: "주문하기"`의 3입니다. */
  lessonOrdinal: number;
  completedActivityCount: number;
  totalActivityCount: number;
  onStart: () => void;
  onClose: () => void;
};

export function StepSheet({
  title,
  lessonOrdinal,
  completedActivityCount,
  totalActivityCount,
  onStart,
  onClose,
}: StepSheetProps): ReactNode {
  const progress = stepSheetProgress(completedActivityCount, totalActivityCount);

  return (
    <view className="step-sheet">
      {/* 가림막입니다. 하는 일이 둘로 늘었습니다 — 맵으로 가는 탭을 가로채는 것과,
          그 탭으로 말풍선을 닫는 것입니다. 보이는 닫기 자리가 없어졌으므로(디자인)
          이름과 역할을 여기에 싣습니다: 스크린리더는 이 막을 `닫기` 버튼으로 읽고,
          손가락은 말풍선 밖 아무 데나 누르면 됩니다.

          배경 없는 `<view>`가 hit-testing에서 빠질 것을 의심해 `docs/e2e/journey-map.md`
          5번으로 걸었고, 2026-09-03 iPhone 13 mini · iOS 26.6.1 Release에서
          통과했습니다. 그때 손가락을 막은 것이 이 막 하나였다는 것이, 지금 이 막에
          닫기를 얹는 근거이기도 합니다 — 탭이 여기 닿는다는 것을 이미 기기에서
          봤습니다. */}
      <view
        className="step-sheet-scrim"
        data-testid="step-sheet-close"
        accessibility-element={true}
        accessibility-label="닫기"
        accessibility-traits="button"
        bindtap={onClose}
      />
      {/* 말풍선을 가로 가운데에 세우는 상자입니다. 말풍선 폭이 고정(250)이라 좌우를
          0으로 펴고 가운데 정렬로 자리를 잡습니다 — 폭을 아는 쪽이 말풍선이고, 이
          상자는 그 자리만 압니다. */}
      <view className="step-sheet-anchor">
        {/* 꼬리입니다. 45도 돌린 네모의 아래 절반을 말풍선이 덮어 삼각형만 남습니다 —
            순수 장식이라 접근성 트리에 올리지 않습니다. */}
        <view className="step-sheet-caret" />
        <view className="step-sheet-panel" data-testid="step-sheet-panel">
          <text
            className="step-sheet-title"
            data-testid="step-sheet-title"
            accessibility-traits="header"
          >
            {`Lesson ${String(lessonOrdinal)}: “${title}”`}
          </text>
          {/* 진행 줄입니다. 셋이 같은 수에서 나옵니다 — 낱말 둘과 막대가 어긋나지
              않습니다. 막대는 장식이 아니라 값이므로, 낱말 둘을 한 접근성 요소로
              묶어 읽히게 하고 막대 자신은 트리에서 뺍니다. */}
          <view
            className="step-sheet-progress"
            data-testid="step-sheet-progress"
            accessibility-element={true}
            accessibility-label={`${progress.countLabel}, ${progress.percentLabel}`}
          >
            <view className="step-sheet-progress-row">
              <text className="step-sheet-progress-count" data-testid="step-sheet-progress-count">
                {progress.countLabel}
              </text>
              <text
                className="step-sheet-progress-percent"
                data-testid="step-sheet-progress-percent"
              >
                {progress.percentLabel}
              </text>
            </view>
            <view className="step-sheet-progress-track">
              {/* 0%에서는 그리지 않습니다 — 폭 0짜리 상자가 둥근 끝 때문에 점으로
                  남아 「조금 했다」로 읽힙니다. */}
              {progress.fillPercent === 0 ? null : (
                <view
                  className="step-sheet-progress-fill"
                  data-testid="step-sheet-progress-fill"
                  style={{ width: `${String(progress.fillPercent)}%` }}
                />
              )}
            </view>
          </view>
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
        </view>
      </view>
    </view>
  );
}
