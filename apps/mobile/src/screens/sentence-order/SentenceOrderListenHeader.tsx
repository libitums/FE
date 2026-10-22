import type { ReactNode } from "@lynx-js/react";

import { ListenControls } from "../../components/ListenPlaybackControls";
import { TextRoles } from "../../components/TextRoles";
import type { ListenAudioControl } from "../../components/use-listen-audio";
import { romanizationSegmentsOf } from "../../lib/romanization-segments";

import "./sentence-order-lines.css";

export type SentenceOrderListenHeaderProps = {
  readonly control: ListenAudioControl;
  /** 읽기 줄(정답 로마자)입니다. 아직 보이지 않으면 `null`입니다. */
  readonly romanization: string | null;
};

// 듣고 조립(LISTEN_BUILD)의 위 줄 — 왼쪽에 재생(xl), 오른쪽에 로마자와 그 아래 [다시 듣기 · 천천히]입니다. DOM 순서가
// 곧 읽는 순서입니다: 재생 → 로마자 → 다시 듣기 → 천천히.
export function SentenceOrderListenHeader({
  control,
  romanization,
}: SentenceOrderListenHeaderProps): ReactNode {
  return (
    <view
      className="sentence-order-header sentence-order-header-listen"
      data-testid="sentence-order-header"
    >
      <ListenControls.Playback
        control={control}
        testId="sentence-order-listen-playback"
        variant="brand"
      />
      <view className="sentence-order-header-side">
        {romanization === null ? null : (
          <TextRoles.Romanization
            segments={romanizationSegmentsOf(romanization, undefined)}
            size="m"
            testId="sentence-order-reading"
          />
        )}
        <view className="sentence-order-header-controls">
          <ListenControls.Replay control={control} testId="sentence-order-listen-replay" />
          <ListenControls.Slow control={control} testId="sentence-order-listen-slow" />
        </view>
      </view>
    </view>
  );
}
