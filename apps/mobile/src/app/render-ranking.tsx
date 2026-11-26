// 순위 탭 루트 · 설정의 숨기기 줄을 결선 값으로 그립니다(ADR-0170). 훅이 필요해 `renderScreen` 대신 작은 컴포넌트로 섭니다.

import { useState, type ReactNode } from "@lynx-js/react";

import { emitCompanionEvent } from "../lib/companion-events";
import { loadRankingHidden, saveRankingHidden } from "../lib/ranking-hidden-cache";
import type { RankingBoardKind } from "../lib/ranking.contract";
import { RankingScreen } from "../screens/ranking/RankingScreen";
import { useRanking } from "../screens/ranking/use-ranking";
import { SettingsScreen } from "../screens/settings/SettingsScreen";
import type { SettingsScreenProps } from "../screens/settings/settings.contract";
import type { RankingWiring } from "./ranking-wiring";

export function RankingRoute({
  board,
  ranking,
  onSignIn,
}: {
  readonly board: RankingBoardKind;
  readonly ranking: RankingWiring;
  readonly onSignIn: () => void;
}): ReactNode {
  const controls = useRanking({
    client: ranking.client,
    signedIn: ranking.signedIn,
    initialBoard: board,
    // 방 줄은 chat-words로 엽니다 — 탭의 처음 보드는 lessons.
    source: board === "chat-words" ? "chat" : "tab",
    eventSink: ranking.eventSink,
  });
  return (
    <RankingScreen
      view={controls.view}
      board={controls.board}
      nowMs={Date.now()}
      onSelectBoard={controls.select}
      onRetry={controls.retry}
      onSignIn={onSignIn}
      onShowMe={controls.showMe}
      seenScore={controls.seenScore}
      onScoreCounted={controls.scoreCounted}
    />
  );
}

/** 설정 화면 + 「Hide me from ranking」 — 회원이면 기기 사본 값으로 줄이 서고, 바꾸면 서버에 저장합니다. */
export function SettingsRoute(
  props: Omit<SettingsScreenProps, "rankingHidden"> & { readonly ranking: RankingWiring },
): ReactNode {
  const { ranking, ...rest } = props;
  const [hidden, setHidden] = useState<boolean>(loadRankingHidden);
  const onChange = (next: boolean) => {
    setHidden(next);
    saveRankingHidden(next);
    void ranking.client.setHidden(next).then((saved) => {
      const value = saved === null ? !next : saved.hidden;
      setHidden(value);
      saveRankingHidden(value);
      if (saved !== null)
        emitCompanionEvent(ranking.eventSink, {
          name: "ranking_hide_toggled",
          surface: "learning",
          hidden: saved.hidden,
        });
    });
  };
  return (
    <SettingsScreen {...rest} rankingHidden={ranking.signedIn ? { hidden, onChange } : null} />
  );
}
