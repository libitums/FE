import { expect } from "vitest";
import { screen, within } from "@lynx-js/react/testing-library";

// 화면 ui 테스트가 함께 쓰는 완료 장면 단언입니다. 클래스는 보지 않고 `data-scene`과 구조만 봅니다.

// 자식 컴포넌트의 루트는 렌더러가 `<wrapper>`로 감쌀 수 있어 풀어서 봅니다.
const elementChildrenOf = (parent: Element): Element[] =>
  Array.from(parent.children).flatMap((child) =>
    child.tagName.toLowerCase() === "wrapper" ? elementChildrenOf(child) : [child],
  );

/** 문항 장면: 무대에 `data-scene`이 없다. */
export function expectQuestionScene(): void {
  expect(screen.getByTestId("learning-shell-stage").hasAttribute("data-scene")).toBe(false);
}

/**
 * 완료 장면: 무대가 `data-scene="complete"`이고 완료 카드가 무대 안에 서며,
 * 화면 내용 상자의 유일한 자식이 완료 카드 루트다(판정 자리 · 균형 자리가 없다).
 */
export function expectCompleteScene(contentTestId: string, completeTestId: string): void {
  const stage = screen.getByTestId("learning-shell-stage");
  expect(stage.getAttribute("data-scene")).toBe("complete");
  expect(within(stage).getByTestId(completeTestId)).toBeInTheDocument();

  const children = elementChildrenOf(screen.getByTestId(contentTestId));
  expect(children).toHaveLength(1);
  const only = children[0];
  const isCompleteRoot = (el: Element | undefined): boolean =>
    el?.getAttribute("data-testid") === "learning-activity-complete";
  expect(isCompleteRoot(only) || isCompleteRoot(only?.firstElementChild ?? undefined)).toBe(true);
}
