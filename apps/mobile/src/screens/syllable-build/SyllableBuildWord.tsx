import type { ReactNode } from "@lynx-js/react";

import type { SyllableBuildWordProps } from "./syllable-build.contract";

// 칸 줄의 껍데기입니다 — 칸 · 타일은 아직 그리지 않습니다.
export function SyllableBuildWord(_props: SyllableBuildWordProps): ReactNode {
  return <view data-testid="syllable-build-word" />;
}
