import { fireEvent } from "@lynx-js/react/testing-library";

/**
 * Lynx처럼 누릅니다 — 눌린 요소부터 조상으로 올라가며 bindtap을 부르고, catchtap을 만나면 그것을 부르고 멈춥니다.
 * 시험 라이브러리는 bind · catch를 서로 다른 이벤트로 퍼뜨려, 그대로 쓰면 catchtap이 단 요소를 못 누르고 bindtap의 번짐도 막지 못합니다.
 */
export const tapEl = (el: Element, init: { readonly detail?: unknown } = {}): void => {
  for (let node: Element | null = el; node !== null; node = node.parentElement) {
    const map = (node as { eventMap?: Record<string, unknown> }).eventMap;
    if (map?.["bindEvent:tap"] !== undefined) fireEvent.tap(node, { ...init, bubbles: false });
    if (map?.["catchEvent:tap"] !== undefined) {
      fireEvent.tap(node, { ...init, bubbles: false, eventType: "catchEvent" });
      return;
    }
  }
};
