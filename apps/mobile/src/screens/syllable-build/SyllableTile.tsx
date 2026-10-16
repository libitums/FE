import type { ReactNode } from "@lynx-js/react";

import type { SyllableTilePlaceholderProps, SyllableTileProps } from "./syllable-build.contract";

// 음절 타일의 껍데기입니다 — 글자만 서고 조작 · 상태 표식 · 낭독은 아직 없습니다.
export function SyllableTile({ index, text }: SyllableTileProps): ReactNode {
  return (
    <view data-testid={`syllable-build-tile-${index}`}>
      <text>{text}</text>
    </view>
  );
}

// 창고에서 빠진 자리의 껍데기입니다.
export function SyllableTilePlaceholder({ index }: SyllableTilePlaceholderProps): ReactNode {
  return <view data-testid={`syllable-build-bank-slot-${index}`} />;
}
