import { useEffect, useRef, useState } from "@lynx-js/react";
import type { ScrollEvent } from "@lynx-js/types";

import { episodeSectionId, measureRects } from "./journey-map-scroll";
import type { JourneyMapSection } from "./journey-map";

/**
 * 지금 보고 있는 에피소드가 몇 번째인지 집니다. 머리 카드 하나가 구획 밖에 서고, 이
 * 값으로 무엇을 말할지 고릅니다.
 *
 * **왜 `position: sticky`로 안 하나** — 구획마다 달라붙는 카드를 두면 Lynx에서 **첫 카드가
 * 스크롤 컨테이너에 그대로 고정된 채 풀리지 않습니다.** 구획 경계를 넘어도 앞 에피소드의
 * 카드가 붙어 있고 다음 카드는 그 뒤에 가려집니다(실기에서 확인). 그래서 카드를 하나만
 * 두고 **내용을 바꿉니다.**
 *
 * 스크롤 한 프레임마다 다시 그리지 않습니다 — 경계를 넘는 순간에만 값이 바뀝니다
 * (`useStepSheet`이 열림 상태에서만 state를 건드리는 것과 같은 판단).
 */
export function useCurrentEpisode(sections: readonly JourneyMapSection[]): {
  readonly index: number;
  readonly handleScroll: (event: ScrollEvent) => void;
} {
  const [index, setIndex] = useState(0);
  // 구획들의 시작 자리입니다. 재는 일이 비동기라 처음에는 비어 있고, 그동안은 첫
  // 에피소드를 말합니다 — 맨 위에서 시작하므로 그것이 맞습니다.
  const tops = useRef<readonly number[]>([]);
  const indexRef = useRef(0);

  useEffect(() => {
    measureRects(
      sections.map((section) => episodeSectionId(section.episode.id)),
      (rects) => {
        if (rects === null || rects.length !== sections.length) {
          return;
        }
        // oxlint-disable-next-line react/immutability
        tops.current = rects.map((rect) => rect.top);
      },
    );
  }, [sections]);

  const handleScroll = (event: ScrollEvent) => {
    "background only";
    const measured = tops.current;
    if (measured.length === 0) {
      return;
    }
    // 첫 구획의 자리를 원점으로 삼습니다 — 잰 값이 화면 좌표라 스크롤 양과 자릿수가
    // 다릅니다. 두 구획의 **차이**만 쓰면 원점이 어디든 같은 답이 나옵니다.
    const origin = measured[0] ?? 0;
    const offset = event.detail.scrollTop;
    let next = 0;
    for (let i = 1; i < measured.length; i += 1) {
      if (offset >= (measured[i] ?? 0) - origin) {
        next = i;
      }
    }
    if (next !== indexRef.current) {
      // oxlint-disable-next-line react/immutability
      indexRef.current = next;
      setIndex(next);
    }
  };

  return { index, handleScroll };
}
