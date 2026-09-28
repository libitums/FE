import { useReducer, useRef, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";
import type { ScrollEvent } from "@lynx-js/types";

import { JourneyStepNode } from "./JourneyStepNode";
import { MessengerMapItem } from "./MessengerMapItem";
import { PhoneCallMapItem } from "./PhoneCallMapItem";
import { VisualNovelMapItem } from "./VisualNovelMapItem";
import { StepSheet } from "./StepSheet";
import { JourneyMapTopBar } from "./JourneyMapTopBar";
import {
  measureRects,
  screenId,
  scrollId,
  scrollMapTo,
  scrollStepIntoView,
  stepNodeId,
} from "./journey-map-scroll";
import { EpisodeHeader } from "@libitums/ui-lynx/episode-header";
import {
  findStep,
  initialStepSheetState,
  journeySteps,
  stepSheetReducer,
  stepStatusAt,
  stepSheetPlacement,
  stepSheetTop,
  stepUnitSize,
  learningFormsForStep,
  journeyMapSections,
  completedMapItemCount,
  journeyStepOrdinal,
  type JourneyStepId,
} from "./journey-map";
import type { MessengerUnitId } from "../messenger/messenger.contract";
import type { PhoneCallUnitId } from "../phone-call/phone-call.contract";
import type { VisualNovelUnitId } from "../visual-novel/visual-novel.contract";

import "./journey-map-screen.css";

/** 진행은 모듈 상수가 아니라 `App`이 소유하고 props로 내립니다. */
export type JourneyMapScreenProps = {
  completedStepCount: number;
  onStartStep: (id: JourneyStepId) => void;
  completedMessengerUnitIds: readonly MessengerUnitId[];
  onStartMessengerUnit: (id: MessengerUnitId) => void;
  completedPhoneCallUnitIds: readonly PhoneCallUnitId[];
  onStartPhoneCallUnit: (id: PhoneCallUnitId) => void;
  completedVisualNovelUnitIds?: readonly VisualNovelUnitId[];
  onStartVisualNovelUnit?: (id: VisualNovelUnitId) => void;
  onOpenNotifications: () => void;
  /**
   * 상단 지표 둘입니다. 화면이 스스로 세지 않고 받습니다 — 연속일수와 트로피는 여정
   * 진행과 다른 축이고, 그 규칙은 아직 정해지지 않았습니다. 기본값 0은 「아직 규칙이
   * 없다」를 값으로 적은 것입니다.
   */
  streakDays?: number;
  trophyCount?: number;
};

// 화면 컴포넌트: 파일명 PascalCase, export 이름과 일치, `~Screen` 접미사 (ADR-0003 D6).
// 시트 열림 상태는 이 화면이 소유합니다 — `useReducer`로 순수 함수 `stepSheetReducer`를
// 소비합니다. `Nav`는 관여하지 않습니다.
export function JourneyMapScreen({
  completedStepCount,
  onStartStep,
  completedMessengerUnitIds,
  onStartMessengerUnit,
  completedPhoneCallUnitIds,
  onStartPhoneCallUnit,
  completedVisualNovelUnitIds = [],
  onStartVisualNovelUnit = () => {},
  onOpenNotifications,
  streakDays = 0,
  trophyCount = 0,
}: JourneyMapScreenProps): ReactNode {
  const [sheetState, dispatch] = useReducer(stepSheetReducer, initialStepSheetState);
  // 스크롤 자리를 두 곳에 둡니다. ref는 탭 순간의 값을 읽기 위한 것이고(다시 그릴
  // 이유가 없습니다), state는 말풍선이 열린 동안 그 움직임을 따라가기 위한 것입니다.
  // 열려 있지 않으면 state를 건드리지 않습니다 — 스크롤 한 프레임마다 화면을 다시
  // 그리는 값을 치르지 않기 위해서입니다.
  const latestScrollTop = useRef(0);
  const [openScrollTop, setOpenScrollTop] = useState(0);
  // 지금 자리를 재고 있는 스텝입니다. 재는 일이 비동기라, 그 사이에 말풍선이 닫히거나
  // 다른 스텝으로 바뀌면 늦게 온 답이 화면을 옛 유닛 쪽으로 끌고 갑니다 — 답이 왔을 때
  // 이 값이 자기 스텝이 아니면 버립니다.
  const measuringStepId = useRef<JourneyStepId | null>(null);

  const handleScroll = (event: ScrollEvent) => {
    "background only";
    // oxlint-disable-next-line react/immutability
    latestScrollTop.current = event.detail.scrollTop;
    if (sheetState.openStepId !== null) {
      setOpenScrollTop(event.detail.scrollTop);
    }
  };

  const handleSelectStep = (id: JourneyStepId, tapY: number) => {
    "background only";
    // 먼저 탭 자리로 엽니다 — 탭이 유닛 한가운데였다고 어림한 값입니다. 재는 일은
    // 비동기라, 기다렸다 열면 누른 뒤 말풍선이 늦게 뜹니다.
    const tapScrollTop = latestScrollTop.current;
    // oxlint-disable-next-line react/immutability
    measuringStepId.current = id;
    dispatch({
      type: "openStep",
      stepId: id,
      anchorY: tapY + stepUnitSize / 2,
      scrollTop: tapScrollTop,
    });
    setOpenScrollTop(tapScrollTop);
    // 그다음 유닛을 실제로 재서 자리를 바로잡고, 유닛을 스크롤 가운데로 옮깁니다 —
    // 탭 좌표는 손가락이 유닛의 어디를 눌렀는지에 따라 달라지므로, 그 값만으로는
    // 말풍선이 유닛에 맞지 않습니다. 못 재도 탭을 막지 않습니다: 말풍선은 이미 떴습니다.
    measureRects([stepNodeId(id), scrollId, screenId], (rects) => {
      "background only";
      if (measuringStepId.current !== id) {
        return;
      }
      // oxlint-disable-next-line react/immutability
      measuringStepId.current = null;
      const [unit, scroll, screen] = rects ?? [];
      if (unit === undefined || scroll === undefined || screen === undefined) {
        scrollStepIntoView(id);
        return;
      }
      const scrollTop = latestScrollTop.current;
      const placement = stepSheetPlacement({
        unitTop: unit.top,
        scrollViewTop: scroll.top,
        scrollViewHeight: scroll.height,
        screenTop: screen.top,
        screenHeight: screen.height,
        scrollTop,
      });
      dispatch({
        type: "anchorStep",
        stepId: id,
        anchorY: placement.anchorY,
        scrollTop,
        anchorLimit: placement.anchorLimit,
      });
      setOpenScrollTop(scrollTop);
      scrollMapTo(placement.targetScrollTop);
    });
  };

  const handleCloseSheet = () => {
    "background only";
    // oxlint-disable-next-line react/immutability
    measuringStepId.current = null;
    dispatch({ type: "closeSheet" });
  };

  const openStep =
    sheetState.openStepId === null ? undefined : findStep(journeySteps, sheetState.openStepId);

  // 진행의 출처 넷을 한 묶음으로 모읍니다 — 에피소드마다 따로 넘기면 하나를 빠뜨립니다.
  const progress = {
    completedStepCount,
    completedMessengerUnitIds,
    completedPhoneCallUnitIds,
    completedVisualNovelUnitIds,
  };

  return (
    <view id={screenId} className="journey-map-screen" data-testid="journey-map-screen">
      {/* [고정] 머리 — 지표 칩 둘과 알림 버튼입니다. 화면 제목이 없습니다: 에피소드
          헤더 카드가 「지금 어느 에피소드인가」를 이미 말하므로 제목 줄을 따로 두면 같은
          말이 두 번 섭니다(2026-09-26 디자인 반영).

          래퍼가 ADR-0016 D9의 가림을 집니다 — 시트가 열린 동안 뒤쪽 조작 노드(알림
          버튼)를 가립니다. 가림은 자손에 걸리므로(D5) 버튼 자신이 아니라 이 래퍼에
          붙입니다. 지표 칩은 조작 노드가 아니지만 같은 래퍼 안이라 함께 가려집니다 —
          시트가 열린 동안 뒤쪽을 읽을 이유가 없으므로 그대로 둡니다. */}
      <view
        className="journey-map-screen-actions"
        data-testid="journey-map-screen-actions"
        accessibility-elements-hidden={openStep !== undefined}
      >
        <JourneyMapTopBar
          streakDays={streakDays}
          trophyCount={trophyCount}
          onOpenNotifications={onOpenNotifications}
        />
      </view>
      {/* [흐름] 내용 슬롯 — 스크롤 컨테이너 하나가 맵 컨테이너를 감쌉니다. 가림
          속성(`accessibility-elements-hidden`)은 맵 컨테이너에 그대로 남습니다 —
          스크롤 컨테이너로 올리면 가리는 범위가 넓어집니다. `scroll-orientation`·
          `scroll-bar-enable`을 적습니다 — 안 적으면 초기값이 각각 가로·꺼짐이라
          세로 스크롤이 원리적으로 불가능합니다. accessibility-*를 붙이지 않습니다. */}
      <scroll-view
        id={scrollId}
        className="journey-map-screen-scroll"
        data-testid="journey-map-screen-scroll"
        scroll-orientation="vertical"
        scroll-bar-enable={true}
        bindscroll={handleScroll}
      >
        <view
          className="journey-map-screen-map"
          data-testid="journey-map-screen-map"
          accessibility-elements-hidden={openStep !== undefined}
        >
          {journeyMapSections.map((section) => (
            // 에피소드 하나가 헤더 + 유닛 줄입니다. 조각(Fragment)이 아니라 상자로
            // 감쌉니다 — 유닛 사이 간격은 맵이 주지만 에피소드 사이는 더 벌어져야 하고,
            // 그 간격을 이 상자가 집니다.
            <view className="journey-map-screen-episode" key={section.episode.id}>
              {/* 헤더를 감싸는 상자입니다. 카드가 스스로 sticky가 되지 않습니다 —
                  ui-lynx 컴포넌트의 배치는 그것을 쓰는 화면이 정하고, 카드는 자기
                  생김새만 압니다. 이 상자가 그 배치(줄 폭 · 달라붙기 · 덮기)를 집니다. */}
              <view className="journey-map-screen-episode-header">
                <EpisodeHeader
                  episodeLabel={section.episode.label}
                  title={section.episode.title}
                  completedUnitCount={completedMapItemCount(section.items, progress)}
                  totalUnitCount={section.items.length}
                />
              </view>
              {section.items.map((item) =>
                item.kind === "special" ? (
                  <MessengerMapItem
                    key={item.id}
                    id={item.id}
                    title={item.title}
                    status={completedMessengerUnitIds.includes(item.id) ? "completed" : "available"}
                    onSelect={onStartMessengerUnit}
                  />
                ) : item.kind === "phone-call" ? (
                  <PhoneCallMapItem
                    key={item.id}
                    id={item.id}
                    title={item.title}
                    status={completedPhoneCallUnitIds.includes(item.id) ? "completed" : "available"}
                    onSelect={onStartPhoneCallUnit}
                  />
                ) : item.kind === "visual-novel" ? (
                  <VisualNovelMapItem
                    key={item.id}
                    id={item.id}
                    title={item.title}
                    status={
                      completedVisualNovelUnitIds.includes(item.id) ? "completed" : "available"
                    }
                    onSelect={onStartVisualNovelUnit}
                  />
                ) : (
                  <JourneyStepNode
                    key={item.step.id}
                    id={item.step.id}
                    title={item.step.title}
                    status={stepStatusAt(journeyStepOrdinal(item.step.id) - 1, completedStepCount)}
                    onSelect={handleSelectStep}
                  />
                ),
              )}
            </view>
          ))}
        </view>
      </scroll-view>
      {/* [겹침 레이어] 스크롤 밖, 화면 루트의 직계 자식입니다. */}
      {openStep === undefined ? null : (
        <StepSheet
          title={openStep.title}
          /* 잰 자리에 그 뒤의 스크롤 변화량을 더합니다 — 유닛이 가운데로 옮겨 가는
             동안 말풍선이 그 유닛에 붙어 함께 움직입니다. */
          top={stepSheetTop(sheetState, openScrollTop)}
          lessonOrdinal={journeyStepOrdinal(openStep.id)}
          /* 진행은 「끝낸 활동 수 / 그 스텝이 잡은 활동 수」입니다. 오늘 활동은
             스텝 단위로만 저장되므로, 끝난 스텝이면 전부이고 아니면 0입니다 —
             중간에서 그만둔 자리는 아직 어디에도 남지 않습니다. */
          completedActivityCount={
            stepStatusAt(journeyStepOrdinal(openStep.id) - 1, completedStepCount) === "done"
              ? learningFormsForStep(openStep.id).length
              : 0
          }
          totalActivityCount={learningFormsForStep(openStep.id).length}
          /* `시작`의 목적지는 이 화면이 정하지 않습니다 — 열린 스텝의 id를 그대로
             위로 올립니다. 화면 전환은 `App`의 것입니다. */
          onStart={() => onStartStep(openStep.id)}
          onClose={handleCloseSheet}
        />
      )}
    </view>
  );
}
