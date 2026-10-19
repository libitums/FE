import { useEffect, useLynxGlobalEventListener, useRef, useState } from "@lynx-js/react";

import { contentFileUrl, contentFilesAvailable, downloadContentFile } from "../lib/content-files";
import type { AssetDeps } from "../lib/episode-asset-sync";
import { hostContentStore } from "../lib/episode-cache";
import { bundledCatalogInput } from "../lib/episode-bundled";
import { refreshEpisodeCatalog } from "../lib/episode-refresh";
import { fetchContentText } from "../lib/episode-remote";
import type { EpisodeIntroEventSink } from "../screens/episode-intro/episode-intro.contract";
import { createSyncRunner } from "./content-sync-runner";
import {
  episodeContentRefreshedEventOf,
  mergeCatalogForSession,
  noEpisodeContent,
  refreshChangesCatalog,
} from "./episode-content";
import type { EpisodeContent } from "./episode-content";
import { loadEpisodeContent, remoteContentUrlOf } from "./episode-content-loader";

/** 호스트가 받기 좋은 때(끊겼던 연결이 돌아옴 · 앱이 포그라운드로 돌아옴)를 알리는 전역 이벤트입니다(ADR-0071). */
export const contentSyncEventName = "contentSyncOpportunity";

/** 호스트 파일 모듈이 있을 때만 자산을 받습니다. 없으면 지금처럼 본문만 받습니다. */
function hostAssetDeps(): AssetDeps | undefined {
  if (!contentFilesAvailable()) return undefined;
  return {
    has: (path) => contentFileUrl(path) !== null,
    download: downloadContentFile,
    remoteUrlOf: remoteContentUrlOf,
  };
}

/**
 * 내장 + 기기 캐시에서 카탈로그를 읽고, 서버의 매니페스트로 새 에피소드를 **하나씩**(본문 → 그림 · 음성) 받아
 * 둡니다(App 루트, 세션 key 밖). 받기는 실행 시작과 호스트 신호마다 돌고, 겹치면 한 번으로 모읍니다. 에피소드
 * 하나가 갖춰질 때마다 카탈로그를 다시 읽어 맵에 바로 냅니다 — 이미 열려 있던 본문은 같은 실행 안에서 닫지
 * 않습니다(ADR-0056 D3). 사용자에게 알리지 않고 던지지 않습니다. 분석 이벤트는 실행당 처음 매니페스트를 받은
 * 한 번만 보냅니다(ADR-0029 — 신호마다 세면 같은 실행이 여러 번 셉니다).
 */
export function useEpisodeContentRefresh(sink: EpisodeIntroEventSink): EpisodeContent {
  const [content, setContent] = useState<EpisodeContent>(noEpisodeContent);
  // 받기는 비동기로 늦게 끝납니다 — 그사이 sink가 바뀌면 최신 것으로 보내도록 ref로 읽습니다.
  const sinkRef = useRef(sink);
  useEffect(() => {
    sinkRef.current = sink;
  }, [sink]);
  const reported = useRef(false);

  const runner = useRef(
    createSyncRunner(async () => {
      const reload = () => {
        const next = loadEpisodeContent();
        setContent((previous) => ({
          ...next,
          catalog: mergeCatalogForSession(previous.catalog, next.catalog),
        }));
      };
      const summary = await refreshEpisodeCatalog({
        fetchText: fetchContentText,
        store: hostContentStore,
        bundled: bundledCatalogInput,
        assets: hostAssetDeps(),
        onEpisodeReady: reload,
      });
      const event = episodeContentRefreshedEventOf(summary);
      if (event !== null && !reported.current) {
        reported.current = true;
        sinkRef.current?.(event);
      }
      if (refreshChangesCatalog(summary)) reload();
    }),
  );

  useEffect(() => {
    setContent(loadEpisodeContent());
    void runner.current.request();
  }, []);
  useLynxGlobalEventListener(contentSyncEventName, () => {
    void runner.current.request();
  });
  return content;
}
