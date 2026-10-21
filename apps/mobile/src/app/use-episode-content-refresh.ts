import { useEffect, useLynxGlobalEventListener, useRef, useState } from "@lynx-js/react";

import { changesAudioTiming, refreshAudioManifest } from "../lib/audio-manifest-refresh";
import { hostContentStore } from "../lib/episode-cache";
import { promoteStagedEpisodes } from "../lib/episode-staging";
import { bundledCatalogInput } from "../lib/episode-bundled";
import { refreshEpisodeCatalog } from "../lib/episode-refresh";
import { fetchContentText } from "../lib/episode-remote";
import type { EpisodeIntroEventSink } from "../screens/episode-intro/episode-intro.contract";
import type { SplashUpdatePort } from "../screens/splash/splash.contract";
import { createSyncRunner } from "./content-sync-runner";
import type { SyncRunner } from "./content-sync-runner";
import {
  episodeContentRefreshedEventOf,
  mergeCatalogForSession,
  noEpisodeContent,
  refreshChangesCatalog,
} from "./episode-content";
import type { EpisodeContent } from "./episode-content";
import { hostAssetDeps, loadEpisodeContent } from "./episode-content-loader";
import { createSplashUpdateController } from "./splash-update-controller";

/** 호스트가 받기 좋은 때(끊겼던 연결이 돌아옴 · 앱이 포그라운드로 돌아옴)를 알리는 전역 이벤트입니다(ADR-0071). */
export const contentSyncEventName = "contentSyncOpportunity";

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
};

export function useEpisodeContentRefresh(sink: EpisodeIntroEventSink): EpisodeContentRefresh {
  const [content, setContent] = useState<EpisodeContent>(noEpisodeContent);
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
    },
  }));

  // 실행기는 effect 안에서 만듭니다 — 렌더에서 만들면 그 안의 백그라운드 전용 모듈이 메인 스레드 번들로 끌려옵니다.
  const runner = useRef<SyncRunner | null>(null);

  useEffect(() => {
    const reload = () => {
      const next = loadEpisodeContent();
      setContent((previous) => ({
        ...next,
        catalog: mergeCatalogForSession(previous.catalog, next.catalog),
      }));
    };
    const startPromoted = promoteStagedEpisodes(hostContentStore).promoted.length;
    setContent(loadEpisodeContent());
    const controller = createSplashUpdateController({
      now: Date.now,
      startPromoted,
      closedBeforeStart: closedEarly.current ? "yes" : "no",
      onView: (view) => setSplash((previous) => ({ ...previous, view })),
      promote: () => promoteStagedEpisodes(hostContentStore).promoted,
      reload: () => setContent(loadEpisodeContent()),
      send: (event) => sinkRef.current?.(event),
    });
    setSplash({
      view: { kind: "plain" },
      logoFinished: controller.logoFinished,
      close: controller.close,
    });
    let firstRound = true;
    // oxlint-disable-next-line react/immutability
    runner.current = createSyncRunner(async () => {
      const watching = firstRound;
      firstRound = false;
      const summary = await refreshEpisodeCatalog({
        fetchText: fetchContentText,
        store: hostContentStore,
        bundled: bundledCatalogInput,
        assets: hostAssetDeps(),
        onEpisodeReady: reload,
        observer: watching ? controller.observer : undefined,
      });
      if (watching) controller.finished();
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
    });
    void runner.current.request();
  }, []);
  useLynxGlobalEventListener(contentSyncEventName, () => {
    "background only";
    void runner.current?.request();
  });
  return { content, splash };
}
