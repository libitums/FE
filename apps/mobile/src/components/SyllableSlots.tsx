import type { ReactNode } from "@lynx-js/react";

import type { UiCopy } from "../lib/ui-copy.contract";
import { useUiCopy } from "../lib/ui-copy";

import "./syllable-slots.css";

// 음절 칸 줄입니다(Figma 79-6378의 빈칸 아래 칸 셋). 빈칸을 채우는 음절이 한 칸씩 서고, 이미
// 쓴 칸과 지금 쓰는 칸은 흰 면 · 주황 테두리에 그 음절이, 아직 안 쓴 칸은 빈 회색 면이
// 섭니다. 쓰기 학습형과 최종 테스트가 함께 씁니다(ADR-0008).

/** 칸 하나의 상태입니다 — 예약 상태어 셋입니다(`docs/conventions/code.md` 「상태(modifier) 클래스」). */
export type SyllableSlotStatus = "done" | "current" | "locked";

export type SyllableSlotsProps = {
  readonly syllables: readonly string[];
  /** 지금 쓰는 칸의 순번(0부터)입니다. 음절 수와 같으면 모두 쓴 것입니다. */
  readonly currentIndex: number;
};

export function syllableSlotStatus(index: number, currentIndex: number): SyllableSlotStatus {
  if (index < currentIndex) {
    return "done";
  }
  return index === currentIndex ? "current" : "locked";
}

// 낭독 이름입니다. 칸 하나씩 읽게 하면 세 번 멈추면서 같은 말을 되풀이하므로, 줄 하나를 한
// 요소로 묶어 「몇 칸 중 몇째를 쓰는 중이고 무엇을 썼나」를 한 번에 읽힙니다. 아직 안 쓴 칸의
// 글자는 읽지 않습니다 — 화면에도 보이지 않는 것입니다.
function slotsLabel(syllables: readonly string[], currentIndex: number, copy: UiCopy): string {
  const written = syllables.slice(0, currentIndex).join("");
  const total = syllables.length;
  if (currentIndex >= total) {
    return copy.writing.slotsAllWritten(total, written);
  }
  const current = syllables[currentIndex] ?? "";
  return copy.writing.slotsCurrent(total, currentIndex + 1, current, written);
}

export function SyllableSlots({ syllables, currentIndex }: SyllableSlotsProps): ReactNode {
  const copy = useUiCopy();
  return (
    <view
      className="syllable-slots"
      data-testid="syllable-slots"
      accessibility-element={true}
      accessibility-label={slotsLabel(syllables, currentIndex, copy)}
    >
      {syllables.map((syllable, index) => {
        const status = syllableSlotStatus(index, currentIndex);
        return (
          <view
            key={index}
            className={`syllable-slots-slot syllable-slots-slot-${status}`}
            data-testid={`syllable-slots-slot-${index}`}
            data-status={status}
          >
            {status === "locked" ? null : <text className="syllable-slots-glyph">{syllable}</text>}
          </view>
        );
      })}
    </view>
  );
}
