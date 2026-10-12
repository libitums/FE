import type { ReactNode } from "@lynx-js/react";

import type { ListeningSilentPromptProps } from "./listening-silent-prompt.contract";

// 소리가 없는 듣기 문항의 제시 채널입니다 — 대본을 늘 보이고 재생 조작은 꺼진 채 섭니다.
export function ListeningSilentPrompt(_props: ListeningSilentPromptProps): ReactNode {
  return <view data-testid="listening-silent-prompt" />;
}
