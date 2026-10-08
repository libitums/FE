// 등록된 뒤로가기 핸들러가 없을 때의 기본 동작입니다(순수).

import { activeStack, isEntrySection, tabRootActions } from "./nav-reducer";
import type { Nav, NavAction } from "./nav-state";

export type BackDecision =
  | { readonly kind: "leave" }
  | { readonly kind: "navigate"; readonly actions: readonly NavAction[] };

export function defaultBackDecision(nav: Nav): BackDecision {
  if (isEntrySection(nav)) {
    return { kind: "leave" };
  }
  if (activeStack(nav).length > 1) {
    return { kind: "leave" };
  }
  if (nav.tab !== "journey") {
    return { kind: "navigate", actions: tabRootActions("journey") };
  }
  return { kind: "leave" };
}
