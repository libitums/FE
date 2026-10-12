import { useEffect, useRef, useState } from "@lynx-js/react";

import { hostContentStore } from "../lib/episode-cache";
import { bundledCatalogInput } from "../lib/episode-bundled";
import { refreshEpisodeCatalog } from "../lib/episode-refresh";
import { fetchContentText } from "../lib/episode-remote";
import type { EpisodeIntroEventSink } from "../screens/episode-intro/episode-intro.contract";
import {
  episodeContentRefreshedEventOf,
  mergeCatalogForSession,
  noEpisodeContent,
  refreshChangesCatalog,
} from "./episode-content";
import type { EpisodeContent } from "./episode-content";
import { loadEpisodeContent } from "./episode-content-loader";

/**
 * 앱 실행마다 한 번(App 루트, 세션 key 밖), 내장 + 기기 캐시에서 카탈로그를 읽고 서버의 매니페스트로 바뀐
 * 에피소드를 기기 캐시에 둡니다. 갱신이 카탈로그를 바꿨으면 한 번 다시 읽어 세션에 내립니다 — 이미 열려
 * 있던 본문은 같은 실행 안에서 닫지 않습니다(ADR-0056 D3). 갱신은 던지지 않고, 결과는 매니페스트를 받았을
 * 때만 이벤트 하나로 보냅니다(전역 store 없음, ADR-0007 D2).
 */
export function useEpisodeContentRefresh(sink: EpisodeIntroEventSink): EpisodeContent {
  const [content, setContent] = useState<EpisodeContent>(noEpisodeContent);
  // 갱신은 비동기로 늦게 끝납니다 — 그사이 sink가 바뀌면 최신 것으로 보내도록 ref로 읽습니다.
  const sinkRef = useRef(sink);
  useEffect(() => {
    sinkRef.current = sink;
  }, [sink]);
  useEffect(() => {
    setContent(loadEpisodeContent());
    void refreshEpisodeCatalog({
      fetchText: fetchContentText,
      store: hostContentStore,
      bundled: bundledCatalogInput,
    })
      .then((summary) => {
        const event = episodeContentRefreshedEventOf(summary);
        if (event !== null) sinkRef.current?.(event);
        if (!refreshChangesCatalog(summary)) return;
        const next = loadEpisodeContent();
        setContent((previous) => ({
          ...next,
          catalog: mergeCatalogForSession(previous.catalog, next.catalog),
        }));
      })
      .catch(() => undefined);
    // 실행마다 한 번입니다 — sink가 바뀌어도 다시 돌지 않고, 보낼 때는 ref의 최신 sink를 씁니다.
  }, []);
  return content;
}
