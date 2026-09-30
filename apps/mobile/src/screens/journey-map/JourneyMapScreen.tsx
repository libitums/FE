import { Overlay } from "@libitums/ui-lynx/overlay";
import { useFirstUnitGuide } from "../../components/first-unit-guide";
import "../../components/first-unit-guide.css";
import type { ReactNode } from "@lynx-js/react";
import type { ScrollEvent } from "@lynx-js/types";

import { EpisodeIntroMapItem } from "./EpisodeIntroMapItem";
import { JourneyStepNode } from "./JourneyStepNode";
import { MessengerMapItem } from "./MessengerMapItem";
import { PhoneCallMapItem } from "./PhoneCallMapItem";
import { VisualNovelMapItem } from "./VisualNovelMapItem";
import { EpisodeFinalMapItem } from "./EpisodeFinalMapItem";
import { StepSheet } from "./StepSheet";
import { episodeSectionId, screenId, scrollId } from "./journey-map-scroll";
import { useCurrentEpisode } from "./useCurrentEpisode";
import { useStepSheet } from "./useStepSheet";
import { useScreenLayer } from "../../lib/use-screen-layer";
import { EpisodeHeader } from "@libitums/ui-lynx/episode-header";
import { EpisodePendingSection } from "./EpisodePendingSection";
import {
  findStep,
  journeySteps,
  stepStatusAt,
  learningFormsForStep,
  journeyMapSections,
  completedMapItemCount,
  mapItemStatus,
  journeyStepOrdinal,
  type JourneyMapItem,
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
  /** 끝낸 표지 유닛입니다 — 표지 게이트(`mapItemStatus`)가 이 값을 봅니다. */
  completedEpisodeIntroIds: readonly EpisodeIntroUnitId[];
  onStartEpisodeIntroUnit: (id: EpisodeIntroUnitId) => void;
  completedMessengerUnitIds: readonly MessengerUnitId[];
  onStartMessengerUnit: (id: MessengerUnitId) => void;
  completedPhoneCallUnitIds: readonly PhoneCallUnitId[];
  onStartPhoneCallUnit: (id: PhoneCallUnitId) => void;
  completedVisualNovelUnitIds: readonly VisualNovelUnitId[];
  onStartVisualNovelUnit: (id: VisualNovelUnitId) => void;
  completedEpisodeFinalIds: readonly EpisodeFinalUnitId[];
  onStartEpisodeFinal: (id: EpisodeFinalUnitId) => void;
  /** 스텝 말풍선이 열리고 닫힐 때 부릅니다 — 전역 머리를 그 동안 낭독에서 가리는 데 씁니다. */
  onLayerChange?: (open: boolean) => void;
};

