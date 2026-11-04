import { useCallback, useEffect, useRef, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import {
  allowEpisodes,
  loadAllowedEpisodes,
  loadMobileDataPolicy,
  saveMobileDataPolicy,
} from "../lib/download-policy";
import type { CatalogProgress } from "../lib/catalog-progress";
import { episodeOpenGate } from "../lib/episode-open-gate";
import { catalogFreshness, type CatalogFreshness } from "../lib/manifest-check";
import { readNetworkProperties } from "../lib/network-status";
import { TUTORIAL_EPISODE_ID } from "../lib/tutorial-episode";
import { AllClearedSheet } from "../screens/download-sheet/AllClearedSheet";
import { DownloadSheet } from "../screens/download-sheet/DownloadSheet";
import { catalogAllCleared } from "../screens/journey-map/catalog-all-cleared";
import type { DownloadSheetState } from "../screens/download-sheet/download-sheet.contract";
import type { CatalogMapSection } from "../screens/journey-map/catalog-map.contract";
import { allClearedNoticeStep, type AllClearedNoticeState } from "./all-cleared-notice";
import type { DownloadControls } from "./download-wiring";
import type { ScreenWiring } from "./screen-wiring";

/** 에피소드를 열기 전 받기 판정 — `open`이 `null`이면 열 수 없는 편(받는 중인 「준비 중」 카드)입니다. */
export type DownloadGuard = (episodeId: string, open: (() => void) | null) => void;

type OpenSheet =
  | {
      readonly kind: "download";
      readonly state: DownloadSheetState;
      readonly episodeId: string;
      readonly open: (() => void) | null;
    }
  | { readonly kind: "all-cleared" };

export type DownloadGate = {
  readonly guard: DownloadGuard;
  readonly layer: ReactNode;
  /** 맨 끝 카드의 목록 확인 신선도(D9). 받기 훅이 없으면 `undefined`(지금 문구 그대로). */
  readonly freshness: CatalogFreshness | undefined;
  /** 맨 끝 카드의 「새 이야기 확인」 — 모두 끝낸 뒤 시트를 엽니다. */
  readonly openAllCleared: () => void;
};

const isOfflineNow = () => readNetworkProperties().network === "offline";

/**
 * 에피소드를 열 때의 받기 문지기(ADR-0095 D6 · D7)입니다. 판정이 `open`이면 곧바로 열고, 아니면 받기 시트를 띄웁니다.
 * 받기 훅이 없으면(테스트 · Explorer) 늘 엽니다 — 받기를 막지 않습니다.
 */
export function useDownloadGate(
  controls: DownloadControls | undefined,
  catalog: {
    readonly catalogSections: readonly CatalogMapSection[];
    readonly catalogProgress: CatalogProgress;
  },
  atMapRoot: boolean,
  /** 진행을 다 읽었는가 — 읽는 동안의 변화를 「끝낸 순간」으로 세지 않습니다. */
  progress: { readonly hasLoadedProgress: boolean },
): DownloadGate {
  const sections = catalog.catalogSections;
  const [sheet, setSheet] = useState<OpenSheet | null>(null);
  const checkedAt = controls?.manifestCheckedAt ?? null;
  const freshness = controls === undefined ? undefined : catalogFreshness(checkedAt, Date.now());

  // 마지막 편을 「끝낸 순간」을 기억했다가 맵 루트에서 한 번 판정합니다(D9, `allClearedNoticeStep`).
  const allCleared = catalogAllCleared(sections, catalog.catalogProgress);
  const loaded = progress.hasLoadedProgress;
  const notice = useRef<AllClearedNoticeState>({ previousCleared: null, pending: false });
  useEffect(() => {
    if (controls === undefined) return;
    const step = allClearedNoticeStep(notice.current, {
      loaded,
      allCleared,
      atMapRoot,
      stale: catalogFreshness(checkedAt, Date.now()).stale,
      offline: isOfflineNow(),
    });
    notice.current = step.state;
    if (step.show) setSheet({ kind: "all-cleared" });
  }, [loaded, allCleared, atMapRoot, controls, checkedAt]);

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
      setSheet({ kind: "download", state, episodeId, open });
    },
    [controls, sections],
  );

  const layer =
    sheet === null ? null : sheet.kind === "all-cleared" ? (
      <AllClearedSheet
        daysAgo={freshness?.daysAgo ?? null}
        isOffline={isOfflineNow}
        onCheckNow={() => {
          controls?.requestSync();
          setSheet(null);
        }}
        onLater={() => setSheet(null)}
      />
    ) : (
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
  const openAllCleared = useCallback(() => setSheet({ kind: "all-cleared" }), []);
  return { guard, layer, freshness, openAllCleared };
}

// 화면 결선의 카탈로그 시작에 받기 문지기를 겹칩니다. 티켓 문지기 바깥에 둡니다 — 받지 않기로 하면 티켓을 쓰지 않습니다.
// 표지 · 유닛 시작과 받는 중인 「준비 중」 카드가 같은 문지기를 지납니다.
export function withDownloadGate<W extends ScreenWiring>(wiring: W, gate: DownloadGate): W {
  const { guard } = gate;
  return {
    ...wiring,
    ...(gate.freshness === undefined ? {} : { catalogFreshness: gate.freshness }),
    onCheckNewStories: gate.openAllCleared,
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
