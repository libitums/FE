// 호스트가 globalProps로 보내는 글자 배율 · 화면 폭을 읽는 순수 함수입니다.
// 읽는 꼴은 `safe-area.ts` · `reduced-motion.ts`와 같습니다 — 모양이 틀리면 `null`이고 던지지 않습니다.

function positiveNumberAt(globalProps: unknown, key: string): number | null {
  if (typeof globalProps !== "object" || globalProps === null) return null;
  const value: unknown = Reflect.get(globalProps, key);
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

/** 호스트 globalProps의 `fontScale`. 유한한 양수가 아니면 `null`. 던지지 않는다. */
export function fontScaleFrom(globalProps: unknown): number | null {
  return positiveNumberAt(globalProps, "fontScale");
}

/** 호스트 globalProps의 `viewportWidth`. 유한한 양수가 아니면 `null`. 던지지 않는다. */
export function viewportWidthFrom(globalProps: unknown): number | null {
  return positiveNumberAt(globalProps, "viewportWidth");
}
