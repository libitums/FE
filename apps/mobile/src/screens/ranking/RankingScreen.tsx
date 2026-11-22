// 주간 순위 화면(ADR-0170) — 고정 머리(제목 · 그룹 · 남은 날 · 보드 전환) · 목록 · 고정된 내 줄 · 상태 안내.
// 줄 조각(순위 · 아바타 · 목록 줄)은 `RankingRows.tsx`. 줄 · 내 줄은 누르지 않습니다(읽기만).

import type { ReactNode } from "@lynx-js/react";

import { color } from "@libitums/design-tokens";
import trophy from "@libitums/icons/lynx/trophy";
import { Button } from "@libitums/ui-lynx/button";

import type { RankingBoard, RankingBoardKind } from "../../lib/ranking.contract";
import { useUiCopy } from "../../lib/ui-copy";
import { rankingTestIds as ids, type RankingScreenProps } from "./ranking.contract";
import {
  daysLeft,
  moreToTopThree,
  nearMeItems,
  zoneBefore,
  type RankingView,
} from "./ranking-rules";
import { itemInClass, pulseClass, useReducedMotion, useRisingScore } from "./ranking-motion";
import { Face, PulseRing, RankBadge, Row } from "./RankingRows";

import "./ranking-screen.css";
import "./ranking-motion.css";

const GROUP_ICON = trophy.replace(/currentColor/g, color.fg.brand);
const BOARDS: readonly RankingBoardKind[] = ["lessons", "chat-words"];
const SLOP = { top: "2px", bottom: "2px", left: "0px", right: "0px" } as const;
const PLACEHOLDERS = [0, 1, 2, 3, 4] as const;
const GAP_DOTS = [0, 1, 2] as const;

function MyRow({
  board,
  seenScore,
}: {
  readonly board: RankingBoard;
  readonly seenScore: number | null;
}) {
  const copy = useUiCopy().ranking;
  const reduced = useReducedMotion();
  const shownScore = useRisingScore(board.me.score, seenScore);
  const mine = board.rows.find((row) => row.me);
  const gap = board.next === null ? copy.first : copy.morePass(board.next.more, board.next.name);
  const unit = copy.unit(board.kind, board.me.score);
  return (
    <view className="ranking-pin">
      <view
        className={`ranking-row ranking-row-me${pulseClass(reduced)}`}
        data-testid={ids.me}
        flatten={false}
        accessibility-element={true}
        accessibility-label={copy.rowLabel(
          board.me.rank,
          copy.you,
          gap,
          `${board.me.score} ${unit}`,
        )}
      >
        <view className="ranking-row-inner" accessibility-elements-hidden={true}>
          <RankBadge rank={board.me.rank} mine={true} />
          <Face name={mine?.name ?? "you"} countryCode={mine?.countryCode ?? null} />
          <view className="ranking-name">
            <text className="ranking-name-text">{copy.you}</text>
            <text className="ranking-sub ranking-sub-gap" data-testid={ids.meGap}>
              {gap}
            </text>
          </view>
          <view className="ranking-score">
            <text className="ranking-score-text" data-testid={ids.meScore}>
              {String(shownScore)}
            </text>
            <text className="ranking-unit">{unit}</text>
          </view>
        </view>
        <PulseRing />
      </view>
    </view>
  );
}

function List({ board }: { readonly board: RankingBoard }) {
  const copy = useUiCopy().ranking;
  const reduced = useReducedMotion();
  // 그룹 전체가 아니라 상위 3 · 내 근처만(ADR-0170 D11). 구역 줄은 그려지는 줄끼리 셉니다 — 생략 뒤 첫 줄 앞이 「Keep climbing」.
  const items = nearMeItems(board.rows);
  const shown = items.flatMap((item) => (item.kind === "row" ? [item.row] : []));
  return (
    <scroll-view
      className="ranking-scroll"
      data-testid={ids.list}
      scroll-orientation="vertical"
      scroll-bar-enable={false}
    >
      {/* 보드가 바뀌면 목록을 새로 세워 차례 등장이 다시 돕니다(D12). */}
      <view key={board.kind} className="ranking-list">
        {items.map((item, index) => {
          if (item.kind === "gap")
            return (
              <view
                key="gap"
                className={`ranking-gap${itemInClass(index, reduced)}`}
                data-testid={ids.gap}
                accessibility-elements-hidden={true}
              >
                {GAP_DOTS.map((dot) => (
                  <view key={dot} className="ranking-gap-dot" />
                ))}
              </view>
            );
          const row = item.row;
          const zone = zoneBefore(shown, shown.indexOf(row));
          return (
            <view
              key={`${row.rank}-${row.name}`}
              className={`ranking-item${itemInClass(index, reduced)}`}
            >
              {zone === null ? null : (
                <text
                  className="ranking-zone"
                  data-testid={zone === "top" ? ids.zoneTop : ids.zoneClimb}
                >
                  {zone === "top"
                    ? copy.zoneTop(board.reward)
                    : copy.zoneClimb(moreToTopThree(board))}
                </text>
              )}
              <Row row={row} board={board} />
            </view>
          );
        })}
      </view>
    </scroll-view>
  );
}

