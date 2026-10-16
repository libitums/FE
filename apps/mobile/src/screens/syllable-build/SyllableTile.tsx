import type { ReactNode } from "@lynx-js/react";
import { useMotion } from "@libitums/ui-lynx/motion";

import { playSound } from "../../lib/sound-effects";
import { useUiCopy } from "../../lib/ui-copy";
import { syllableTileAccessibilityLabel } from "./syllable-build";
import type { SyllableTilePlaceholderProps, SyllableTileProps } from "./syllable-build.contract";

import "./syllable-build-tile.css";

// 음절 타일 하나입니다. 창고에서는 테두리 있는 타일로, 칸에서는 면 없는 글자로 섭니다 — 같은 타일이 어느
// 목록에 있는가로 모양이 갈립니다. 창고에서 빠진 자리는 `SyllableTilePlaceholder`가 지킵니다.
// 누를 수 없는 타일(칸이 다 참 · 채점 뒤)은 모양을 바꾸지 않고 탭과 낭독 특성만 갈립니다.
export function SyllableTile({
  index,
  text,
  placedOrdinal,
  slotCount,
  interaction,
  onTap,
}: SyllableTileProps): ReactNode {
  const copy = useUiCopy();
  const motion = useMotion();
  const handleTap = () => {
    "background only";
    playSound("button");
    onTap(index);
  };
  const variant = placedOrdinal === null ? "bank" : "placed";
  const base = `syllable-tile syllable-tile-${variant}`;
  // standard에서는 data-motion 속성을 아예 넘기지 않습니다.
  const motionProps = motion === "reduced" ? { "data-motion": "reduced" } : {};

  return (
    <view
      className={motion === "reduced" ? `${base} syllable-tile-motion-reduced` : base}
      data-testid={`syllable-build-tile-${index}`}
      {...motionProps}
      data-placed={placedOrdinal ?? "none"}
      data-interaction={interaction}
      accessibility-element={true}
      accessibility-label={syllableTileAccessibilityLabel(
        text,
        placedOrdinal,
        slotCount ?? 0,
        copy.syllableBuild,
      )}
      accessibility-traits={interaction === "locked" ? "disabled" : "button"}
      bindtap={interaction === "locked" ? undefined : handleTap}
    >
      {/* 보이는 이름을 지는 요소는 가리지 않습니다 — 글자에는 접근성 속성이 없습니다. */}
      <text className="syllable-tile-label">{text}</text>
    </view>
  );
}

// 창고에서 타일이 빠져나간 자리입니다. 같은 크기의 회색 칸이 남아 창고의 배치가 흔들리지 않습니다.
// 낭독하지 않습니다 — 조작 단위도 정보도 아닙니다.
export function SyllableTilePlaceholder({ index, text }: SyllableTilePlaceholderProps): ReactNode {
  return (
    <view
      className="syllable-tile syllable-tile-placeholder"
      data-testid={`syllable-build-bank-slot-${index}`}
      accessibility-elements-hidden={true}
    >
      {/* 자리 폭을 타일 글자로 잡되 보이지 않게 둡니다 — 빈칸이 원래 타일과 같은 폭입니다. */}
      <text className="syllable-tile-label syllable-tile-label-hidden">{text}</text>
    </view>
  );
}
