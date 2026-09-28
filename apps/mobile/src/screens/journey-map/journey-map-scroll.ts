// 여정 맵이 호스트에 묻고 시키는 일입니다 — 요소의 자리를 재고, 스크롤을 옮깁니다.
// 계산은 여기 없습니다(`journey-map-sheet.ts`의 `stepSheetPlacement`).

import type { JourneyStepId } from "./journey-map";

// 질의가 집는 손잡이 둘입니다. **클래스가 아니라 `id`입니다** — Lynx의 `invoke`는 ID
// 선택자만 받습니다(`SELECTOR_NOT_SUPPORTED`). 클래스로 고르면 아무 일도 일어나지
// 않습니다.
export const screenId = "journey-map-screen";
export const scrollId = "journey-map-screen-scroll";

/** 스텝 상자의 `id`입니다 — `JourneyStepNode`가 붙이고 맵이 집습니다. */
export function stepNodeId(id: JourneyStepId): string {
  return `journey-step-node-${id}`;
}

export type MeasuredRect = { readonly top: number; readonly height: number };

// 요소 여럿의 자리를 한 번에 잽니다. 하나라도 못 재면 `null`을 냅니다 — 반쪽짜리 값으로
// 자리를 계산하지 않습니다.
export function measureRects(
  ids: readonly string[],
  onDone: (rects: readonly MeasuredRect[] | null) => void,
): void {
  "background only";
  const rects: MeasuredRect[] = [];
  let pending = ids.length;
  let settled = false;
  const settle = (result: readonly MeasuredRect[] | null) => {
    if (!settled) {
      settled = true;
      onDone(result);
    }
  };
  try {
    ids.forEach((id, index) => {
      lynx
        .createSelectorQuery()
        .select(`#${id}`)
        .invoke({
          method: "boundingClientRect",
          success: (rect: Partial<MeasuredRect> | null | undefined) => {
            if (typeof rect?.top !== "number" || typeof rect.height !== "number") {
              settle(null);
              return;
            }
            rects[index] = { top: rect.top, height: rect.height };
            pending -= 1;
            if (pending === 0) {
              settle(rects);
            }
          },
          fail: () => settle(null),
        })
        .exec();
    });
  } catch {
    settle(null);
  }
}

/** 맵을 그 스크롤 자리로 부드럽게 옮깁니다. */
export function scrollMapTo(scrollTop: number): void {
  "background only";
  try {
    lynx
      .createSelectorQuery()
      .select(`#${scrollId}`)
      .invoke({ method: "scrollTo", params: { offset: scrollTop, smooth: true } })
      .exec();
  } catch {
    // 자리를 못 옮겨도 말풍선은 유닛 곁에 떠 있습니다.
  }
}

// 자리를 못 쟀을 때의 길입니다 — 목적지를 계산할 수 없으므로 가운데 정렬을 호스트에
// 맡깁니다.
export function scrollStepIntoView(id: JourneyStepId): void {
  "background only";
  try {
    lynx
      .createSelectorQuery()
      .select(`#${stepNodeId(id)}`)
      .invoke({
        method: "scrollIntoView",
        params: { scrollIntoViewOptions: { block: "center", behavior: "smooth" } },
      })
      .exec();
  } catch {
    // 자리를 못 옮겨도 말풍선은 뜹니다.
  }
}
