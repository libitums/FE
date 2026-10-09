// 소스 모션 스캐너 — `.ts` · `.tsx`의 인라인 스타일에서 모션 선언을 찾습니다(순수).

/** 객체 스타일의 camelCase 이름과 CSS의 kebab 이름 짝입니다. */
export const motionPropertyNames = [
  { camel: "transition", kebab: "transition" },
  { camel: "transitionDuration", kebab: "transition-duration" },
  { camel: "transitionDelay", kebab: "transition-delay" },
  { camel: "transitionTimingFunction", kebab: "transition-timing-function" },
  { camel: "animation", kebab: "animation" },
  { camel: "animationDuration", kebab: "animation-duration" },
  { camel: "animationDelay", kebab: "animation-delay" },
  { camel: "animationTimingFunction", kebab: "animation-timing-function" },
];

/**
 * 소스 텍스트의 인라인 모션 선언을 `{ line, property, value, origin }`로 돌려줍니다.
 * 지금은 비어 있는 결과를 냅니다.
 */
export function inlineMotionDeclarationsIn(sourceText, fileName, ts) {
  void sourceText;
  void fileName;
  void ts;
  return [];
}
