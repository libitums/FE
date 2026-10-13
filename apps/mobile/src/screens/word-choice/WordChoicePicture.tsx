import type { ReactNode } from "@lynx-js/react";

import type { WordChoicePictureProps } from "./word-choice-picture";

import "./word-choice-picture.css";

// 그림 문항의 제시 자리입니다 — 받은 로드 상태대로 그립니다(상태 없음). 지금은 루트만 서는 뼈대입니다.
export function WordChoicePicture({ state }: WordChoicePictureProps): ReactNode {
  return <view data-testid="word-choice-picture" data-load-state={state} />;
}
