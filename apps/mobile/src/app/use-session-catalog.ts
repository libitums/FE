// `AppSession`에서 떼어 낸 카탈로그 파생입니다(ADR-0111 — 300줄 분할). 동작은 그대로입니다.

import { useMemo } from "@lynx-js/react";

import type { EntryLanguage } from "../lib/entry-language";
import { localizeCatalog } from "../lib/episode-localize";
import { catalogMapSectionsOf } from "../screens/journey-map/catalog-map";
import type { CatalogMapSection } from "../screens/journey-map/catalog-map.contract";
import type { EpisodeContent } from "./episode-content";

export type SessionCatalog = {
  readonly episodeContent: EpisodeContent;
  readonly catalogSections: readonly CatalogMapSection[];
};

export function useSessionCatalog(
  sourceContent: EpisodeContent,
  entryLanguage: EntryLanguage,
): SessionCatalog {
  // 콘텐츠의 영어 칸을 UI 언어 번역으로 바꾼 판입니다(ADR-0091 D2).
  const episodeContent = useMemo(
    () => ({ ...sourceContent, catalog: localizeCatalog(sourceContent.catalog, entryLanguage) }),
    [sourceContent, entryLanguage],
  );
  // 카탈로그 구획은 카탈로그가 바뀔 때만 새로 만듭니다.
  const catalogSections = useMemo(
    () => catalogMapSectionsOf(episodeContent.catalog),
    [episodeContent.catalog],
  );
  return { episodeContent, catalogSections };
}
