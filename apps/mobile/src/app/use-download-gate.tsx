import { useCallback, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import {
  allowEpisodes,
  loadAllowedEpisodes,
  loadMobileDataPolicy,
  saveMobileDataPolicy,
} from "../lib/download-policy";
import { episodeOpenGate } from "../lib/episode-open-gate";
import { readNetworkProperties } from "../lib/network-status";
import { TUTORIAL_EPISODE_ID } from "../lib/tutorial-episode";
import { DownloadSheet } from "../screens/download-sheet/DownloadSheet";
import type { DownloadSheetState } from "../screens/download-sheet/download-sheet.contract";
import type { CatalogMapSection } from "../screens/journey-map/catalog-map.contract";
import type { DownloadControls } from "./download-wiring";
import type { ScreenWiring } from "./screen-wiring";

/** 에피소드를 열기 전 받기 판정 — `open`이 `null`이면 열 수 없는 편(받는 중인 「준비 중」 카드)입니다. */
export type DownloadGuard = (episodeId: string, open: (() => void) | null) => void;

type OpenSheet = {
  readonly state: DownloadSheetState;
  readonly episodeId: string;
  readonly open: (() => void) | null;
};

/**
 * 에피소드를 열 때의 받기 문지기(ADR-0095 D6 · D7)입니다. 판정이 `open`이면 곧바로 열고, 아니면 받기 시트를 띄웁니다.
 * 받기 훅이 없으면(테스트 · Explorer) 늘 엽니다 — 받기를 막지 않습니다.
 */
export function useDownloadGate(
  controls: DownloadControls | undefined,
  sections: readonly CatalogMapSection[],
): { readonly guard: DownloadGuard; readonly layer: ReactNode } {
  const [sheet, setSheet] = useState<OpenSheet | null>(null);

  const guard = useCallback<DownloadGuard>(
    (episodeId, open) => {
      "background only";
      if (controls === undefined) {
        open?.();
        return;
      }
      const gate = episodeOpenGate({
        assetsComplete: controls.assetsComplete(episodeId),
        isTutorial: episodeId === TUTORIAL_EPISODE_ID,
        network: readNetworkProperties(),
        policy: loadMobileDataPolicy(),
        allowed: loadAllowedEpisodes().has(episodeId),
      });
      if (gate === "open") {
        open?.();
        return;
      }
      const ordinal = sections.find((section) => section.episodeId === episodeId)?.ordinal ?? 0;
      const state: DownloadSheetState =
        gate === "ask"
          ? { kind: "ask", ordinal, sizeBytes: controls.assetsBytes(episodeId) }
          : gate === "wifi-only"
            ? { kind: "wifi-only", ordinal }
            : { kind: "offline", ordinal, canOpenAnyway: open !== null };
      setSheet({ state, episodeId, open });
    },
    [controls, sections],
  );

  const layer =
    sheet === null ? null : (
      <DownloadSheet
        state={sheet.state}
        onDownloadNow={(dontAskAgain) => {
          allowEpisodes([sheet.episodeId]);
          if (dontAskAgain) saveMobileDataPolicy("always");
          controls?.requestSync();
          setSheet(null);
          // 열린 편은 받는 동안 엽니다 — 받는 대로 그림 · 소리가 채워집니다. 「준비 중」 편은 다 받으면 맵에 열립니다.
          sheet.open?.();
        }}
        onWifiLater={(dontAskAgain) => {
          if (dontAskAgain) saveMobileDataPolicy("wifi-only");
          setSheet(null);
        }}
        onOpenAnyway={() => {
          setSheet(null);
          sheet.open?.();
        }}
        onClose={() => setSheet(null)}
      />
    );
  return { guard, layer };
}

// 화면 결선의 카탈로그 시작에 받기 문지기를 겹칩니다. 티켓 문지기 바깥에 둡니다 — 받지 않기로 하면 티켓을 쓰지 않습니다.
// 표지 · 유닛 시작과 받는 중인 「준비 중」 카드가 같은 문지기를 지납니다.
export function withDownloadGate<W extends ScreenWiring>(wiring: W, guard: DownloadGuard): W {
  return {
    ...wiring,
    onStartCatalogCover: (episodeId) => {
      "background only";
      guard(episodeId, () => wiring.onStartCatalogCover(episodeId));
    },
    onStartCatalogUnit: (episodeId, unitKey, source) => {
      "background only";
      guard(episodeId, () => {
        if (source === undefined) wiring.onStartCatalogUnit(episodeId, unitKey);
        else wiring.onStartCatalogUnit(episodeId, unitKey, source);
      });
    },
    onTapPendingEpisode: (episodeId) => {
      "background only";
      guard(episodeId, null);
    },
  };
}
