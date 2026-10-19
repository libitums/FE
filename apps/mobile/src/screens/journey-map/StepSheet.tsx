import type { ReactNode } from "@lynx-js/react";

import { useLayerBack } from "../../lib/use-back-handler";
import { useUiCopy } from "../../lib/ui-copy";
import { playSound } from "../../lib/sound-effects";
import { StepSheetPercent } from "./StepSheetPercent";
import { stepSheetProgress } from "./journey-map-sheet";
import {
  sheetEntranceClasses,
  sheetPercentOf,
  stepSheetBubbleOrigin,
  type SheetEntranceMotion,
} from "./journey-map-sheet-motion";

import "./step-sheet.css";
import "./step-sheet-motion.css";

/**
 * 유닛을 누르면 그 유닛에 붙어 뜨는 말풍선입니다(Figma 79-5791). 낭독 순서는
 * `제목 → 진행 → 시작`이고, 닫기는 말풍선 밖이 집니다 — 디자인에 보이는 닫기 자리가
 * 없습니다.
 */
export type StepSheetProps = {
  title: string;
  /**
   * 말풍선 꼭대기(꼬리 상자 위 모서리)의 세로 자리입니다(화면 상자 기준). 유닛에서
   * 얼마나 띄울지는 이 컴포넌트가 정하지 않습니다 — 유닛을 잰 쪽(`stepSheetTop`)이
   * 정해서 넘깁니다.
   */
  top: number;
  /** 꼬리의 가로 치우침입니다(px, 가운데가 0). */
  caretOffset: number;
  /** 제목 앞에 서는 순번입니다. `Lesson 3: "주문하기"`의 3입니다. */
  lessonOrdinal: number;
  /**
   * 제목 앞 이름을 바꿉니다 — 카탈로그 유닛은 `Culture` · `Final test`가 섭니다. 없으면 `Lesson n`입니다.
   */
  unitLabel?: string;
  completedActivityCount: number;
  totalActivityCount: number;
  onStart: () => void;
  onClose: () => void;
  /** 등장 모션입니다. 없으면 `none`(모션 없음). */
  entrance?: SheetEntranceMotion;
};

