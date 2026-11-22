// 순위 줄의 조각(ADR-0170) — 순위 · 메달, 아바타(이름 해시 색 — D10) · 국기, 목록 줄. 화면(`RankingScreen`)이 목록과 고정 내 줄에 씁니다.
// 줄은 누르지 않습니다(읽기만). 낭독은 줄마다 요소 하나 — 메달 · 국기 · 아바타는 숨깁니다.

import type { ReactNode } from "@lynx-js/react";

import { Avatar } from "@libitums/ui-lynx/avatar";

import type { RankingBoard, RankingRow } from "../../lib/ranking.contract";
import { useUiCopy } from "../../lib/ui-copy";
import { rankingTestIds as ids } from "./ranking.contract";
import { medalInClass, pulseClass, useReducedMotion } from "./ranking-motion";
import { avatarToneOf, flagOf, medalOf } from "./ranking-rules";

/** 내 줄 강조 고리(D12) — 줄 테두리에서 밖으로 번지며 사라집니다. 움직임 줄이기면 서지 않습니다. */
export function PulseRing(): ReactNode {
  return useReducedMotion() ? null : (
    <view className="ranking-ring" data-testid={ids.ring} accessibility-elements-hidden={true} />
  );
}

export function RankBadge({
  rank,
  mine,
}: {
  readonly rank: number;
  readonly mine: boolean;
}): ReactNode {
  const reduced = useReducedMotion();
  const medal = mine ? null : medalOf(rank);
  return medal === null ? (
    <text className={mine ? "ranking-rank ranking-rank-me" : "ranking-rank"}>{String(rank)}</text>
  ) : (
    <view
      className={`ranking-medal ranking-medal-${medal}${medalInClass(rank, reduced)}`}
      data-testid={ids.medal(rank)}
      data-medal={medal}
    >
      <text className={`ranking-medal-text ranking-medal-text-${medal}`}>{String(rank)}</text>
    </view>
  );
}

export function Face({
  name,
  countryCode,
}: {
  readonly name: string;
  readonly countryCode: string | null;
}): ReactNode {
  const flag = flagOf(countryCode);
  return (
    <view className={`ranking-face ranking-face-tone-${avatarToneOf(name)}`}>
      <Avatar name={name} size="sm" accessibility="hidden" />
      {flag === "" ? null : <text className="ranking-flag">{flag}</text>}
    </view>
  );
}

export function Row({
  row,
  board,
  shownScore,
}: {
  readonly row: RankingRow;
  readonly board: RankingBoard;
  /** 내 줄이 세는 중에 보일 숫자(D12) — 고정된 내 줄과 같은 값. 없으면 점수 그대로. 낭독 줄은 늘 점수입니다. */
  readonly shownScore?: number;
}): ReactNode {
  const copy = useUiCopy().ranking;
  const reduced = useReducedMotion();
  const unit = copy.unit(board.kind, row.score);
  const shown = shownScore ?? row.score;
  return (
    <view
      className={row.me ? `ranking-row ranking-row-me${pulseClass(reduced)}` : "ranking-row"}
      data-testid={ids.row(row.rank)}
      data-me={row.me ? "true" : "false"}
      flatten={false}
      accessibility-element={true}
      accessibility-label={copy.rowLabel(
        row.rank,
        row.me ? `${row.name}, ${copy.you}` : row.name,
        null,
        `${row.score} ${unit}`,
      )}
    >
      <view className="ranking-row-inner" accessibility-elements-hidden={true}>
        <RankBadge rank={row.rank} mine={false} />
        <Face name={row.name} countryCode={row.countryCode} />
        <view className="ranking-name">
          <text className="ranking-name-text">{row.name}</text>
        </view>
        <view className="ranking-score">
          <text className="ranking-score-text">{String(shown)}</text>
          <text className="ranking-unit">{copy.unit(board.kind, shown)}</text>
        </view>
      </view>
      {row.me ? <PulseRing /> : null}
    </view>
  );
}
