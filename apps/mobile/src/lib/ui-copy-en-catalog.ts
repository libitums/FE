// 영어 문구표 구획 — 카탈로그 맵 · 표지 컷.

import type { CatalogCoverCopy } from "../screens/catalog-cover/catalog-cover.contract";
import type { CatalogMapCopy } from "../screens/journey-map/catalog-map.contract";

const unavailableTail = {
  pending: "coming soon",
  update: "update the app to open",
  unavailable: "not available",
} as const;

export const catalogMapEn: CatalogMapCopy = {
  episodeLabel: (ordinal) => `Episode ${ordinal}.`,
  coverTitle: "Episode intro",
  lessonTitle: (ordinal) => `Lesson ${ordinal}`,
  finalTitle: "Final test",
  preparing: (title) => `${title}, coming soon`,
  caption: {
    pending: "COMING SOON",
    update: "UPDATE REQUIRED",
    unavailable: "NOT AVAILABLE",
  },
  unavailableSection: (label, title, kind) => `${label} ${title}, ${unavailableTail[kind]}`,
};

export const catalogCoverEn: CatalogCoverCopy = {
  toggleScript: {
    en: "Show romanization",
    roman: "Show English",
  },
  nextCut: (ordinal, total) => `Next scene, ${ordinal} of ${total}`,
  finishCover: "Finish intro",
  thinking: "thinking",
};
