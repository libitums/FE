import type { Motion } from "@libitums/ui-lynx/motion";

/** 스토리 args의 motion 값을 컴포넌트가 받는 `Motion`으로 정리합니다. 지금은 늘 standard입니다. */
export function normalizeStoryMotion(value: unknown): Motion {
  void value;
  return "standard";
}
