// 순위 화면 · 채팅 단어 UI의 계약입니다(ADR-0170) — props · 문구 · test-id. 불리언 prop 없이 상태 union을 받습니다.

import type { RankingBoardKind } from "../../lib/ranking.contract";
import type { RankingView } from "./ranking-rules";

export type RankingScreenProps = {
  readonly view: RankingView;
  readonly board: RankingBoardKind;
  /** 남은 날을 셀 지금 시각(ms). */
  readonly nowMs: number;
  readonly onSelectBoard: (board: RankingBoardKind) => void;
  readonly onRetry: () => void;
  /** 비회원 「Sign in」 — 설정과 같은 로그인 흐름(ADR-0111). */
  readonly onSignIn: () => void;
  /** 숨김 상태의 「Show me」 — 숨김을 끕니다. */
  readonly onShowMe: () => void;
};

type Notice = { readonly title: string; readonly body: string };

export type RankingCopy = {
  readonly title: string;
  readonly group: (count: number) => string;
  readonly endsIn: (days: number) => string;
  readonly boards: Readonly<Record<RankingBoardKind, string>>;
  readonly selected: (label: string) => string;
  /** 점수 단위 — 수에 맞는 꼴. */
  readonly unit: (board: RankingBoardKind, score: number) => string;
  readonly episode: (episode: number) => string;
  /** 보상이 꺼져 있으면 null. */
  readonly zoneTop: (reward: number | null) => string;
  readonly zoneClimb: string;
  readonly you: string;
  readonly morePass: (more: number, name: string) => string;
  readonly first: string;
  /** 줄 낭독 — 순위 · 이름 · 에피소드(없으면 null) · 점수와 단위. */
  readonly rowLabel: (rank: number, name: string, episode: string | null, score: string) => string;
  readonly loading: string;
  readonly notices: {
    readonly guest: Notice;
    readonly notJoined: Notice;
    readonly hidden: Notice;
    readonly error: Notice;
    readonly offline: Notice;
  };
  readonly actions: { readonly signIn: string; readonly showMe: string; readonly retry: string };
  readonly chat: {
    readonly stripCount: (words: number) => string;
    readonly stripRank: (rank: number | null) => string;
    readonly stripLabel: (words: number, rank: number | null) => string;
    readonly earned: (count: number) => string;
    readonly pending: string;
  };
  readonly settings: { readonly hideTitle: string; readonly hideBody: string };
};

const id = (suffix: string): string => `ranking-${suffix}`;

export const rankingTestIds = {
  screen: id("screen"),
  title: id("title"),
  group: id("group"),
  ends: id("ends"),
  board: (board: RankingBoardKind): string => id(`board-${board}`),
  list: id("list"),
  row: (rank: number): string => id(`row-${rank}`),
  medal: (rank: number): string => id(`medal-${rank}`),
  zoneTop: id("zone-top"),
  zoneClimb: id("zone-climb"),
  me: id("me"),
  meGap: id("me-gap"),
  notice: id("notice"),
  noticeAction: id("notice-action"),
  loading: id("loading"),
} as const;

export const chatWordsTestIds = {
  strip: "messenger-chat-words-strip",
  earned: "messenger-chat-words-earned",
  word: (index: number): string => `messenger-chat-word-${index}`,
  pending: (index: number): string => `messenger-chat-word-pending-${index}`,
} as const;
