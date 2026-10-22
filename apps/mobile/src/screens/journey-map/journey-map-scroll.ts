// 여정 맵이 호스트에 묻고 시키는 일입니다 — 요소의 자리를 재고, 스크롤을 옮깁니다.
// 계산은 여기 없습니다(`journey-map-sheet.ts`의 `stepSheetPlacement`).

// 질의가 집는 손잡이 둘입니다. **클래스가 아니라 `id`입니다** — Lynx의 `invoke`는 ID
// 선택자만 받습니다(`SELECTOR_NOT_SUPPORTED`). 클래스로 고르면 아무 일도 일어나지
// 않습니다.
export const screenId = "journey-map-screen";
export const scrollId = "journey-map-screen-scroll";

/** 머리 카드 상자의 id입니다 — 자동 스크롤이 가려지는 위쪽 띠를 잽니다. */
export const headerCardId = "journey-map-screen-header";

/** `centerX`는 가로 중심입니다. 호스트가 `left` · `width`를 주지 않으면 `null`이고, 그것은 실패가 아닙니다. */
export type MeasuredRect = {
  readonly top: number;
  readonly height: number;
  readonly centerX: number | null;
  readonly left: number | null;
  readonly width: number | null;
};

export type MapScrollBehavior = "smooth" | "instant";

// 요소 하나의 자리를 묻습니다. 못 재면(실패 · 값 없음 · 던짐) `null`을 냅니다.
function queryRect(id: string, onRect: (rect: MeasuredRect | null) => void): void {
  "background only";
  try {
    lynx
      .createSelectorQuery()
      .select(`#${id}`)
      .invoke({
        method: "boundingClientRect",
        success: (
          rect: { top?: number; height?: number; left?: number; width?: number } | null | undefined,
        ) => {
          if (typeof rect?.top !== "number" || typeof rect.height !== "number") {
            onRect(null);
            return;
          }
          // 가로 값을 못 읽어도 실패가 아닙니다 — 꼬리만 가운데로 남습니다.
          const left = typeof rect.left === "number" ? rect.left : null;
          const width = typeof rect.width === "number" ? rect.width : null;
          const centerX = left !== null && width !== null ? left + width / 2 : null;
          onRect({ top: rect.top, height: rect.height, centerX, left, width });
        },
        fail: () => onRect(null),
      })
      .exec();
  } catch {
    onRect(null);
  }
}

// 요소 여럿의 자리를 한 번에 잽니다. 하나라도 못 재면 `null`을 냅니다 — 반쪽짜리 값으로
// 자리를 계산하지 않습니다. 잴 것이 없으면 빈 답을 바로 냅니다 — 답이 영영 안 오는
// 일이 없습니다.
export function measureRects(
  ids: readonly string[],
  onDone: (rects: readonly MeasuredRect[] | null) => void,
): void {
  "background only";
  measureRectsWithOptional(ids, [], (rects) => onDone(rects));
}

/**
 * `ids`는 하나라도 못 재면 `rects`가 `null`입니다(`measureRects`와 같은 규칙). `optionalIds`는 못 잰 자리만
 * `null`이고 나머지에 영향을 주지 않습니다. 질의는 전부 한꺼번에 냅니다 — 차례로 내면 답이 미뤄지는
 * 대역에서 선택 답이 한 번 더 늦습니다.
 */
export function measureRectsWithOptional(
  ids: readonly string[],
  optionalIds: readonly string[],
  onDone: (
    rects: readonly MeasuredRect[] | null,
    optional: readonly (MeasuredRect | null)[],
  ) => void,
): void {
  "background only";
  const rects: MeasuredRect[] = [];
  const optional: (MeasuredRect | null)[] = optionalIds.map(() => null);
  let pending = ids.length + optionalIds.length;
  let settled = false;
  const settle = (result: readonly MeasuredRect[] | null) => {
    if (!settled) {
      settled = true;
      onDone(result, result === null ? optionalIds.map(() => null) : optional);
    }
  };
  const answered = () => {
    pending -= 1;
    if (pending === 0) {
      settle(rects);
    }
  };
  if (pending === 0) {
    settle(rects);
    return;
  }
  ids.forEach((id, index) => {
    queryRect(id, (rect) => {
      if (rect === null) {
        settle(null);
        return;
      }
      rects[index] = rect;
      answered();
    });
  });
  optionalIds.forEach((id, index) => {
    queryRect(id, (rect) => {
      optional[index] = rect;
      answered();
    });
  });
}

// `scrollIntoView`의 `behavior`는 `"smooth" | "none"`입니다.
function intoViewBehavior(behavior: MapScrollBehavior): "smooth" | "none" {
  return behavior === "smooth" ? "smooth" : "none";
}

/** 맵을 그 스크롤 자리로 옮깁니다. */
export function scrollMapTo(scrollTop: number, behavior: MapScrollBehavior): void {
  "background only";
  try {
    lynx
      .createSelectorQuery()
      .select(`#${scrollId}`)
      .invoke({ method: "scrollTo", params: { offset: scrollTop, smooth: behavior === "smooth" } })
      .exec();
  } catch {
    // 자리를 못 옮겨도 말풍선은 유닛 곁에 떠 있습니다.
  }
}

// 자리를 못 쟀을 때의 길입니다 — 그 id의 상자를 가운데로 옮기는 일을 호스트에 맡깁니다.
export function scrollNodeIntoView(domId: string, behavior: MapScrollBehavior): void {
  "background only";
  try {
    lynx
      .createSelectorQuery()
      .select(`#${domId}`)
      .invoke({
        method: "scrollIntoView",
        params: {
          scrollIntoViewOptions: { block: "center", behavior: intoViewBehavior(behavior) },
        },
      })
      .exec();
  } catch {
    // 자리를 못 옮겨도 맵은 그대로 쓸 수 있습니다.
  }
}
