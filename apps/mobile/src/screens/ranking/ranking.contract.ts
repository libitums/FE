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
  /** 이 보드에서 지난번에 본 내 점수(같은 주) — 올랐으면 거기서부터 셉니다(D12). 없으면 세지 않습니다. */
  readonly seenScore?: number | null;
  /** 내 점수의 숫자 오름을 다 셌습니다 — 본 점수를 지워 다시 세지 않게 합니다. */
  readonly onScoreCounted?: () => void;
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
  /** 보상이 꺼져 있으면 null. */
  readonly zoneTop: (reward: number | null) => string;
  /** 내 근처 구역 줄 — `more`는 3위 안에 들려면 더 필요한 점수(D13), 없으면 격려만. */
  readonly zoneClimb: (more: number | null) => string;
  readonly you: string;
  readonly morePass: (more: number, name: string) => string;
  readonly first: string;
  /** 줄 낭독 — 순위 · 이름 · 보조(고정 내 줄의 차이, 목록 줄은 null — D11) · 점수와 단위. */
  readonly rowLabel: (rank: number, name: string, sub: string | null, score: string) => string;
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
  /** 상위 3과 내 근처 사이의 생략 표시(ADR-0170 D11). */
  gap: id("gap"),
  me: id("me"),
  meGap: id("me-gap"),
  meScore: id("me-score"),
  /** 내 줄 강조 고리(D12) — 움직임 줄이기면 서지 않습니다. */
  ring: id("ring"),
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
