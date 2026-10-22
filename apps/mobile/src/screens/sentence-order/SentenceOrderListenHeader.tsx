import type { ReactNode } from "@lynx-js/react";

import type { ListenAudioControl } from "../../components/use-listen-audio";

export type SentenceOrderListenHeaderProps = {
  readonly control: ListenAudioControl;
  /** 읽기 줄(정답 로마자)입니다. 아직 보이지 않으면 `null`입니다. */
  readonly romanization: string | null;
};

// 듣고 조립(LISTEN_BUILD)의 위 줄 — 재생 · 로마자 · 다시 듣기 · 천천히입니다. 껍데기만 있는 단계입니다.
export function SentenceOrderListenHeader(_props: SentenceOrderListenHeaderProps): ReactNode {
  return <view data-testid="sentence-order-header" />;
}
