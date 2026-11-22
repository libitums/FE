// 순위 화면의 상태 훅(ADR-0170) — 고른 보드 · 보드별 읽은 결과 · 오프라인 · 분석. 서버 호출은 효과 · 핸들러에서만(배경 스레드).
// 비회원이면 서버를 부르지 않습니다. 한 번 읽은 보드는 화면이 서 있는 동안 다시 읽지 않습니다(다시 시도 · Show me만 다시).

import { useEffect, useRef, useState } from "@lynx-js/react";

import { emitCompanionEvent } from "../../lib/companion-events";
import { readNetworkProperties } from "../../lib/network-status";
import { saveRankingHidden } from "../../lib/ranking-hidden-cache";
import { takeSeenScore } from "../../lib/ranking-seen-score";
import type { RankingBoardKind, RankingClient, RankingLoad } from "../../lib/ranking.contract";
import type { EpisodeIntroEventSink } from "../episode-intro/episode-intro.contract";
import {
  rankingViewOf,
  seenAfterCounted,
  seenAfterLoad,
  type RankingView,
  type SeenByBoard,
} from "./ranking-rules";

export type UseRankingInput = {
  readonly client: RankingClient;
  readonly signedIn: boolean;
  readonly initialBoard: RankingBoardKind;
  readonly source: "tab" | "chat";
  readonly eventSink: EpisodeIntroEventSink;
};

export type RankingControls = {
  readonly view: RankingView;
  readonly board: RankingBoardKind;
  /** 이 보드에서 지난번에 본 내 점수(같은 주) — 숫자 오름의 출발 값(D12). 없으면 null. */
  readonly seenScore: number | null;
  /** 내 점수의 숫자 오름을 다 셌습니다 — 이 보드의 본 점수를 지워 다시 세지 않게 합니다. */
  readonly scoreCounted: () => void;
  readonly select: (board: RankingBoardKind) => void;
  readonly retry: () => void;
  readonly showMe: () => void;
};

const eventBoard = (board: RankingBoardKind) => (board === "lessons" ? "lessons" : "chat_words");
type Loads = Partial<Record<RankingBoardKind, RankingLoad>>;

export function useRanking(input: UseRankingInput): RankingControls {
  const { client, signedIn, eventSink } = input;
  const [board, setBoard] = useState<RankingBoardKind>(input.initialBoard);
  const [loads, setLoads] = useState<Loads>({});
  const [seen, setSeen] = useState<SeenByBoard>({});
  const [offline, setOffline] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const opened = useRef(false);
  const latestAttempt = useRef(0);
  latestAttempt.current = attempt;
  const ownSeen = useRef<Partial<Record<RankingBoardKind, true>>>({});
  const load = loads[board] ?? null;
  const view = rankingViewOf({ account: signedIn ? "signed-in" : "guest", offline, load });

  useEffect(() => {
    if (!signedIn || loads[board] !== undefined) return;
    // 늦게 온 옛 응답(다시 시도 앞의 것)은 버립니다 — 차례 번호가 지금과 같을 때만 받습니다.
    const turn = attempt;
    setOffline(readNetworkProperties().network === "offline");
    void client.load(board).then((result) => {
      if (result.status !== "error") saveRankingHidden(result.status === "hidden");
      if (latestAttempt.current !== turn) return;
      // 지난번에 본 내 점수를 꺼내고 지금 점수로 바꿔 둡니다 — 보드를 그리기 전에 함께 넣어 첫 프레임부터 옛 점수가 섭니다.
      if (result.status === "ready") {
        const previous = takeSeenScore(board, result.board.endsAt, result.board.me.score);
        setSeen((current) => seenAfterLoad(current, board, previous, result.board.me.score));
      }
      setLoads((current) =>
        current[board] === undefined ? { ...current, [board]: result } : current,
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board, signedIn, attempt]);

  // 처음 그린 상태(불러오는 중이 아닌 첫 상태)를 한 번, 내 줄은 보드마다 한 번.
  useEffect(() => {
    if (view.kind === "loading") return;
    if (!opened.current) {
      opened.current = true;
      emitCompanionEvent(eventSink, {
        name: "ranking_opened",
        surface: "learning",
        board: eventBoard(board),
        source: input.source,
        view: view.kind === "not-joined" ? "not_joined" : view.kind,
      });
    }
    if (view.kind === "ready" && ownSeen.current[board] !== true) {
      ownSeen.current = { ...ownSeen.current, [board]: true };
      emitCompanionEvent(eventSink, {
        name: "ranking_own_row_viewed",
        surface: "learning",
        board: eventBoard(board),
        rank: String(view.board.me.rank),
        score: String(view.board.me.score),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.kind, board]);

  const reload = () => {
    setLoads({});
    setAttempt((current) => current + 1);
  };
  return {
    view,
    board,
    seenScore: seen[board] ?? null,
    // 다 센 뒤에만 지웁니다 — 세기 전 · 세는 도중에 보드를 바꾸거나 다시 읽어도 못 본 오름이 사라지지 않습니다(리뷰 #550).
    scoreCounted: () => setSeen((current) => seenAfterCounted(current, board)),
    select: (next) => {
      if (next === board) return;
      emitCompanionEvent(eventSink, {
        name: "ranking_board_switched",
        surface: "learning",
        from: eventBoard(board),
        to: eventBoard(next),
      });
      setBoard(next);
    },
    retry: reload,
    showMe: () => {
      void client.setHidden(false).then((saved) => {
        if (saved === null) return;
        emitCompanionEvent(eventSink, {
          name: "ranking_hide_toggled",
          surface: "learning",
          hidden: false,
        });
        reload();
      });
    },
  };
}
