import type { ReactNode } from "@lynx-js/react";

import "./entry-step-bar.css";

export type EntryStepBarProps = {
  /** 1부터 셉니다. */
  readonly current: number;
  readonly total: number;
};

// 가입 직후 세 화면(이름 → 나라 → 언어)의 머리 행 진행 막대입니다. 칸마다 지난 · 지금 칸은 주황, 남은 칸은 회색이고,
// 막대 전체가 「Step 2 of 3」 하나로 읽힙니다.
export function EntryStepBar({ current, total }: EntryStepBarProps): ReactNode {
  return (
    <view
      className="entry-step-bar"
      data-testid="entry-step-bar"
      data-current={current}
      flatten={false}
      accessibility-element={true}
      accessibility-label={`Step ${current} of ${total}`}
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
