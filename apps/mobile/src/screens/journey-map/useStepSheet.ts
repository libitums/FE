import { useReducer, useRef, useState } from "@lynx-js/react";
import type { ScrollEvent } from "@lynx-js/types";

import { useMotion } from "@libitums/ui-lynx/motion";
import {
  headerCardId,
  measureRectsWithOptional,
  screenId,
  scrollId,
  scrollMapTo,
  scrollNodeIntoView,
  stepNodeId,
} from "./journey-map-scroll";
import { catalogUnitDomId } from "./catalog-map";
import { catalogSheetTargetOf } from "./catalog-sheet";
import { autoScrollPlacement, mapScrollBehaviorFor } from "./journey-map-scroll-position";
import {
  initialStepSheetState,
  stepSheetCaretLimit,
  stepSheetCaretOffset,
  stepSheetPlacementBelowHeader,
  stepSheetReducer,
  stepSheetTop,
  stepUnitSize,
  type JourneyStepId,
  type StepSheetState,
} from "./journey-map";
import type { SheetTargetId } from "./catalog-map.contract";

/** 말풍선이 붙을 유닛의 상자 id입니다 — 튜토리얼은 스텝 노드, 카탈로그는 유닛 셀입니다. */
function sheetNodeDomId(id: SheetTargetId): string {
  const catalog = catalogSheetTargetOf(id);
  return catalog === null
    ? stepNodeId(id as JourneyStepId)
    : catalogUnitDomId(catalog.episodeId, catalog.unitKey);
}

export type StepSheetControls = {
  readonly sheetState: StepSheetState;
  /** 말풍선 꼭대기의 세로 자리입니다 — 유닛을 따라 스크롤과 함께 움직입니다. */
  readonly sheetTop: number;
  /** 꼬리의 가로 치우침입니다(px, 가운데가 0). 재기 전 · 못 쟀을 때 · 닫힌 동안은 0. */
  readonly sheetCaretOffset: number;
  readonly handleScroll: (event: ScrollEvent) => void;
  /** `unitSize`는 누른 표식의 높이입니다 — 없으면 레슨 원(`stepUnitSize`)입니다. */
  readonly handleSelectStep: (id: SheetTargetId, tapY: number, unitSize?: number) => void;
  readonly handleCloseSheet: () => void;
};

/**
 * 말풍선의 열림과 자리를 집니다. 열림 전이는 순수 함수 `stepSheetReducer`가 하고, 이
 * 훅은 그것을 호스트(자리 재기 · 스크롤)와 잇습니다. 화면에서 떼어 둔 것은 화면이
 * 그리는 일과 이 일이 서로를 읽지 않기 때문입니다.
 */
