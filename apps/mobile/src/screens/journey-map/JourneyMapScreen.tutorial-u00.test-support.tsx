import type { ReactNode } from "@lynx-js/react";
import { vi } from "vitest";

import { bundledCatalogInput } from "../../lib/episode-bundled";
import { buildEpisodeCatalog } from "../../lib/episode-catalog";
import type { CatalogProgress } from "../../lib/catalog-progress";
import { JourneyMapScreen } from "./JourneyMapScreen";
import { catalogMapSectionsOf } from "./catalog-map";
import type { CatalogMapSection, JourneyMapCatalogProps } from "./catalog-map.contract";

// 튜토리얼(u00) 맵 ui 테스트의 공용 대역입니다 — 카탈로그만 있는 맵을 실제 내장 카탈로그로 세웁니다.
// 화면 props는 느슨한 모양으로 좁혀 부릅니다: 옛 튜토리얼 props를 함께 넘겨 구현 상태와 무관하게 렌더되고, 옛
// props가 없는 구현에서는 무시됩니다.

/** 실제 내장 카탈로그에서 낸 구획 — 첫째가 u00-tutorial입니다. */
export const realSections: readonly CatalogMapSection[] = catalogMapSectionsOf(
  buildEpisodeCatalog({ bundled: bundledCatalogInput, cache: { manifest: null, episodes: {} } }),
);

export type U00CatalogOptions = {
  readonly sections?: readonly CatalogMapSection[];
  readonly progress?: CatalogProgress;
  readonly legacyTutorialPassed?: boolean;
  readonly onStartCover?: (episodeId: string) => void;
  readonly onStartUnit?: (episodeId: string, unitKey: string) => void;
};

/** `JourneyMapCatalogProps`(필드: sections · progress · legacyTutorialPassed · onStartCover · onStartUnit). */
export function u00Catalog(options: U00CatalogOptions = {}): JourneyMapCatalogProps {
  return {
    sections: options.sections ?? realSections,
    progress: options.progress ?? {},
    legacyTutorialPassed: options.legacyTutorialPassed ?? false,
    onStartCover: options.onStartCover ?? vi.fn<(episodeId: string) => void>(),
    onStartUnit: options.onStartUnit ?? vi.fn<(episodeId: string, unitKey: string) => void>(),
  } as unknown as JourneyMapCatalogProps;
}

const legacyTutorialProps = {
  completedStepCount: 0,
  completedEpisodeIntroIds: [],
  completedMessengerUnitIds: [],
  completedPhoneCallUnitIds: [],
  completedVisualNovelUnitIds: [],
  completedEpisodeFinalIds: [],
  onStartStep: () => {},
  onStartEpisodeIntroUnit: () => {},
  onStartMessengerUnit: () => {},
  onStartPhoneCallUnit: () => {},
  onStartVisualNovelUnit: () => {},
  onStartEpisodeFinal: () => {},
};

type LooseScreenProps = { readonly catalog: JourneyMapCatalogProps } & Record<string, unknown>;
const LooseScreen = JourneyMapScreen as unknown as (props: LooseScreenProps) => ReactNode;

/** 카탈로그만 있는 맵 화면입니다. */
export function u00Screen(catalog: JourneyMapCatalogProps, extra: Record<string, unknown> = {}) {
  return <LooseScreen {...legacyTutorialProps} {...extra} catalog={catalog} />;
}
