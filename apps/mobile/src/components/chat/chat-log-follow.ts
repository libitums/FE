// 대화 로그 끝 맞춤의 순수 규칙입니다 — 끝까지 남은 거리 · 부드럽게 갈지 · 뷰포트가 줄 때 다시 맞출지.

/** 끝에서 이만큼(px) 안이면 「끝을 보고 있다」고 봅니다. */
export const NEAR_END_PX = 48;
/** 끝까지 이만큼(px) 이하면 부드럽게 가지 않고 바로 닿습니다(스트리밍 한 줄 · 사진 자리). */
export const SHORT_SCROLL_PX = 160;
/** 우리가 시작한 부드러운 스크롤이 이만큼(ms) 지나도 scrollend가 없으면 끝난 것으로 봅니다. */
export const FOLLOW_STALE_MS = 700;

export type ScrollPosition = { readonly scrollTop?: number; readonly scrollHeight?: number };

/** 끝까지 남은 거리(px) = scrollHeight − scrollTop − 뷰포트 높이. 값 하나라도 모르면 null. */
export function endDistance(
  position: ScrollPosition | null,
  viewport: number | null,
): number | null {
  if (position === null || viewport === null) return null;
  const { scrollTop, scrollHeight } = position;
  if (typeof scrollTop !== "number" || typeof scrollHeight !== "number") return null;
  return scrollHeight - scrollTop - viewport;
}

/**
 * 끝으로 부드럽게 갈지 — 움직임 줄이기 · 방에 들어와 처음 맞추는 동안(기록 전체를 훑어 내리지 않게) · 남은 거리가 짧을 때는
 * 바로 닿습니다. 거리를 모르면 부드럽게 갑니다.
 */
export function smoothToEnd(input: {
  readonly motion: boolean;
  readonly entering: boolean;
  readonly distance: number | null;
}): boolean {
  if (!input.motion || input.entering) return false;
  return input.distance === null || input.distance > SHORT_SCROLL_PX;
}

/** 뷰포트가 줄었고(띠 · 판 · 키보드가 섬) 끝 근처였으면 다시 끝에 맞춥니다 — 마지막 말이 잘리지 않게. */
export function realignOnShrink(previous: number | null, next: number, nearEnd: boolean): boolean {
  return previous !== null && next < previous && nearEnd;
}
