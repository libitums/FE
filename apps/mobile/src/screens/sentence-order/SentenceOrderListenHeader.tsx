import type { ReactNode } from "@lynx-js/react";

import { ListenControls } from "../../components/ListenPlaybackControls";
import type { ListenAudioControl } from "../../components/use-listen-audio";

import "./sentence-order-lines.css";

export type SentenceOrderListenHeaderProps = {
  readonly control: ListenAudioControl;
};

// 듣고 조립(LISTEN_BUILD)의 위 줄 — 왼쪽에 재생(xl), 오른쪽에 [다시 듣기 · 천천히]입니다. DOM 순서가 곧 읽는 순서입니다.
// ⟨2026-11-20⟩ 판정 뒤 로마자는 여기(재생 단추 옆에 몰려 섰음, QA 3번)가 아니라 답 줄 아래 정답 공개가 집니다.
export function SentenceOrderListenHeader({ control }: SentenceOrderListenHeaderProps): ReactNode {
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
      <view className="sentence-order-header-controls">
        <ListenControls.Replay control={control} testId="sentence-order-listen-replay" />
        <ListenControls.Slow control={control} testId="sentence-order-listen-slow" />
      </view>
    </view>
  );
}
