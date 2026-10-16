import type { ReactNode } from "@lynx-js/react";

import type { SpeakWordPictureProps } from "./speak-word.contract";

// 그림 틀입니다. 스캐폴드: 앵커만 서고 그림 · 대체 글자 · 낭독 이름은 구현 단계에서 채웁니다.
export function SpeakWordPicture({ state }: SpeakWordPictureProps): ReactNode {
  return <view data-testid="speak-word-picture" data-loadState={state} />;
}
