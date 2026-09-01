// jest-dom 매처를 vitest의 expect에 붙인다 (ADR-0006 D4).
//
// Lynx 요소는 `LynxElement extends HTMLElement`이고 실제로 jsdom 트리에 붙는다
// (`document.body.contains(el)` → true). 그래서 구조 매처가 그대로 동작한다.
//
// **쓰지 않는 매처가 있다.** `toBeVisible`·`toHaveStyle`·`toHaveClass`는 계산된
// 스타일에 의존하는데 jsdom은 Lynx 스타일을 계산하지 않는다. 통과해도 의미가 없고,
// 더 나쁘게는 거짓 확신을 준다 — jsdom 기본값으로 항상 통과할 수 있다.
// `docs/screens.md`가 정한 "무엇이 보이는가가 아니라 무엇이 있는가"와 같은 선이다.
// 시각 판정은 `docs/e2e/`의 수동 확인 몫이다.
import "@testing-library/jest-dom/vitest";
