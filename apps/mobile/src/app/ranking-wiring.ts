// 주간 순위 결선(ADR-0170) — 서버 포트 싱글턴 · 순위 탭 열기 · 분석 sink. 화면은 스택을 모릅니다(ADR-0007 D3).
// 포트는 RPC를 효과 · 핸들러(배경 스레드)에서만 부릅니다 — 여기서는 만들기만 합니다.

import type { Dispatch } from "@lynx-js/react";

import type { AccountState } from "../lib/guest-session";
import { currentAccessToken } from "../lib/progress-api";
import { createRankingClient } from "../lib/ranking-api";
import type { RankingBoardKind, RankingClient } from "../lib/ranking.contract";
import { send } from "../lib/supabase-transport";
import type { EpisodeIntroEventSink } from "../screens/episode-intro/episode-intro.contract";
import { tabRootActions } from "./nav-reducer";
import type { NavAction } from "./nav-state";

export type RankingWiring = {
  readonly client: RankingClient;
  readonly signedIn: boolean;
  readonly eventSink: EpisodeIntroEventSink;
  /** 순위 탭을 그 보드로 엽니다(방 줄 → chat-words). */
  readonly openRanking: (board: RankingBoardKind) => void;
};

let client: RankingClient | null = null;

/** 앱의 순위 포트 — 저장된 로그인 · 설정으로 RPC를 부릅니다. */
export function rankingClient(): RankingClient {
  if (client === null)
    client = createRankingClient({
      token: () => currentAccessToken(),
      post: (build) => send(build, true),
    });
  return client;
}

/** 통합 테스트가 포트를 갈아 끼웁니다(null이면 앱 포트로 되돌림). */
export function setRankingClientForTests(next: RankingClient | null): void {
  client = next;
}

export function rankingWiring(args: {
  readonly dispatch: Dispatch<NavAction>;
  readonly accountState: AccountState;
  readonly eventSink: EpisodeIntroEventSink;
}): RankingWiring {
  return {
    client: rankingClient(),
    signedIn: args.accountState === "signed-in",
    eventSink: args.eventSink,
    openRanking: (board) => {
      for (const action of tabRootActions("ranking")) args.dispatch(action);
      args.dispatch({ type: "replace", screen: { name: "ranking", board } });
    },
  };
}
