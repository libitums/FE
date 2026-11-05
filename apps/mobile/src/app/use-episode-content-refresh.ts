import {
  useCallback,
  useEffect,
  useLynxGlobalEventListener,
  useMemo,
  useRef,
  useState,
} from "@lynx-js/react";

import { refreshAppPolicy } from "../lib/app-policy-refresh";
import { measureTask } from "../lib/perf-probe";
import {
  downloadedAssetBytes,
  episodeAssetsBytes,
  episodeAssetsComplete,
} from "../lib/download-usage";
import {
  assetDownloadAllowed,
  loadAllowedEpisodes,
  loadMobileDataPolicy,
} from "../lib/download-policy";
import { changesAudioTiming, refreshAudioManifest } from "../lib/audio-manifest-refresh";
import { hostContentStore } from "../lib/episode-cache";
import { promoteStagedEpisodes } from "../lib/episode-staging";
import { bundledCatalogInput } from "../lib/episode-bundled";
import { refreshEpisodeCatalog } from "../lib/episode-refresh";
import { fetchContentText } from "../lib/episode-remote";
import { readNetworkProperties } from "../lib/network-status";
import { MANIFEST_CHECKED_AT_KEY, manifestCheckedAtFrom } from "../lib/manifest-check";
import { safeGet, trySet } from "../lib/episode-cache";
import { TUTORIAL_EPISODE_ID } from "../lib/tutorial-episode";
import { loadUiLanguage, onUiLanguageSaved } from "../lib/ui-language";
import type { ContentLanguage } from "../lib/episode-content";
import type { EpisodeIntroEventSink } from "../screens/episode-intro/episode-intro.contract";
import type { SplashUpdatePort } from "../screens/splash/splash.contract";
import { createSyncRunner } from "./content-sync-runner";
import { createDeferredRecheck } from "./deferred-recheck";
import type { SyncRunner } from "./content-sync-runner";
import {
  episodeContentRefreshedEventOf,
  mergeCatalogForSession,
  noEpisodeContent,
  refreshChangesCatalog,
} from "./episode-content";
import type { EpisodeContent } from "./episode-content";
import type { DownloadControls } from "./download-wiring";
import { hostAssetDeps, loadEpisodeContent } from "./episode-content-loader";
import { createSplashUpdateController } from "./splash-update-controller";

/** 호스트가 받기 좋은 때(끊겼던 연결이 돌아옴 · 앱이 포그라운드로 돌아옴)를 알리는 전역 이벤트입니다(ADR-0071). */
export const contentSyncEventName = "contentSyncOpportunity";

/**
 * 받기 정책으로 건너뛴 편이 있을 때 연결을 다시 보는 간격입니다(ADR-0095 D5). 호스트 신호는 모바일 데이터 → Wi-Fi
 * 전환에는 오지 않아(끊김 → 연결만), 앱이 켜져 있는 동안 이 간격으로 요금 없는 연결이 됐는지 봅니다.
 */
export const deferredRecheckIntervalMs = 60_000;

/** 받기 차례마다 한 번 읽는 정책 — 연결 종류 · 저장된 설정 · 허락한 편. 차례 안에서는 같은 값을 씁니다. */
function assetPolicyForRound(): (id: string) => boolean {
  const network = readNetworkProperties();
  const policy = loadMobileDataPolicy();
  const allowed = loadAllowedEpisodes();
  return (episodeId) =>
    assetDownloadAllowed({ network, policy, allowed, episodeId, tutorialId: TUTORIAL_EPISODE_ID });
}

/** 받기 차례마다 지금 UI 언어를 읽습니다 — 영어(원문)면 번역 파일을 받지 않습니다(ADR-0102 D3). */
function translationLanguageForRound(): ContentLanguage | null {
  const language = loadUiLanguage();
  return language === "en" ? null : language;
}