export function useStepSheet(): StepSheetControls {
  const [sheetState, dispatch] = useReducer(stepSheetReducer, initialStepSheetState);
  // 스크롤 자리를 두 곳에 둡니다. ref는 탭 순간의 값을 읽기 위한 것이고(다시 그릴
  // 이유가 없습니다), state는 말풍선이 열린 동안 그 움직임을 따라가기 위한 것입니다.
  // 열려 있지 않으면 state를 건드리지 않습니다 — 스크롤 한 프레임마다 화면을 다시
  // 그리는 값을 치르지 않기 위해서입니다.
  const latestScrollTop = useRef(0);
  const [openScrollTop, setOpenScrollTop] = useState(0);
  // 두 열에서는 유닛이 화면 가운데에 서지 않으므로 꼬리가 가운데에서 벗어납니다. 값은 잰 뒤에야 알고,
  // 상태 객체 · 배치 계산은 건드리지 않으려고 지역 상태로 둡니다.
  const [caretOffset, setCaretOffset] = useState(0);
  // 동작 줄이기에서는 이동이 즉시입니다(ADR-0053 D3).
  const behavior = mapScrollBehaviorFor(useMotion());
  // 지금 자리를 재고 있는 스텝입니다. 재는 일이 비동기라, 그 사이에 말풍선이 닫히거나
  // 다른 스텝으로 바뀌면 늦게 온 답이 화면을 옛 유닛 쪽으로 끌고 갑니다 — 답이 왔을 때
  // 이 값이 자기 스텝이 아니면 버립니다.
  const measuringStepId = useRef<SheetTargetId | null>(null);

  const handleScroll = (event: ScrollEvent) => {
    "background only";
    // oxlint-disable-next-line react/immutability
    latestScrollTop.current = event.detail.scrollTop;
    if (sheetState.openStepId !== null) {
      setOpenScrollTop(event.detail.scrollTop);
    }
  };

  const handleSelectStep = (id: SheetTargetId, tapY: number, unitSize = stepUnitSize) => {
    "background only";
    // 먼저 탭 자리로 엽니다 — 탭이 유닛 한가운데였다고 어림한 값입니다. 재는 일은
    // 비동기라, 기다렸다 열면 누른 뒤 말풍선이 늦게 뜹니다.
    const tapScrollTop = latestScrollTop.current;
    // oxlint-disable-next-line react/immutability
    measuringStepId.current = id;
    dispatch({
      type: "openStep",
      stepId: id,
      anchorY: tapY + unitSize / 2,
      scrollTop: tapScrollTop,
    });
    setOpenScrollTop(tapScrollTop);
    setCaretOffset(0);
    // 그다음 유닛을 실제로 재서 자리를 바로잡고, 유닛을 스크롤 가운데로 옮깁니다 —
    // 탭 좌표는 손가락이 유닛의 어디를 눌렀는지에 따라 달라지므로, 그 값만으로는
    // 말풍선이 유닛에 맞지 않습니다. 못 재도 탭을 막지 않습니다: 말풍선은 이미 떴습니다.
    // 머리 카드는 없어도 됩니다 — 못 재면 카드를 피하지 않고 말풍선은 지금처럼 섭니다.
    measureRectsWithOptional(
      [sheetNodeDomId(id), scrollId, screenId],
      [headerCardId],
      (rects, [card]) => {
        "background only";
        if (measuringStepId.current !== id) {
          return;
        }
        // oxlint-disable-next-line react/immutability
        measuringStepId.current = null;
        const [unit, scroll, screen] = rects ?? [];
        if (unit === undefined || scroll === undefined || screen === undefined) {
          scrollNodeIntoView(sheetNodeDomId(id), behavior);
          return;
        }
        const scrollTop = latestScrollTop.current;
        const placement = stepSheetPlacementBelowHeader(
          {
            unitTop: unit.top,
            unitSize,
            scrollViewTop: scroll.top,
            scrollViewHeight: scroll.height,
            screenTop: screen.top,
            screenHeight: screen.height,
            scrollTop,
          },
          unit.centerX,
          card === undefined || card === null
            ? null
            : { bottom: card.top + card.height, left: card.left, width: card.width },
          autoScrollPlacement.gap,
        );
        dispatch({
          type: "anchorStep",
          stepId: id,
          anchorY: placement.anchorY,
          scrollTop,
          anchorLimit: placement.anchorLimit,
        });
        setOpenScrollTop(scrollTop);
        setCaretOffset(stepSheetCaretOffset(unit.centerX, screen.centerX, stepSheetCaretLimit));
        scrollMapTo(placement.targetScrollTop, behavior);
      },
    );
  };

  const handleCloseSheet = () => {
    "background only";
    // oxlint-disable-next-line react/immutability
    measuringStepId.current = null;
    dispatch({ type: "closeSheet" });
    setCaretOffset(0);
  };

  return {
    sheetState,
    sheetTop: stepSheetTop(sheetState, openScrollTop),
    sheetCaretOffset: caretOffset,
    handleScroll,
    handleSelectStep,
    handleCloseSheet,
  };
}
