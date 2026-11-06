import { useCallback, useEffect, useRef, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import {
  isDownloadAllowed,
  loadAllowedEpisodes,
  loadMobileDataPolicy,
} from "../lib/download-policy";
import type { CatalogProgress } from "../lib/catalog-progress";
import { episodeOpenGate } from "../lib/episode-open-gate";
import { catalogFreshness, type CatalogFreshness } from "../lib/manifest-check";
import { readNetworkProperties } from "../lib/network-status";
import { TUTORIAL_EPISODE_ID } from "../lib/tutorial-episode";
import { AllClearedSheet } from "../screens/download-sheet/AllClearedSheet";
import { catalogAllCleared } from "../screens/journey-map/catalog-all-cleared";
import type {
  DownloadSheetState,
  DownloadSheetTarget,
} from "../screens/download-sheet/download-sheet.contract";
import type { CatalogMapSection } from "../screens/journey-map/catalog-map.contract";
import { DownloadGateLayer, type OpenDownloadSheet } from "./download-gate-layer";
import {
  assetTargetOf,
  downloadSheetUnitOf,
  type DownloadGateTarget,
} from "./download-gate-target";
import { allClearedNoticeStep, type AllClearedNoticeState } from "./all-cleared-notice";
import type { DownloadControls } from "./download-wiring";
import type { ScreenWiring } from "./screen-wiring";

/** 에피소드를 열기 전 받기 판정 — `open`이 `null`이면 열 수 없는 편(받는 중인 「준비 중」 카드)입니다. */
export type DownloadGuard = (target: DownloadGateTarget, open: (() => void) | null) => void;

type OpenSheet =
  | ({ readonly kind: "download" } & OpenDownloadSheet)
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
  /** 「설정 바꾸기」 — 설정 탭 루트로 간 뒤 설정 › 다운로드를 쌓습니다. */
  nav: { readonly openDownloadSettings: () => void },
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
    (target, open) => {
      "background only";
      if (controls === undefined) {
        open?.();
        return;
      }
      const episodeId = target.episodeId;
      const assetTarget = assetTargetOf(target);
      const gate = episodeOpenGate({
        assetsComplete: controls.assetsComplete(episodeId, assetTarget),
        isTutorial: episodeId === TUTORIAL_EPISODE_ID,
        network: readNetworkProperties(),
        policy: loadMobileDataPolicy(),
        allowed: isDownloadAllowed(loadAllowedEpisodes(), episodeId, assetTarget),
      });
      if (gate === "open") {
        open?.();
        return;
      }
      const ordinal = sections.find((section) => section.episodeId === episodeId)?.ordinal ?? 0;
      const sheetTarget: DownloadSheetTarget =
        target.kind === "episode"
          ? { kind: "episode", ordinal, sizeBytes: controls.assetsBytes(episodeId) }
          : {
              kind: "unit",
              ordinal,
              unit: downloadSheetUnitOf(sections, episodeId, target.unitKey),
            };
      const commonDone = controls.assetsComplete(episodeId, { kind: "common" });
      const state: DownloadSheetState =
        gate === "ask"
          ? { kind: "ask", target: sheetTarget, commonDone }
          : gate === "wifi-only"
            ? { kind: "wifi-only", target: sheetTarget, commonDone }
            : { kind: "offline", target: sheetTarget, canOpenAnyway: open !== null };
      setSheet({ kind: "download", state, target, open });
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
      <DownloadGateLayer sheet={sheet} controls={controls} nav={nav} close={() => setSheet(null)} />
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
      guard({ kind: "episode", episodeId }, () => wiring.onStartCatalogCover(episodeId));
    },
    onStartCatalogUnit: (episodeId, unitKey, source) => {
      "background only";
      guard({ kind: "unit", episodeId, unitKey }, () => {
        if (source === undefined) wiring.onStartCatalogUnit(episodeId, unitKey);
        else wiring.onStartCatalogUnit(episodeId, unitKey, source);
      });
    },
    onTapPendingEpisode: (episodeId) => {
      "background only";
      guard({ kind: "episode", episodeId }, null);
    },
  };
}
