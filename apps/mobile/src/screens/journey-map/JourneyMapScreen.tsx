import type { ReactNode } from "@lynx-js/react";

import { JourneyStepNode } from "./JourneyStepNode";
import { MessengerMapItem } from "./MessengerMapItem";
import { PhoneCallMapItem } from "./PhoneCallMapItem";
import { VisualNovelMapItem } from "./VisualNovelMapItem";
import { EpisodeFinalMapItem } from "./EpisodeFinalMapItem";
import { StepSheet } from "./StepSheet";
import { screenId, scrollId } from "./journey-map-scroll";
import { useStepSheet } from "./useStepSheet";
import { useScreenLayer } from "../../lib/use-screen-layer";
import { EpisodeHeader } from "@libitums/ui-lynx/episode-header";
import {
  findStep,
  journeySteps,
  stepStatusAt,
  learningFormsForStep,
  journeyMapSections,
  completedMapItemCount,
  mapItemStatus,
  journeyStepOrdinal,
  type JourneyStepId,
} from "./journey-map";
import type { MessengerUnitId } from "../messenger/messenger.contract";
import type { PhoneCallUnitId } from "../phone-call/phone-call.contract";
import type { VisualNovelUnitId } from "../visual-novel/visual-novel.contract";
import type { EpisodeFinalUnitId } from "../episode-final/episode-final.contract";
import type { EpisodeIntroUnitId } from "../episode-intro/episode-intro.contract";

import "./journey-map-screen.css";

/** 진행은 모듈 상수가 아니라 `App`이 소유하고 props로 내립니다. */
export type JourneyMapScreenProps = {
  completedStepCount: number;
  onStartStep: (id: JourneyStepId) => void;
  /**
   * 끝낸 표지 유닛입니다 — 표지 게이트(`mapItemStatus`)가 이 값을 봅니다.
   *
   * ⚠ **옵셔널인 것은 임시입니다.** 계약(spec §2.6)은 이 prop과 짝인
   * `onStartEpisodeIntroUnit`을 **필수**로 세웁니다 — 안 넘기면 맵이 조용히 「완료
   * 0건」으로 그려지는 자리라 ADR-0024 D4가 막는 바로 그 모양입니다. 필수로 바꾸면
   * 이 화면을 렌더하는 파일 일곱이 `TS2739`로 서고, 그 자리를 고치는 것은
   * 표지 맵 항목 컴포넌트를 세우는 `ui` 변형의 몫입니다.
   */
  completedEpisodeIntroIds?: readonly EpisodeIntroUnitId[];
  completedMessengerUnitIds: readonly MessengerUnitId[];
  onStartMessengerUnit: (id: MessengerUnitId) => void;
  completedPhoneCallUnitIds: readonly PhoneCallUnitId[];
  onStartPhoneCallUnit: (id: PhoneCallUnitId) => void;
  completedVisualNovelUnitIds?: readonly VisualNovelUnitId[];
  onStartVisualNovelUnit?: (id: VisualNovelUnitId) => void;
  completedEpisodeFinalIds?: readonly EpisodeFinalUnitId[];
  onStartEpisodeFinal?: (id: EpisodeFinalUnitId) => void;
  /** 스텝 말풍선이 열리고 닫힐 때 부릅니다 — 전역 머리를 그 동안 낭독에서 가리는 데 씁니다. */
  onLayerChange?: (open: boolean) => void;
};

// 화면 컴포넌트: 파일명 PascalCase, export 이름과 일치, `~Screen` 접미사 (ADR-0003 D6).
// 시트 열림 상태는 이 화면이 소유합니다(`useStepSheet`). `Nav`는 관여하지 않습니다.
export function JourneyMapScreen({
  completedStepCount,
  onStartStep,
  completedEpisodeIntroIds = [],
  completedMessengerUnitIds,
  onStartMessengerUnit,
  completedPhoneCallUnitIds,
  onStartPhoneCallUnit,
  completedVisualNovelUnitIds = [],
  onStartVisualNovelUnit = () => {},
  completedEpisodeFinalIds = [],
  onStartEpisodeFinal = () => {},
  onLayerChange,
}: JourneyMapScreenProps): ReactNode {
  const { sheetState, sheetTop, handleScroll, handleSelectStep, handleCloseSheet } = useStepSheet();
  const openStep =
    sheetState.openStepId === null ? undefined : findStep(journeySteps, sheetState.openStepId);
  // 말풍선이 열린 동안 셸의 전역 머리(칩 · 알림 버튼)도 가려야 합니다 — 전에는 머리가 이
  // 화면 안에 있어 아래 맵 가림과 함께 가렸습니다.
  useScreenLayer(openStep !== undefined, onLayerChange);

  // 진행의 출처 여섯을 한 묶음으로 모읍니다 — 에피소드마다 따로 넘기면 하나를 빠뜨립니다.
  const progress = {
    completedStepCount,
    completedEpisodeIntroIds,
    completedMessengerUnitIds,
    completedPhoneCallUnitIds,
    completedVisualNovelUnitIds,
    completedEpisodeFinalIds,
  };

  return (
    <view id={screenId} className="journey-map-screen" data-testid="journey-map-screen">
      {/* 머리(칩 · 알림 버튼)는 이 화면이 아니라 전역 레이아웃이 집니다(`app/AppHeader`).
          머리는 이 화면 위에 겹치고, 그 몫의 위 여백은 맵 상자가 잡습니다. */}
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
                // ⚠ **표지 항목은 아직 그려지지 않습니다.** 데이터와 파생(`mapItemStatus`의
                // 표지 게이트)은 섰지만 표식 컴포넌트(`EpisodeIntroMapItem`)를 세우는 것은
                // `ui` 변형의 몫입니다. 여기서 `null`을 내는 것은 **임시**이고, 그동안
                // 헤더의 분모(맵 항목 수)와 줄에 실제로 서는 것의 수가 갈립니다.
                item.kind === "episode-intro" ? null : item.kind === "messenger" ? (
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
                ) : item.kind === "episode-final" ? (
                  <EpisodeFinalMapItem
                    key={item.id}
                    id={item.id}
                    title={item.title}
                    status={mapItemStatus(item, section.items, progress)}
                    onSelect={onStartEpisodeFinal}
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
          top={sheetTop}
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
