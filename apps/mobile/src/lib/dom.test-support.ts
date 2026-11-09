// ui 테스트 지원 — Lynx 테스트 환경은 컴포넌트 경계마다 `WRAPPER` 요소를 끼웁니다. 구조(자식 순서 · 개수)를
// 보는 테스트가 컴포넌트를 나누고 합치는 구현 선택에 흔들리지 않도록, WRAPPER를 걷어 낸 자식을 돌려줍니다.
// 제품 코드는 이 파일을 import하지 않습니다.

/** WRAPPER 요소를 투명하게 걷은 직계 자식 요소들입니다. */
export function realChildren(element: Element | null | undefined): Element[] {
  if (element === null || element === undefined) return [];
  return Array.from(element.children).flatMap((child) =>
    child.tagName === "WRAPPER" ? realChildren(child) : [child],
  );
}

/** 주어진 요소들이 문서 순서대로(앞 → 뒤) 늘어서 있는지. */
export function isInDocumentOrder(elements: readonly Element[]): boolean {
  return elements.every((element, index) => {
    const next = elements[index + 1];
    return next === undefined || (element.compareDocumentPosition(next) & 4) !== 0;
  });
}
