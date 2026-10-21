import { Overlay } from "@libitums/ui-lynx/overlay";
import { useFirstUnitGuide } from "../../components/first-unit-guide";
import "../../components/first-unit-guide.css";
import { useMemo, useRef, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";
import type { ScrollEvent } from "@lynx-js/types";

import { JourneyMapBody } from "./JourneyMapBody";
import type { JourneyMapBodyHandlers } from "./JourneyMapBody";
import { JourneyMapHeaderSlot } from "./JourneyMapHeaderSlot";
import { StepSheet } from "./StepSheet";
import { CatalogUnitSheet } from "./CatalogUnitSheet";
import { catalogSheetKey, catalogSheetTargetOf, catalogSheetUnitSize } from "./catalog-sheet";
import { screenId, scrollId } from "./journey-map-scroll";
import { mapTopLayout } from "./journey-map-insets";
import { noCatalogMapSections } from "./catalog-map";
import { mapScrollTargetOf } from "./journey-map-next-unit";
import { useAutoScrollToNext } from "./useAutoScrollToNext";
import { useMapGlide } from "./use-map-glide";
import { rememberedMapScroll, rememberMapScroll } from "./journey-map-scroll-memory";
import { useStepSheet } from "./useStepSheet";
import { lightStatusBarIcons } from "../../lib/status-bar-icons";
import { useLayerBack } from "../../lib/use-back-handler";
import { useScreenLayer } from "../../lib/use-screen-layer";
import {
  findStep,
  journeySteps,
  stepSheetFiguresFor,
  journeyMapSections,
  type JourneyStepId,
} from "./journey-map";
import type { MessengerUnitId } from "../messenger/messenger.contract";
import type { PhoneCallUnitId } from "../phone-call/phone-call.contract";
import type { VisualNovelUnitId } from "../visual-novel/visual-novel.contract";
import type { EpisodeFinalUnitId } from "../episode-final/episode-final.contract";
import type { EpisodeIntroUnitId } from "../episode-intro/episode-intro.contract";
import type { JourneyMapCatalogProps } from "./catalog-map.contract";
import { knownProgressLoad, nodeAccessOf } from "./journey-map-load";
import { journeyStepOrdinal } from "./journey-map-progress";
import type { JourneyMapProgressLoad } from "./journey-map-load.contract";

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
  /** 카탈로그 구획 슬롯입니다. 없으면 튜토리얼만 있는 맵입니다. */
  readonly catalog?: JourneyMapCatalogProps;
  /**
   * 위 안전 영역(상태 표시줄) 높이입니다. ⟨2026-10-19⟩ 맵은 상태 표시줄 뒤까지 스크롤하고 셸은 여정 맵에서 위 여백을
   * 잡지 않으므로, 맵이 이 높이만큼 첫 내용 · 띠 · 로딩 줄을 내립니다(`mapTopLayout`). 없으면 0입니다.
   */
  readonly statusBarInset?: number;
  readonly progressLoad?: JourneyMapProgressLoad;
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
  catalog,
  progressLoad = knownProgressLoad,
  statusBarInset = 0,
}: JourneyMapScreenProps): ReactNode {
  const guide = useFirstUnitGuide("map");
  // 스크롤 상자가 화면 맨 위(상태 표시줄 뒤)에서 시작하도록 화면 위 여백을 스크롤 안쪽으로 옮기고, 위 모서리
  // 기준의 띠 · 로딩 줄은 상태 표시줄 높이만큼 내립니다.
  const top = mapTopLayout(statusBarInset);
  // 이 실행에서 맵을 연 적이 있으면 그 자리에서 엽니다(마운트 때 한 번 읽습니다).
  const [restoredScrollTop] = useState(rememberedMapScroll);
  const glider = useMapGlide();
  const {
    sheetState,
    sheetTop,
    sheetCaretOffset,
    handleScroll,
    handleSelectStep,
    handleCloseSheet,
  } = useStepSheet();

  // 말풍선은 튜토리얼 스텝에도, 카탈로그 유닛에도 섭니다 — 같은 상태 자리를 키로 가릅니다.
  const openCatalog = catalogSheetTargetOf(sheetState.openStepId);
  const openStep =
    sheetState.openStepId === null || openCatalog !== null
      ? undefined
      : findStep(journeySteps, sheetState.openStepId as JourneyStepId);
  const sheetOpen = openStep !== undefined || (openCatalog !== null && catalog !== undefined);
  // 말풍선이 열린 동안 셸의 전역 머리(칩 · 알림 버튼)도 가려야 합니다 — 전에는 머리가 이
  // 화면 안에 있어 아래 맵 가림과 함께 가렸습니다.
  useScreenLayer(sheetOpen || guide.visible, onLayerChange);
  // 시스템 뒤로가기: 첫 유닛 안내 가림막이 떠 있으면 안내만 넘깁니다(스텝 말풍선은 `StepSheet`가 등록합니다).
  useLayerBack(guide.visible ? guide.dismiss : null);

  // 진행의 출처 여섯을 한 묶음으로 모읍니다 — 에피소드마다 따로 넘기면 하나를 빠뜨립니다.
  // 참조를 지킵니다 — 맵 본문(`JourneyMapBody`)이 이 값이 같으면 스크롤 프레임마다 다시 그리지 않습니다.
  const progress = useMemo(
    () => ({
      completedStepCount,
      completedEpisodeIntroIds,
      completedMessengerUnitIds,
      completedPhoneCallUnitIds,
      completedVisualNovelUnitIds,
      completedEpisodeFinalIds,
    }),
    [
      completedStepCount,
      completedEpisodeIntroIds,
      completedMessengerUnitIds,
      completedPhoneCallUnitIds,
      completedVisualNovelUnitIds,
      completedEpisodeFinalIds,
    ],
  );

  // 다음에 풀 유닛으로 맵이 서자마자 스스로 스크롤합니다. 말풍선이 열려 있거나 첫 유닛 가이드가
  // 떠 있으면 옮기지 않고 이 마운트에서 잠급니다.
  const autoScroll = useAutoScrollToNext({
    target: mapScrollTargetOf({
      catalogSections: catalog?.sections ?? noCatalogMapSections,
      gate: {
        legacyTutorialPassed: completedEpisodeFinalIds.includes("tutorial-final-test"),
        progress: catalog?.progress ?? {},
      },
    }),
    blocked: sheetOpen || guide.visible,
    restoredScrollTop,
    glider,
  });

  // 스크롤 한 번에 둘이 답합니다 — 말풍선 자리 · 자동 스크롤의 잠금입니다. 인라인
  // 화살표로 묶으면 `"background only"`가 중첩돼 바인딩이 서지 않습니다.
  const handleMapScroll = (event: ScrollEvent) => {
    "background only";
    rememberMapScroll(event.detail.scrollTop);
    handleScroll(event);
    autoScroll.handleScroll(event);
  };

  // 카탈로그 노드의 탭 핸들러(`"background only"`)가 부릅니다 — 여기에 지시문을 다시 두지 않습니다.
  const handleSelectCatalogUnit = (episodeId: string, unitKey: string, tapY: number) =>
    handleSelectStep(
      catalogSheetKey(episodeId, unitKey),
      tapY,
      catalogSheetUnitSize(catalog?.sections ?? noCatalogMapSections, episodeId, unitKey),
    );

  const access = nodeAccessOf(progressLoad);
  // 본문이 부르는 동작은 렌더마다 최신으로 갈아 끼우는 ref로 넘깁니다 — 함수가 새로 만들어져도 본문은 다시 그리지 않습니다.
  const bodyHandlers = useRef<JourneyMapBodyHandlers>(null as unknown as JourneyMapBodyHandlers);
  bodyHandlers.current = {
    onSelectStep: handleSelectStep,
    onStartEpisodeIntroUnit,
    onStartMessengerUnit,
    onStartPhoneCallUnit,
    onStartVisualNovelUnit,
    onStartEpisodeFinal,
    onSelectCatalogUnit: handleSelectCatalogUnit,
    dismissGuide: guide.dismiss,
  };

  return (
    <view
      id={screenId}
      className="journey-map-screen"
      data-testid="journey-map-screen"
      style={{ paddingTop: `${top.screenPaddingTop}px` }}
    >
      {/* 머리(칩 · 알림 버튼)는 이 화면이 아니라 전역 레이아웃이 집니다(`app/AppHeader`).
          머리는 이 화면 위에 겹치고, 그 몫의 위 여백은 맵 상자가 잡습니다. */}
      {/* [흐름] 내용 슬롯 — 스크롤 컨테이너 하나가 맵 컨테이너를 감쌉니다. 가림
          속성(`accessibility-elements-hidden`)은 맵 컨테이너에 그대로 남습니다 —
          스크롤 컨테이너로 올리면 가리는 범위가 넓어집니다. `scroll-orientation`은
          적습니다 — 안 적으면 초기값이 가로라 세로 스크롤이 원리적으로 불가능합니다.
          스크롤 바는 `scroll-bar-enable={false}`로 끕니다. accessibility-*를 붙이지 않습니다. */}
      <scroll-view
        id={scrollId}
        className="journey-map-screen-scroll"
        data-testid="journey-map-screen-scroll"
        scroll-orientation="vertical"
        scroll-bar-enable={false}
        main-thread:ref={glider.scrollRef}
        bindscroll={handleMapScroll}
        initial-scroll-offset={restoredScrollTop ?? undefined}
        enable-scroll={guide.visible ? false : undefined}
      >
        <view
          className="journey-map-screen-map"
          data-testid="journey-map-screen-map"
          style={{ paddingTop: `${top.mapPaddingTop}px` }}
          accessibility-elements-hidden={sheetOpen}
          bindtouchstart={autoScroll.handleTouchStart}
        >
          <JourneyMapBody
            progress={progress}
            access={access}
            guideVisible={guide.visible}
            catalog={catalog}
            completedEpisodeFinalIds={completedEpisodeFinalIds}
            handlers={bodyHandlers}
          />
        </view>
      </scroll-view>
      {/* [겹침 레이어] 머리 띠입니다 — 스텝 말풍선이 열린 동안만 **스크롤 밖에** 섭니다(구획마다
          `position: sticky`로 두면 Lynx에서 첫 카드가 풀리지 않습니다). */}
      {guide.visible ? (
        <view
          className="first-unit-map-scrim"
          data-testid="first-unit-guide-map"
          data-statusbar={lightStatusBarIcons}
          catchtap={guide.dismiss}
        >
          <Overlay scope="area" />
        </view>
      ) : null}
      <JourneyMapHeaderSlot
        tutorialSections={journeyMapSections}
        progress={progress}
        load={progressLoad}
        bandTop={top.bandTop}
        progressRowTop={top.progressRowTop}
        obscured={sheetOpen || guide.visible}
        openStepId={sheetState.openStepId}
        catalogSections={catalog?.sections}
        catalogProgress={catalog?.progress}
      />

      {/* [겹침 레이어] 스크롤 밖, 화면 루트의 직계 자식입니다. */}
      {openStep === undefined ? null : (
        <StepSheet
          title={openStep.title}
          /* 잰 자리에 그 뒤의 스크롤 변화량을 더합니다 — 유닛이 가운데로 옮겨 가는
             동안 말풍선이 그 유닛에 붙어 함께 움직입니다. */
          top={sheetTop}
          caretOffset={sheetCaretOffset}
          {...stepSheetFiguresFor(openStep.id, completedStepCount)}
          /* 끝낸 스텝은 다시 하기라 티켓을 쓰지 않습니다(시안 E3 — 새 레슨에만 태그). */
          ticketCost={journeyStepOrdinal(openStep.id) - 1 < completedStepCount ? 0 : 1}
          /* `시작`의 목적지는 이 화면이 정하지 않습니다 — 열린 스텝의 id를 그대로
             위로 올립니다. 화면 전환은 `App`의 것입니다. */
          onStart={() => onStartStep(openStep.id)}
          onClose={handleCloseSheet}
        />
      )}
      {openCatalog === null || catalog === undefined ? null : (
        <CatalogUnitSheet
          target={openCatalog}
          catalog={catalog}
          top={sheetTop}
          caretOffset={sheetCaretOffset}
          onClose={handleCloseSheet}
        />
      )}
    </view>
  );
}
