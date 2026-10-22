// DOM 반영의 작은 도우미입니다 — test-id로 찾기 · hidden · 속성 · 글자(값이 같으면 건드리지 않음).

export const byTestId = (scope: ParentNode, id: string) =>
  scope.querySelector<HTMLElement>(`[data-testid="${id}"]`);

export const allByTestId = (scope: ParentNode, id: string) => [
  ...scope.querySelectorAll<HTMLElement>(`[data-testid="${id}"]`),
];

export function setHidden(element: Element | null, hidden: boolean): void {
  if (element === null) return;
  if (hidden) element.setAttribute("hidden", "");
  else element.removeAttribute("hidden");
}

export function setAttr(element: Element | null, name: string, value: string): void {
  if (element !== null && element.getAttribute(name) !== value) element.setAttribute(name, value);
}

export function setText(element: Element | null, value: string): void {
  if (element !== null && element.textContent !== value) element.textContent = value;
}
