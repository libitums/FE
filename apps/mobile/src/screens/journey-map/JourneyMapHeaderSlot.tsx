import type { ReactNode } from "@lynx-js/react";

import { CatalogEpisodeHeader } from "./CatalogEpisodeHeader";
import { JourneyMapEpisodeHeader } from "./JourneyMapEpisodeHeader";
import type { JourneyMapHeaderSlotProps } from "./catalog-map.contract";

// 스크롤 자리 index로 튜토리얼/카탈로그 머리 중 하나를 고릅니다. index는 튜토리얼 구획 뒤에 카탈로그
// 구획을 이어 센 자리입니다 — 튜토리얼 자리면 지금 머리 그대로, 그 뒤면 카탈로그 머리, 어느 쪽도 못
// 찾으면 첫 튜토리얼 구획입니다.
export function JourneyMapHeaderSlot({
  index,
  tutorialSections,
  progress,
  catalog,
}: JourneyMapHeaderSlotProps): ReactNode {
  const catalogSection =
    index < tutorialSections.length
      ? undefined
      : catalog?.sections[index - tutorialSections.length];

  if (catalog !== undefined && catalogSection !== undefined) {
    return <CatalogEpisodeHeader section={catalogSection} progress={catalog.progress} />;
  }
  return (
    <JourneyMapEpisodeHeader
      section={tutorialSections[index] ?? tutorialSections[0]}
      progress={progress}
    />
  );
}
