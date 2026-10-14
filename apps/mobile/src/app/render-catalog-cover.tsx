// `catalog-cover` route를 표지 → 컷 → 시작 배너 흐름으로 옮깁니다.

import type { ReactNode } from "@lynx-js/react";

import { CatalogCoverFlow } from "./CatalogCutsFlow";
import { catalogCoverModelOf } from "./catalog-cover-wiring";
import type { Screen } from "./nav-state";
import type { ScreenWiring } from "./screen-wiring";

export function renderCatalogCover(
  screen: Extract<Screen, { name: "catalog-cover" }>,
  wiring: ScreenWiring,
): ReactNode {
  const { episodeId } = screen;
  const model = catalogCoverModelOf(
    wiring.episodeContent,
    wiring.catalogSections,
    episodeId,
    wiring.learnerFill,
  );
  // 시작 가드와 세션 병합이 이 경우를 막으므로 여기 닿으면 결함입니다 — 에러 경계가 받습니다.
  if (model === null) {
    throw new Error(`Catalog cover has no playable cuts: ${episodeId}`);
  }
  return (
    <CatalogCoverFlow
      key={`${episodeId}:${model.version}`}
      insets={wiring.safeAreaInsets}
      ordinal={model.ordinal}
      title={model.title}
      cuts={model.cuts}
      onSkip={() => wiring.onSkipCatalogCover(episodeId)}
      onContinue={() => wiring.onContinueCatalogCover(episodeId)}
      onExit={(stage) => wiring.onExitCatalogCover(episodeId, stage)}
      onCutsDone={() => wiring.onFinishCatalogCoverCuts(episodeId)}
      onClose={wiring.onCloseCatalogCover}
    />
  );
}
