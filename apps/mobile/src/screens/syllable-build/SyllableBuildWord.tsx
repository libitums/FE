import type { ReactNode } from "@lynx-js/react";

import { useUiCopy } from "../../lib/ui-copy";
import { SyllableTile } from "./SyllableTile";
import { syllableSlotStateOf } from "./syllable-build";
import type { SyllableBuildWordProps } from "./syllable-build.contract";

import "./syllable-build-word.css";

// 칸 줄입니다 — `slotCount`개의 칸이 나란히 서고(6칸 이상이면 줄바꿈), 놓인 타일이 앞 칸부터 찹니다. 칸은 놓임 · 지금(다음에
// 채울 칸) · 빈 칸 셋 중 하나이고, 채점 뒤에는 정답 · 오답 색을 냅니다. 낭독 방식은
// 부르는 쪽이 정합니다: 비었거나 채점된 뒤에는 줄 하나가 요소이고(만든 낱말을 한 번에 읽습니다), 놓이는
// 중에는 타일이 각자 요소입니다. 타일을 누르면 창고로 돌아갑니다.
export function SyllableBuildWord({
  tiles,
  slotCount,
  placedTileIndexes,
  interaction,
  phase = "building",
  result = null,
  accessibility,
  ghost,
  onReturn,
}: SyllableBuildWordProps): ReactNode {
  const copy = useUiCopy();
  const isRow = accessibility.kind === "row";
  // 흐린 정답이 깔렸으면 줄의 낭독 이름에도 정답을 싣습니다(힌트 「정답 보기」, ADR-0153).
  const rowLabel =
    accessibility.kind !== "row"
      ? undefined
      : ghost === undefined
        ? accessibility.label
        : `${accessibility.label}, ${copy.assembledHint.shown(ghost.join(""))}`;
  const positions = Array.from({ length: slotCount }, (_, position) => position);

  return (
    <view
      className="syllable-build-word"
      data-testid="syllable-build-word"
      accessibility-element={isRow}
      accessibility-label={rowLabel}
    >
      {positions.map((position) => {
        const tileIndex = placedTileIndexes[position];
        const state = syllableSlotStateOf(position, placedTileIndexes.length, phase);
        const judged = result === null ? "" : ` syllable-build-slot-${result}`;
        return (
          <view
            key={position}
            className={`syllable-build-slot syllable-build-slot-${state}${judged}`}
            data-testid={`syllable-build-slot-${position}`}
            data-filled={tileIndex === undefined ? "false" : "true"}
            data-state={state}
          >
            {tileIndex === undefined && ghost?.[position] !== undefined ? (
              <text
                className="syllable-build-slot-ghost"
                data-testid={`syllable-build-slot-${position}-ghost`}
              >
                {ghost[position]}
              </text>
            ) : null}
            {tileIndex === undefined ? null : (
              <SyllableTile
                index={tileIndex}
                text={tiles[tileIndex] ?? ""}
                placedOrdinal={position + 1}
                slotCount={slotCount}
                interaction={interaction}
                onTap={onReturn}
              />
            )}
          </view>
        );
      })}
    </view>
  );
}