function Notice({
  view,
  props,
}: {
  readonly view: RankingView;
  readonly props: RankingScreenProps;
}) {
  const copy = useUiCopy().ranking;
  const kind = view.kind;
  if (kind === "ready" || kind === "loading") return null;
  const notice = kind === "not-joined" ? copy.notices.notJoined : copy.notices[kind];
  const action =
    kind === "guest"
      ? { label: copy.actions.signIn, onTap: props.onSignIn }
      : kind === "hidden"
        ? { label: copy.actions.showMe, onTap: props.onShowMe }
        : kind === "error" || kind === "offline"
          ? { label: copy.actions.retry, onTap: props.onRetry }
          : null;
  return (
    <view className="ranking-notice" data-testid={ids.notice} data-view={kind}>
      <text className="ranking-notice-title" accessibility-traits="header">
        {notice.title}
      </text>
      <text className="ranking-notice-body">{notice.body}</text>
      {action === null ? null : (
        <view data-testid={ids.noticeAction}>
          <Button label={action.label} variant="brand" size="m" bindtap={action.onTap} />
        </view>
      )}
    </view>
  );
}

function Loading() {
  const copy = useUiCopy().ranking;
  return (
    <view
      className="ranking-loading"
      data-testid={ids.loading}
      flatten={false}
      accessibility-element={true}
      accessibility-label={copy.loading}
    >
      {PLACEHOLDERS.map((index) => (
        <view key={index} className="ranking-placeholder" />
      ))}
    </view>
  );
}

export function RankingScreen(props: RankingScreenProps): ReactNode {
  const { view, board, nowMs, onSelectBoard } = props;
  const copy = useUiCopy().ranking;
  const endsAt =
    view.kind === "ready" ? view.board.endsAt : view.kind === "not-joined" ? view.endsAt : null;
  const switchable = view.kind !== "guest" && view.kind !== "hidden";
  return (
    <view className="ranking-screen" data-testid={ids.screen}>
      <view className="ranking-top">
        <text
          className="ranking-title"
          data-testid={ids.title}
          flatten={false}
          accessibility-element={true}
          accessibility-traits="header"
          accessibility-heading={true}
        >
          {copy.title}
        </text>
        {endsAt === null ? null : (
          <view className="ranking-meta">
            {view.kind === "ready" ? (
              <view className="ranking-group">
                <svg
                  className="ranking-group-icon"
                  content={GROUP_ICON}
                  accessibility-elements-hidden={true}
                />
                <text className="ranking-group-text" data-testid={ids.group}>
                  {copy.group(view.board.groupSize)}
                </text>
              </view>
            ) : (
              <view />
            )}
            <text className="ranking-ends" data-testid={ids.ends}>
              {copy.endsIn(daysLeft(endsAt, nowMs))}
            </text>
          </view>
        )}
        {switchable ? (
          <view className="ranking-boards">
            {BOARDS.map((kind) => {
              const label = copy.boards[kind];
              const selected = kind === board;
              return (
                <view
                  key={kind}
                  className={selected ? "ranking-board ranking-board-on" : "ranking-board"}
                  data-testid={ids.board(kind)}
                  data-selected={selected ? "true" : "false"}
                  hit-slop={SLOP}
                  flatten={false}
                  accessibility-element={true}
                  accessibility-enable-tap={true}
                  accessibility-traits="button"
                  accessibility-label={selected ? copy.selected(label) : label}
                  bindtap={() => {
                    "background only";
                    onSelectBoard(kind);
                  }}
                >
                  <text className="ranking-board-text">{label}</text>
                </view>
              );
            })}
          </view>
        ) : null}
      </view>
      {view.kind === "ready" ? <List board={view.board} /> : null}
      {view.kind === "loading" ? <Loading /> : null}
      <Notice view={view} props={props} />
      {view.kind === "ready" ? (
        <MyRow key={view.board.kind} board={view.board} seenScore={props.seenScore ?? null} />
      ) : null}
    </view>
  );
}
