import { Overlay } from "@libitums/ui-lynx/overlay";
import { useFirstUnitGuide } from "../../components/first-unit-guide";
import "../../components/first-unit-guide.css";
import { useRef, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";
import type { ScrollEvent } from "@lynx-js/types";

import { JourneyMapBody } from "./JourneyMapBody";
import type { JourneyMapBodyHandlers } from "./JourneyMapBody";
import { JourneyMapHeaderSlot } from "./JourneyMapHeaderSlot";
import { CatalogUnitSheet } from "./CatalogUnitSheet";
import { catalogSheetKey, catalogSheetTargetOf, catalogSheetUnitSize } from "./catalog-sheet";
import { mapGuideTargetOf } from "./catalog-gate";
import { screenId, scrollId } from "./journey-map-scroll";
import { mapTopLayout } from "./journey-map-insets";
import { mapScrollTargetOf } from "./journey-map-next-unit";
import { useAutoScrollToNext } from "./useAutoScrollToNext";
import { useMapGlide } from "./use-map-glide";
import { rememberedMapScroll, rememberMapScroll } from "./journey-map-scroll-memory";
import { useStepSheet } from "./useStepSheet";
import { lightStatusBarIcons } from "../../lib/status-bar-icons";
import { useLayerBack } from "../../lib/use-back-handler";
import { useScreenLayer } from "../../lib/use-screen-layer";
import type { JourneyMapCatalogProps } from "./catalog-map.contract";
import { knownProgressLoad, nodeAccessOf } from "./journey-map-load";
import type { JourneyMapProgressLoad } from "./journey-map-load.contract";

import "./journey-map-screen.css";

export type JourneyMapScreenProps = {
  /** 카탈로그 구획 — 튜토리얼(u00)도 그 하나입니다. 진행은 `App`이 소유하고 props로 내립니다. */
  readonly catalog: JourneyMapCatalogProps;
  /** 말풍선이 열리고 닫힐 때 부릅니다 — 전역 머리를 그 동안 낭독에서 가리는 데 씁니다. */
  readonly onLayerChange?: (open: boolean) => void;
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
  catalog,
  onLayerChange,
  progressLoad = knownProgressLoad,
  statusBarInset = 0,
}: JourneyMapScreenProps): ReactNode {
  // 첫 유닛 안내는 첫 구획이 준비된 튜토리얼일 때만 섭니다 — 대상이 없으면 가림막도 서지 않습니다.
  const guide = useFirstUnitGuide("map", mapGuideTargetOf(catalog.sections) !== null);
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

  const openCatalog = catalogSheetTargetOf(sheetState.openStepId);
  const sheetOpen = openCatalog !== null;
  // 말풍선이 열린 동안 셸의 전역 머리(칩 · 알림 버튼)도 가려야 합니다 — 전에는 머리가 이
  // 화면 안에 있어 아래 맵 가림과 함께 가렸습니다.
  useScreenLayer(sheetOpen || guide.visible, onLayerChange);
  // 시스템 뒤로가기: 첫 유닛 안내 가림막이 떠 있으면 안내만 넘깁니다(말풍선은 `StepSheet`가 등록합니다).
  useLayerBack(guide.visible ? guide.dismiss : null);

  // 다음에 풀 유닛으로 맵이 서자마자 스스로 스크롤합니다. 말풍선이 열려 있거나 첫 유닛 가이드가
  // 떠 있으면 옮기지 않고 이 마운트에서 잠급니다.
  const autoScroll = useAutoScrollToNext({
    target: mapScrollTargetOf({
      catalogSections: catalog.sections,
      gate: { legacyTutorialPassed: catalog.legacyTutorialPassed, progress: catalog.progress },
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
      catalogSheetUnitSize(catalog.sections, episodeId, unitKey),
    );

  const access = nodeAccessOf(progressLoad);
  // 본문이 부르는 동작은 렌더마다 최신으로 갈아 끼우는 ref로 넘깁니다 — 함수가 새로 만들어져도 본문은 다시 그리지 않습니다.
  const bodyHandlers = useRef<JourneyMapBodyHandlers>(null as unknown as JourneyMapBodyHandlers);
  bodyHandlers.current = {
    onStartCover: catalog.onStartCover,
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
            catalog={catalog}
            access={access}
            guideVisible={guide.visible}
            handlers={bodyHandlers}
          />
        </view>
      </scroll-view>
      {/* [겹침 레이어] 머리 띠입니다 — 말풍선이 열린 동안만 **스크롤 밖에** 섭니다(구획마다
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
        load={progressLoad}
        bandTop={top.bandTop}
        progressRowTop={top.progressRowTop}
        obscured={sheetOpen || guide.visible}
        openStepId={sheetState.openStepId}
        catalogSections={catalog.sections}
        catalogProgress={catalog.progress}
      />

      {/* [겹침 레이어] 스크롤 밖, 화면 루트의 직계 자식입니다. */}
      {openCatalog === null ? null : (
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