export function StepSheet({
  title,
  top,
  caretOffset,
  lessonOrdinal,
  unitLabel,
  completedActivityCount,
  totalActivityCount,
  onStart,
  onClose,
  entrance = "none",
}: StepSheetProps): ReactNode {
  const copy = useUiCopy();
  // 시스템 뒤로가기 = 가림막 탭(`onClose`)과 같은 함수입니다. 말풍선이 서 있는 동안만 등록됩니다.
  useLayerBack(onClose);
  // 셀 수 없는 유닛(전체 0)은 진행 줄을 그리지 않습니다 — 카탈로그 유닛에서 문항을 지을 수 없을 때입니다.
  const progress =
    totalActivityCount === 0
      ? null
      : stepSheetProgress(completedActivityCount, totalActivityCount, copy);

  const motion = sheetEntranceClasses(entrance);

  const handleStart = (): void => {
    playSound("button");
    onStart();
  };

  // 숨쉬기 층과 버튼을 키를 단 한 배열로 냅니다 — 층이 들고 나도 버튼은 같은 노드로 남고, 둘이 같은 층(형제)에 섭니다.
  const startLayers = [
    motion.startGlow ? (
      <view
        key="glow"
        className="step-sheet-start-glow"
        data-testid="step-sheet-start-glow"
        user-interaction-enabled={false}
      />
    ) : null,
    <view
      key="start"
      className="step-sheet-start"
      data-testid="step-sheet-start"
      accessibility-element={true}
      accessibility-label={copy.journeyMap.start}
      accessibility-traits="button"
      {...(motion.bubbleInteractive ? { bindtap: handleStart } : {})}
    >
      <text className="step-sheet-start-label">{copy.journeyMap.start}</text>
    </view>,
  ];

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
        accessibility-label={copy.common.close}
        accessibility-traits="button"
        bindtap={onClose}
      />
      {/* 말풍선의 자리입니다. 가로는 CSS가 잡습니다 — 말풍선 폭이 고정(250)이라
          좌우를 펴고 가운데 정렬로 세웁니다. 세로는 누른 유닛마다 다른 값이라 CSS가
          가질 수 없어 인라인 스타일이 집니다. */}
      <view
        className="step-sheet-anchor"
        data-testid="step-sheet-anchor"
        style={{ top: `${String(top)}px` }}
      >
        {/* 꼬리와 패널을 한 덩어리로 묶는 등장 래퍼입니다. 기준점이 꼬리 끝이라 말풍선이 그 끝에서 터지듯 커집니다.
            대기 중에는 보이지 않으니 이 자리를 눌러도 말풍선 밖을 누른 것과 같이 닫습니다 — 시작은 끄고, 탭은
            자손에서 이 래퍼까지 올라와 여기서 닫힙니다. 탭을 꺼서 가림막으로 흘리는 방식은 기기에서 탭이 형제
            가림막에 닿지 않았습니다(Android e2e SM6 · ADR-0055 D6). 줄이기에서만 표식을 답니다 — 접근성 노드가
            아니라 움직이는 이 요소에 답니다. */}
        <view
          className={motion.bubble}
          data-testid="step-sheet-pop"
          style={{ transformOrigin: stepSheetBubbleOrigin(caretOffset) }}
          {...(motion.bubbleInteractive ? {} : { catchtap: onClose })}
          {...(motion.motionReduced ? { "data-motion": "reduced" } : {})}
        >
          {/* 꼬리입니다. 45도 돌린 네모의 아래 절반을 말풍선이 덮어 삼각형만 남습니다 —
              순수 장식이라 접근성 트리에 올리지 않습니다. 두 열에서는 유닛이 화면 가운데에
              서지 않으므로 가운데에서 `caretOffset`만큼 치우쳐 그 유닛을 가리킵니다(패널은
              가운데 그대로입니다). */}
          <view
            className="step-sheet-caret"
            data-testid="step-sheet-caret"
            data-caretOffset={String(caretOffset)}
            style={{ left: `${String(caretOffset)}px` }}
          />
          <view className="step-sheet-panel" data-testid="step-sheet-panel">
            <text
              className="step-sheet-title"
              data-testid="step-sheet-title"
              accessibility-traits="header"
            >
              {`${unitLabel ?? `Lesson ${String(lessonOrdinal)}`}: “${title}”`}
            </text>
            {/* 진행 줄입니다. 셋이 같은 수에서 나옵니다 — 낱말 둘과 막대가 어긋나지
                않습니다. 막대는 장식이 아니라 값이므로, 낱말 둘을 한 접근성 요소로
                묶어 읽히게 하고 막대 자신은 트리에서 뺍니다. 접근성 이름은 카운트업 중에도 처음부터 최종값을
                싣습니다 — 오르는 글자는 이 요소의 자손이라 따로 읽히지 않습니다. */}
            {progress === null ? null : (
              <view
                className="step-sheet-progress"
                data-testid="step-sheet-progress"
                accessibility-element={true}
                accessibility-label={`${copy.journeyMap.activityProgressLabel(completedActivityCount, totalActivityCount)}, ${progress.percentLabel}`}
              >
                <view className="step-sheet-progress-row">
                  <text
                    className="step-sheet-progress-count"
                    data-testid="step-sheet-progress-count"
                  >
                    {progress.countLabel}
                  </text>
                  <StepSheetPercent
                    percent={sheetPercentOf(progress.fillPercent)}
                    entrance={entrance}
                  />
                </view>
                <view className="step-sheet-progress-track">
                  {/* 0%에서는 그리지 않습니다 — 폭 0짜리 상자가 둥근 끝 때문에 점으로
                      남아 「조금 했다」로 읽힙니다. */}
                  {progress.fillPercent === 0 ? null : (
                    <view
                      className={motion.fill}
                      data-testid="step-sheet-progress-fill"
                      style={{ width: `${String(progress.fillPercent)}%` }}
                    />
                  )}
                </view>
              </view>
            )}
            {/* 시작 버튼을 감싼 래퍼입니다. 등장하면 버튼 뒤 층이 세 번 숨 쉽니다(버튼 면 · 라벨은 그대로입니다). */}
            <view className="step-sheet-start-wrap">{startLayers}</view>
          </view>
        </view>
      </view>
    </view>
  );
}