// 화면 컴포넌트: 파일명 PascalCase, export 이름과 일치, `~Screen` 접미사 (ADR-0003 D6).
// 시트 열림 상태는 이 화면이 소유합니다(`useStepSheet`). `Nav`는 관여하지 않습니다.
export function JourneyMapScreen({
  completedStepCount,
  onStartStep,
  completedEpisodeIntroIds,
  onStartEpisodeIntroUnit,
  completedMessengerUnitIds,
  onStartMessengerUnit,
  completedPhoneCallUnitIds,
  onStartPhoneCallUnit,
  completedVisualNovelUnitIds,
  onStartVisualNovelUnit,
  completedEpisodeFinalIds,
  onStartEpisodeFinal,
  onLayerChange,
}: JourneyMapScreenProps): ReactNode {
  const guide = useFirstUnitGuide("map");
  const { sheetState, sheetTop, handleScroll, handleSelectStep, handleCloseSheet } = useStepSheet();
  // 머리 카드는 구획 밖에 **하나만** 섭니다 — 무엇을 말할지는 스크롤 자리가 고릅니다
  // (`useCurrentEpisode`의 주석에 `position: sticky`를 쓸 수 없는 이유를 적었습니다).
  const currentEpisode = useCurrentEpisode(journeyMapSections);
  const headerSection = journeyMapSections[currentEpisode.index] ?? journeyMapSections[0];

  // 스크롤 한 번에 둘이 답합니다 — 말풍선 자리와 머리 카드 내용입니다. 인라인 화살표로
  // 묶으면 `"background only"`가 중첩돼 바인딩이 서지 않습니다.
  const handleMapScroll = (event: ScrollEvent) => {
    "background only";
    handleScroll(event);
    currentEpisode.handleScroll(event);
  };
  const openStep =
    sheetState.openStepId === null ? undefined : findStep(journeySteps, sheetState.openStepId);
  // 말풍선이 열린 동안 셸의 전역 머리(칩 · 알림 버튼)도 가려야 합니다 — 전에는 머리가 이
  // 화면 안에 있어 아래 맵 가림과 함께 가렸습니다.
  useScreenLayer(openStep !== undefined || guide.visible, onLayerChange);

  // 진행의 출처 여섯을 한 묶음으로 모읍니다 — 에피소드마다 따로 넘기면 하나를 빠뜨립니다.
  const progress = {
    completedStepCount,
    completedEpisodeIntroIds,
    completedMessengerUnitIds,
    completedPhoneCallUnitIds,
    completedVisualNovelUnitIds,
    completedEpisodeFinalIds,
  };

  // 모든 잠김은 mapItemStatus에서 파생합니다. default 없는 switch로 새 종류의 누락을 잡습니다.
  const renderMapItem = (
    item: JourneyMapItem,
    sectionItems: readonly JourneyMapItem[],
  ): ReactNode => {
    const status = mapItemStatus(item, sectionItems, progress);
    switch (item.kind) {
      case "episode-intro": {
        return (
          <EpisodeIntroMapItem
            key={item.id}
            id={item.id}
            title={item.title}
            status={status}
            guided={guide.visible && item.id === "tutorial-intro"}
            onSelect={(id) => {
              guide.dismiss();
              onStartEpisodeIntroUnit(id);
            }}
          />
        );
      }
      case "messenger": {
        return (
          <MessengerMapItem
            key={item.id}
            id={item.id}
            title={item.title}
            status={status}
            onSelect={onStartMessengerUnit}
          />
        );
      }
      case "phone-call": {
        return (
          <PhoneCallMapItem
            key={item.id}
            id={item.id}
            title={item.title}
            status={status}
            onSelect={onStartPhoneCallUnit}
          />
        );
      }
      case "visual-novel": {
        return (
          <VisualNovelMapItem
            key={item.id}
            id={item.id}
            title={item.title}
            status={status}
            onSelect={onStartVisualNovelUnit}
          />
        );
      }
      case "episode-final": {
        return (
          <EpisodeFinalMapItem
            key={item.id}
            id={item.id}
            title={item.title}
            status={status}
            onSelect={onStartEpisodeFinal}
          />
        );
      }
      case "standard": {
        return (
          <JourneyStepNode
            key={item.step.id}
            id={item.step.id}
            title={item.step.title}
            /* 표지 미완료면 `locked`로 덮는 한 겹이 앞에 붙습니다 — 그 아래는 씨앗이
               남긴 완료가 **지워진 것이 아니라 가려진 것**이고, 표지를 끝내면 그대로
               드러납니다(spec §2.9). */
            status={
              status === "locked"
                ? "locked"
                : stepStatusAt(journeyStepOrdinal(item.step.id) - 1, completedStepCount)
            }
            onSelect={handleSelectStep}
          />
        );
      }
    }
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
        bindscroll={handleMapScroll}
        enable-scroll={guide.visible ? false : undefined}
      >
        <view
          className="journey-map-screen-map"
          data-testid="journey-map-screen-map"
          accessibility-elements-hidden={openStep !== undefined}
        >
          {journeyMapSections.map((section) =>
            // 에피소드 하나가 헤더 + 유닛 줄입니다. 조각(Fragment)이 아니라 상자로
            // 감쌉니다 — 유닛 사이 간격은 맵이 주지만 에피소드 사이는 더 벌어져야 하고,
            // 그 간격을 이 상자가 집니다.
            // 준비 중 에피소드는 머리만 읽히고 그 아래가 가려집니다 — 줄에 세울 항목이
            // 없으므로 구획을 통째로 다른 조각이 그립니다.
            section.episode.kind === "pending" ? (
              <EpisodePendingSection key={section.episode.id} episode={section.episode} />
            ) : (
              <view
                id={episodeSectionId(section.episode.id)}
                className="journey-map-screen-episode"
                key={section.episode.id}
              >
                {section.items.map((item) => (
                  <view
                    key={item.kind === "standard" ? item.step.id : item.id}
                    accessibility-elements-hidden={
                      guide.visible &&
                      !(item.kind === "episode-intro" && item.id === "tutorial-intro")
                    }
                  >
                    {renderMapItem(item, section.items)}
                  </view>
                ))}
              </view>
            ),
          )}
        </view>
      </scroll-view>
      {/* [겹침 레이어] 머리 카드입니다 — **스크롤 밖에 하나만** 섭니다. 구획마다 두고
          `position: sticky`로 달라붙이면 Lynx에서 첫 카드가 풀리지 않아 경계를 넘어도
          내용이 안 바뀝니다(`useCurrentEpisode`의 주석). 여기 두면 언제나 같은 자리에
          서고, 무엇을 말할지는 스크롤 자리가 고릅니다. */}
      {guide.visible ? (
        <view
          className="first-unit-map-scrim"
          data-testid="first-unit-guide-map"
          catchtap={guide.dismiss}
        >
          <Overlay scope="area" />
        </view>
      ) : null}
      <view className="journey-map-screen-episode-header">
        {headerSection?.episode.kind === "pending" ? (
          <view className="episode-pending-card">
            <text className="episode-pending-card-label">{headerSection.episode.label}</text>
            <text className="episode-pending-card-title">{headerSection.episode.title}</text>
          </view>
        ) : headerSection === undefined ? null : (
          <EpisodeHeader
            episodeLabel={headerSection.episode.label}
            title={headerSection.episode.title}
            completedUnitCount={completedMapItemCount(headerSection.items, progress)}
            totalUnitCount={headerSection.items.length}
          />
        )}
      </view>

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
