// 바탕 위에 놓인 것(글 상자 · 단어 스티커)의 끝단 — 순수. 크기 상한과 자리 제한을 회전한 상자의 외접 사각형으로 계산합니다.
// 오른쪽은 편집 화면의 도구 열(Text · Words)만큼 더 비워 ×·손잡이가 도구 열에 가리지 않게 합니다.

import { clamp, MAX_SCALE, MIN_SCALE, round, type Placement } from "./my-story-editor";

/** 바탕 가장자리 여백(px) — 상자 모서리의 ×·손잡이(바깥으로 12px)가 바탕 안 · Android 화면 끝 제스처 영역(약 24dp) 밖에 남게. */
export const STORY_EDGE = 36;
/** 오른쪽 도구 열의 폭(px) — `.my-story-tool`의 width(`--libitum-spacing-64`). 열 자체는 바탕 오른쪽 12px 안쪽에 섭니다. */
export const TOOL_COLUMN = 64;

export type BoxSize = { readonly width: number; readonly height: number };
export type CanvasBox = BoxSize;

/** 회전한 상자의 외접 사각형 — |w·cosθ| + |h·sinθ|, |w·sinθ| + |h·cosθ|. */
export function rotatedBounds(size: BoxSize, rotation: number): BoxSize {
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  return {
    width: size.width * cos + size.height * sin,
    height: size.width * sin + size.height * cos,
  };
}

/**
 * 끝단 맞추기 — `sizeAt(s)`는 크기 s로 확정했을 때 상자의 px 크기(회전 전). 끄는 동안은 확정 크기(`settled`)의 상자를 transform으로
 * 키우므로 두 값 중 큰 쪽으로 재어, 끄는 중에도 · 손을 뗀 뒤에도 바탕 안에 남습니다(놓을 때 자리를 다시 고치지 않아 튀지 않음).
 * 크기는 외접 사각형이 바탕(가장자리 여백 · 도구 열 뺌)에 들 때까지만(서버 범위 0.5 ~ 3 안), 자리는 그 사각형이 바탕 안에 남게 안쪽으로
 * 밉니다. 바탕 크기를 모르면(0) 그대로.
 */
export function placedFit(
  sizeAt: (scale: number) => BoxSize,
  place: Pick<Placement, "scale" | "x" | "y"> & { readonly rotation?: number },
  canvas: CanvasBox,
  settled: number = place.scale,
): { scale: number; x: number; y: number } {
  const { scale, x, y } = place;
  if (canvas.width <= 0 || canvas.height <= 0) return { scale, x, y };
  const rotation = place.rotation ?? 0;
  const base = sizeAt(settled);
  const boundsAt = (s: number) => {
    const now = sizeAt(s);
    const ratio = settled > 0 ? s / settled : 1;
    return rotatedBounds(
      {
        width: Math.max(now.width, base.width * ratio),
        height: Math.max(now.height, base.height * ratio),
      },
      rotation,
    );
  };
  const right = STORY_EDGE + TOOL_COLUMN;
  const roomX = canvas.width - STORY_EDGE - right;
  const roomY = canvas.height - 2 * STORY_EDGE;
  const fits = (s: number) => {
    const b = boundsAt(s);
    return b.width <= roomX && b.height <= roomY;
  };
  const wanted = clamp(scale, MIN_SCALE, MAX_SCALE);
  let fitted = wanted;
  if (!fits(wanted)) {
    // 상자 크기는 s에 대해 늘기만 하므로 반으로 나눠 찾습니다. 아래로 내림(바탕 밖으로 반올림되지 않게).
    let low = MIN_SCALE;
    let high = wanted;
    for (let i = 0; i < 24; i += 1) {
      const mid = (low + high) / 2;
      if (fits(mid)) low = mid;
      else high = mid;
    }
    fitted = Math.max(MIN_SCALE, Math.floor(low * 1000) / 1000);
  }
  const bounds = boundsAt(fitted);
  const inside = (value: number, half: number, before: number, after: number) => {
    const low = half + before;
    const high = 1 - half - after;
    return low > high ? round((low + high) / 2) : round(clamp(value, low, high));
  };
  return {
    scale: round(fitted),
    x: inside(x, bounds.width / 2 / canvas.width, STORY_EDGE / canvas.width, right / canvas.width),
    y: inside(
      y,
      bounds.height / 2 / canvas.height,
      STORY_EDGE / canvas.height,
      STORY_EDGE / canvas.height,
    ),
  };
}
