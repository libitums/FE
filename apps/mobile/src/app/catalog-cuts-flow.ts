// 카탈로그 컷 route 하나 안의 걸음 전이와 표지 제목의 줄 상한입니다 — 순수 함수와 상수만 둡니다.

/** 컷 route 하나 안의 걸음입니다. `left`는 화면이 없는 끝 걸음입니다. */
export type CatalogCutsFlowStep = "intro" | "cuts" | "banner" | "left";

export type CatalogCutsFlowEvent = "continue" | "skip" | "exit" | "cuts-done" | "banner-done";

/** 표지 둘째 줄을 줄로 나눌 때 한 줄의 글자 수 상한입니다(잠정 — 실기에서 확정). */
export const CATALOG_INTRO_TITLE_MAX_CHARS = 10;

const transitions: Readonly<
  Partial<Record<CatalogCutsFlowStep, Partial<Record<CatalogCutsFlowEvent, CatalogCutsFlowStep>>>>
> = {
  intro: { continue: "cuts", skip: "left", exit: "left" },
  cuts: { "cuts-done": "banner", exit: "left" },
  banner: { "banner-done": "left" },
};

/** 표에 없는 짝은 받은 걸음을 그대로 돌려줍니다 — 던지지 않습니다. */
export function nextCatalogCutsFlowStep(
  step: CatalogCutsFlowStep,
  event: CatalogCutsFlowEvent,
): CatalogCutsFlowStep {
  return transitions[step]?.[event] ?? step;
}
