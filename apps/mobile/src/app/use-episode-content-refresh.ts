import { useEffect } from "@lynx-js/react";

import { hostContentStore } from "../lib/episode-cache";
import { bundledCatalogInput } from "../lib/episode-bundled";
import { refreshEpisodeCatalog } from "../lib/episode-refresh";
import { fetchContentText } from "../lib/episode-remote";

/**
 * 앱 실행마다 한 번(App 루트, 세션 key 밖), 서버의 에피소드 매니페스트를 받아 바뀐 에피소드만 기기 캐시에 둡니다.
 * 결과는 아직 소비하지 않습니다 — 카탈로그를 맵에 그리는 단계(3b)가 읽습니다. 갱신은 던지지
 * 않지만 렌더 경로와 무관하게 결과 · 실패를 모두 버립니다(ADR-0007 D2 — 전역 store 없음).
 */
export function useEpisodeContentRefresh(): void {
  useEffect(() => {
    void refreshEpisodeCatalog({
      fetchText: fetchContentText,
      store: hostContentStore,
      bundled: bundledCatalogInput,
    }).catch(() => undefined);
  }, []);
}
