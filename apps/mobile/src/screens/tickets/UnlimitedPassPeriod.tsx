import type { ReactNode } from "@lynx-js/react";

import type { UnlimitedPassView } from "../../lib/unlimited-pass";
import { useUiCopy } from "../../lib/ui-copy";

import "./unlimited-ticket-modal.css";

// 무제한 모달의 기간 카드입니다(ADR-0115). 구독 판에서만 섭니다 — 시험 계정에는 기간이 없습니다.
//
// - renews: 「Renews on」 · 「Member since <날짜>」 줄 + 큰 갱신 날짜
// - ends: 「Ends on」 줄 + 큰 끝 날짜
// - ending-soon: 「Ends <날짜>」 · 「N of M days」 줄 + 노랑 「N days left」 + 남은 비율 막대(장식)
//
// 카드 전체를 한 문장으로 낭독합니다 — 막대는 장식이고 남은 날은 문장에 들어 있습니다.

export type UnlimitedPassPeriodProps = {
  readonly view: Exclude<UnlimitedPassView, { readonly kind: "guest" }>;
};

export function UnlimitedPassPeriod({ view }: UnlimitedPassPeriodProps): ReactNode {
  const m = useUiCopy().tickets.unlimitedModal;

  if (view.kind === "ending-soon") {
    const ends = m.endsDate(m.shortDate(view.on));
    const days = m.daysLeft(view.daysLeft);
    const progress = m.dayProgress(view.daysLeft, view.totalDays);
    return (
      <view
        className="unlimited-pass-period unlimited-pass-period-warn"
        data-testid="unlimited-ticket-modal-period"
        accessibility-element={true}
        accessibility-label={`${days}. ${ends}. ${progress}`}
      >
        <view className="unlimited-pass-period-row">
          <text
            className="unlimited-pass-period-small"
            data-testid="unlimited-ticket-modal-period-label"
          >
            {ends}
          </text>
          <text
            className="unlimited-pass-period-small"
            data-testid="unlimited-ticket-modal-day-progress"
          >
            {progress}
          </text>
        </view>
        <text
          className="unlimited-pass-period-main unlimited-pass-period-main-warn"
          data-testid="unlimited-ticket-modal-days-left"
        >
          {days}
        </text>
        <view className="unlimited-pass-period-track">
          <view
            className="unlimited-pass-period-fill"
            data-testid="unlimited-ticket-modal-track-fill"
            style={{ width: `${String(Math.round(view.remaining * 100))}%` }}
          />
        </view>
      </view>
    );
  }

  const label = view.kind === "renews" ? m.renewsOn : m.endsOn;
  const date = m.date(view.on);
  const since = view.kind === "renews" ? m.memberSince(m.shortDate(view.since)) : null;
  return (
    <view
      className="unlimited-pass-period"
      data-testid="unlimited-ticket-modal-period"
      accessibility-element={true}
      accessibility-label={since === null ? `${label} ${date}` : `${label} ${date}. ${since}`}
    >
      <view className="unlimited-pass-period-row">
        <text
          className="unlimited-pass-period-small"
          data-testid="unlimited-ticket-modal-period-label"
        >
          {label}
        </text>
        {since === null ? null : <text className="unlimited-pass-period-small">{since}</text>}
      </view>
      <text className="unlimited-pass-period-main" data-testid="unlimited-ticket-modal-period-date">
        {date}
      </text>
    </view>
  );
}