/**
 * 내장 + 기기 캐시에서 카탈로그를 읽고, 서버의 매니페스트로 새 에피소드를 **하나씩**(본문 → 그림 · 음성) 받아
 * 둡니다(App 루트, 세션 key 밖). 받기는 실행 시작과 호스트 신호마다 돌고, 겹치면 한 번으로 모읍니다. 에피소드
 * 하나가 갖춰질 때마다 카탈로그를 다시 읽어 맵에 바로 냅니다 — 이미 열려 있던 본문은 같은 실행 안에서 닫지
 * 않습니다(ADR-0056 D3). 사용자에게 알리지 않고 던지지 않습니다. 분석 이벤트는 실행당 처음 매니페스트를 받은
 * 한 번만 보냅니다(ADR-0029 — 신호마다 세면 같은 실행이 여러 번 셉니다).
 */
export type EpisodeContentRefresh = {
  readonly content: EpisodeContent;
  readonly splash: SplashUpdatePort;
  /**
   * 스플래시가 나간 뒤 갖춰진 바뀐 에피소드가 있으면 0보다 큽니다. 셸이 여정맵 루트(열린 에피소드 화면 없음)에서
   * `applyStaged`를 불러 바로 바꿔 끼웁니다 — 다음 실행까지 미루지 않습니다(ADR-0078 D4 정정).
   */
  readonly stagedReady: number;
  readonly applyStaged: () => void;
  /** 설정 › 다운로드가 쓰는 것 — 받기 차례를 다시 돌리기 · 받은 크기 읽기(ADR-0095 D8). */
  readonly downloads: DownloadControls;
};

