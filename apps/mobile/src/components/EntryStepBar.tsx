import type { ReactNode } from "@lynx-js/react";

import "./entry-step-bar.css";

export type EntryStepBarProps = {
  /** 1부터 셉니다. */
  readonly current: number;
  readonly total: number;
  /** 낭독 이름입니다(입장 전 기초 — UI 언어). 없으면 「Step n of N」. */
  readonly label?: string;
};

// 가입 직후 네 화면(이름 → 나라 → 언어 → 출생 연도, 2026-11-27)과 입장 전 기초 세 화면(ADR-0176)의 진행 막대입니다. 칸마다 지난 · 지금 칸은
// 주황, 남은 칸은 회색이고, 막대 전체가 「Step 2 of 3」 하나로 읽힙니다.
export function EntryStepBar({ current, total, label }: EntryStepBarProps): ReactNode {
  return (
    <view
      className="entry-step-bar"
      data-testid="entry-step-bar"
      data-current={current}
      flatten={false}
      accessibility-element={true}
      accessibility-label={label ?? `Step ${current} of ${total}`}
    >
      {Array.from({ length: total }, (_, index) => (
        <view
          key={index}
          className={`entry-step-bar-segment${index < current ? " entry-step-bar-segment-done" : ""}`}
        />
      ))}
    </view>
  );
}
