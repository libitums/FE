import type { ReactNode } from "@lynx-js/react";

import { color } from "@libitums/design-tokens";

import { adPlayIcon } from "../../components/ad-play-icon";
import type { AdTicketState, AdTicketWiring } from "../../lib/ad-ticket.contract";
import { playSound } from "../../lib/sound-effects";
import { useUiCopy } from "../../lib/ui-copy";
import type { AdTicketCopy } from "../../lib/ui-copy-ad-ticket";

import "./ad-ticket.css";

// 「Out of tickets」의 광고 줄(ADR-0208, 시안 A1 ~ A5). 대화상자 선택지 맨 위 — 광고(무료) → 엽전 20 → Go unlimited.
// 주황 채움은 「Start lesson」만이라 이 줄은 테두리 줄입니다. 상태는 순수 함수(`adTicketStep`)가 정하고 여기서는 그리기만 합니다.
//   A1 offer — 누르면 `onWatch`. 실패 뒤면 줄 위에 안내 한 줄.
//   A2 busy — 줄 안에서만 로딩(다른 선택지는 그대로), 누르지 않음.
//   A3 granted — 줄을 숨기고 대화상자가 제목 · 안내 · Start lesson을 그림(`AdTicketGranted`).
//   A4 limit — 흐리게, 「back tomorrow」, 누르지 않음.
//   A5 no-fill — 줄 대신 안내 한 줄(1분 뒤 상태 기계가 offer로 되돌림).

/** A2의 짧은 호(시안) — 정지 그림입니다. */
const busyArc = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 3a9 9 0 019 9"/></svg>`;

type Row = { readonly title: string; readonly sub: string; readonly tappable: boolean };

function rowOf(state: AdTicketState, copy: AdTicketCopy): Row | null {
  switch (state.kind) {
    case "offer":
      return { title: copy.watch, sub: copy.reward(state.left), tappable: true };
    case "busy":
      return state.step === "confirming"
        ? { title: copy.confirming, sub: copy.loadingSub, tappable: false }
        : { title: copy.loading, sub: copy.loadingSub, tappable: false };
    case "limit":
      return { title: copy.watch, sub: copy.usedAll(state.cap), tappable: false };
    default:
      return null;
  }
}

function noticeOf(state: AdTicketState, copy: AdTicketCopy): string | null {
  if (state.kind === "no-fill") return copy.noFill;
  if (state.kind === "offer" && state.failed) return copy.failed;
  return null;
}

export function AdTicketOption({ wiring }: { readonly wiring: AdTicketWiring }): ReactNode {
  const copy = useUiCopy().adTicket;
  const { state } = wiring;
  const row = rowOf(state, copy);
  const notice = noticeOf(state, copy);
  const handleTap = () => {
    "background only";
    if (row?.tappable !== true) return;
    playSound("button");
    wiring.onWatch();
  };
  if (row === null && notice === null) return null;
  return (
    <view className="ad-ticket">
      {notice === null ? null : (
        <text className="ad-ticket-notice" data-testid="out-of-tickets-ad-notice">
          {notice}
        </text>
      )}
      {row === null ? null : (
        <view
          className={`ad-ticket-row ad-ticket-row-${state.kind}`}
          data-testid="out-of-tickets-ad"
          data-state={state.kind}
          accessibility-element={true}
          accessibility-label={
            state.kind === "offer" ? copy.label(state.left) : `${row.title}. ${row.sub}`
          }
          accessibility-traits={state.kind === "limit" ? "disabled" : "button"}
          bindtap={handleTap}
        >
          <view className="ad-ticket-icon-box">
            <svg
              className="ad-ticket-icon"
              content={adPlayIcon}
              current-color={color.brand.primary}
            />
          </view>
          <view className="ad-ticket-text">
            <text className="ad-ticket-title">{row.title}</text>
            <text className="ad-ticket-sub">{row.sub}</text>
          </view>
          {state.kind === "offer" ? <text className="ad-ticket-free">{copy.free}</text> : null}
          {state.kind === "busy" ? (
            <svg
              className="ad-ticket-spinner"
              content={busyArc}
              current-color={color.brand.primary}
            />
          ) : null}
        </view>
      )}
    </view>
  );
}

/** A3 — 받은 뒤 대화상자 안내 한 줄(오늘 남은 광고 횟수). */
export function AdTicketGranted({ left }: { readonly left: number }): ReactNode {
  const copy = useUiCopy().adTicket;
  return (
    <text className="ticket-dialog-message" data-testid="out-of-tickets-ad-granted">
      {copy.grantedMessage(left)}
    </text>
  );
}
