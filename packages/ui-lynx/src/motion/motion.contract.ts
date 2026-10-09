/** 움직임 정책입니다. `reduced`는 이동 · 확대를 걷고 색 · 불투명도 전환만 남깁니다. */
export type Motion = "standard" | "reduced";

/** Provider가 없을 때의 값입니다. */
export const defaultMotion: Motion = "standard";

/** 명시 prop > 컨텍스트. explicit이 두 값 중 하나가 아니면(undefined · 잘못된 문자열) context. 던지지 않는다. */
export function resolveMotion(explicit: Motion | undefined, context: Motion): Motion {
  return explicit === "standard" || explicit === "reduced" ? explicit : context;
}

/** explicit이 boolean이면 그것, 아니면 context === "reduced". */
export function resolveReducedMotion(explicit: boolean | undefined, context: Motion): boolean {
  return typeof explicit === "boolean" ? explicit : context === "reduced";
}

/** 호스트가 보낸 boolean을 `Motion`으로 옮깁니다. true → "reduced". */
export function motionFromReducedMotion(reduced: boolean): Motion {
  return reduced ? "reduced" : "standard";
}

/** reduced일 때만 `${block}-motion-reduced`, standard면 undefined(클래스에 아무것도 더하지 않는다). */
export function motionClassName(block: string, motion: Motion): string | undefined {
  return motion === "reduced" ? `${block}-motion-reduced` : undefined;
}