export function useEpisodeContentRefresh(sink: EpisodeIntroEventSink): EpisodeContentRefresh {
  const [content, setContent] = useState<EpisodeContent>(noEpisodeContent);
  const [stagedReady, setStagedReady] = useState(0);
  // 목록을 마지막으로 받은 시각(ADR-0095 D9) — 받기 차례가 목록을 받을 때마다 다시 씁니다.
  const [manifestCheckedAt, setManifestCheckedAt] = useState<number | null>(null);
  // 스플래시가 나갔는가 — 그 전에 갖춰진 스테이징은 스플래시의 `close()`가 바꿔 끼웁니다.
  const splashClosed = useRef(false);
  // 받기는 비동기로 늦게 끝납니다 — 그사이 sink가 바뀌면 최신 것으로 보내도록 ref로 읽습니다.
  const sinkRef = useRef(sink);
  useEffect(() => {
    sinkRef.current = sink;
  }, [sink]);
  const reported = useRef(false);
  // 첫 렌더 값은 자리표시 포트입니다 — effect가 컨트롤러를 만들면 진짜 포트로 바뀝니다. 그 전에 스플래시가
  // 나가면(close) 표시만 적어 두었다가 컨트롤러가 창을 닫힌 채 시작하게 합니다.
  const closedEarly = useRef(false);
  const [splash, setSplash] = useState<SplashUpdatePort>(() => ({
    view: { kind: "plain" },
    logoFinished: () => {},
    close: () => {
      closedEarly.current = true;
      splashClosed.current = true;
    },
  }));

  // 실행기는 effect 안에서 만듭니다 — 렌더에서 만들면 그 안의 백그라운드 전용 모듈이 메인 스레드 번들로 끌려옵니다.
  const runner = useRef<SyncRunner | null>(null);

  useEffect(() => {
    const reload = () => {
      const next = loadEpisodeContent();
      setContent((previous) => ({
        ...next,
        catalog: measureTask("catalog.merge", () =>
          mergeCatalogForSession(previous.catalog, next.catalog),
        ),
      }));
    };
    setManifestCheckedAt(manifestCheckedAtFrom(safeGet(hostContentStore, MANIFEST_CHECKED_AT_KEY)));
    const startPromoted = promoteStagedEpisodes(hostContentStore).promoted.length;
    setContent(loadEpisodeContent());
    const controller = createSplashUpdateController({
      now: Date.now,
      startPromoted,
      waitForCheck: hostAssetDeps() !== undefined,
      closedBeforeStart: closedEarly.current ? "yes" : "no",
      onView: (view) => setSplash((previous) => ({ ...previous, view })),
      promote: () => promoteStagedEpisodes(hostContentStore).promoted,
      reload: () => setContent(loadEpisodeContent()),
      send: (event) => sinkRef.current?.(event),
    });
    setSplash({
      view: hostAssetDeps() === undefined ? { kind: "plain" } : { kind: "checking" },
      logoFinished: controller.logoFinished,
      close: () => {
        splashClosed.current = true;
        controller.close();
      },
    });
    let firstRound = true;
    // oxlint-disable-next-line react/immutability
    runner.current = createSyncRunner(async () => {
      const watching = firstRound;
      firstRound = false;
      // 앱 정책(최소 빌드)은 에피소드보다 먼저, 작게 한 번 받습니다 — 스플래시가 나가기 전에 저장소에 있어야
      // 그 실행에서 판정합니다(ADR-0086). 결과는 스플래시가 나가는 순간 저장소에서 읽습니다.
      await refreshAppPolicy({ fetchText: fetchContentText, store: hostContentStore });
      const summary = await refreshEpisodeCatalog({
        fetchText: fetchContentText,
        store: hostContentStore,
        bundled: bundledCatalogInput,
        assets: hostAssetDeps(),
        assetPolicy: assetPolicyForRound(),
        translationLanguage: translationLanguageForRound(),
        onEpisodeReady: reload,
        onEpisodeStaged: () => {
          if (splashClosed.current) setStagedReady((count) => count + 1);
        },
        observer: watching ? controller.observer : undefined,
      });
      if (watching) controller.finished();
      // 목록을 받았으면(바뀌지 않았어도) 확인 시각을 적습니다 — 「준비 중」과 「확인을 못 함」을 가릅니다(D9).
      if (summary.manifest !== "unavailable") {
        const now = Date.now();
        if (trySet(hostContentStore, MANIFEST_CHECKED_AT_KEY, String(now)))
          setManifestCheckedAt(now);
      }
      const event = episodeContentRefreshedEventOf(summary);
      if (event !== null && !reported.current) {
        reported.current = true;
        sinkRef.current?.(event);
      }
      const audio = await refreshAudioManifest({
        fetchText: fetchContentText,
        store: hostContentStore,
      });
      if (refreshChangesCatalog(summary) || changesAudioTiming(audio)) reload();
      recheck.update(summary.deferred.length > 0);
    });
    // 건너뛴 편이 있으면 요금 없는 연결이 될 때까지 간격마다 봅니다 — 되면 받기를 다시 돌립니다.
    const recheck = createDeferredRecheck({
      intervalMs: deferredRecheckIntervalMs,
      isUnmetered: () => readNetworkProperties().networkCost === "unmetered",
      onUnmetered: () => void runner.current?.request(),
    });
    void runner.current.request();
    // UI 언어를 바꾸면 그 언어의 번역 파일을 받는 차례를 한 번 돌립니다(ADR-0102 D3).
    const offLanguage = onUiLanguageSaved(() => void runner.current?.request());
    return () => {
      offLanguage();
      recheck.stop();
    };
  }, []);
  useLynxGlobalEventListener(contentSyncEventName, () => {
    "background only";
    void runner.current?.request();
  });
  // 여정맵 루트에서만 불립니다 — 열린 에피소드 화면이 없으니 병합 없이 다시 읽어 새 판을 바로 보입니다.
  const applyStaged = useCallback(() => {
    "background only";
    setStagedReady(0);
    if (promoteStagedEpisodes(hostContentStore).promoted.length > 0)
      setContent(loadEpisodeContent());
  }, []);
  const downloads = useMemo<DownloadControls>(
    () => ({
      requestSync: () => {
        "background only";
        void runner.current?.request();
      },
      loadDownloadedBytes: () => {
        "background only";
        return downloadedAssetBytes(hostContentStore);
      },
      assetsComplete: (episodeId) => {
        "background only";
        return episodeAssetsComplete(
          hostContentStore,
          bundledCatalogInput.manifest.episodes,
          episodeId,
        );
      },
      assetsBytes: (episodeId) => {
        "background only";
        return episodeAssetsBytes(hostContentStore, episodeId);
      },
      manifestCheckedAt,
    }),
    [manifestCheckedAt],
  );
  return { content, splash, stagedReady, applyStaged, downloads };
}
