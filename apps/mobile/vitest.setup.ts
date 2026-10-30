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

// 여정 맵의 마지막 스크롤 자리는 앱이 떠 있는 동안 모듈에 남습니다 — 테스트마다 「이 실행에서 처음 여는 맵」으로
// 시작하게 지웁니다.
import { afterEach, beforeEach, vi } from "vitest";
import { setTicketDropWaitForTests } from "./src/app/use-learning-tickets";
import { forgetMapScroll } from "./src/screens/journey-map/journey-map-scroll-memory";

// 내장 콘텐츠는 버킷 최신본으로 자주 바뀝니다. 문장 · 단계 · 소리 id를 짚는 테스트가 그때마다 깨지지 않게, 내장
// 카탈로그와 그 그림 표를 2026-10-23 고정본으로 바꿉니다. 실제 내장본을 보는 테스트는 `vi.unmock`으로 되돌립니다
// (`episode-bundled.live.unit.test.ts` · `bundled-content-images.unit.test.ts`).
vi.mock("./src/lib/episode-bundled", () => import("./src/lib/episode-bundled.test-support"));
vi.mock(
  "./src/lib/bundled-content-images",
  () => import("./src/lib/bundled-content-images.test-support"),
);

// 새 레슨에 티켓을 쓰면 앱은 머리 칩이 줄어드는 것(시안 E4)을 보인 뒤 학습을 엽니다. 그 기다림이 주제가 아닌
// 테스트는 Start 직후 학습을 찾으므로 기본으로 끕니다 — 기다림은 `App.learning-tickets.integration.test.tsx`가
// 켜고 봅니다.
beforeEach(() => {
  setTicketDropWaitForTests(false);
});

afterEach(() => {
  forgetMapScroll();
});

// 시험 환경은 렌더 · 이벤트마다 스레드를 바꾸면서 전역 `SystemInfo`를 스레드 쪽 객체로 덮어씁니다. 그러면 시험이 창
// 크기를 바꿔 둔 값(작은 기기 흉내)이 렌더에 닿기 전에 사라집니다. 스레드 쪽 `SystemInfo`를 「지금 전역 값(없으면
// 처음 객체)」을 돌려주는 접근자로 바꿔, 덮어쓰기가 시험이 둔 값을 그대로 다시 쓰게 합니다.
type ThreadScope = { SystemInfo?: unknown };
const testingEnv = (
  globalThis as unknown as {
    lynxTestingEnv?: {
      backgroundThread: { globalThis: ThreadScope };
      mainThread: { globalThis: ThreadScope };
    };
  }
).lynxTestingEnv;
for (const thread of testingEnv === undefined
  ? []
  : [testingEnv.backgroundThread, testingEnv.mainThread]) {
  const scope = thread.globalThis;
  if (!("SystemInfo" in scope)) continue;
  let base = scope.SystemInfo;
  Object.defineProperty(scope, "SystemInfo", {
    configurable: true,
    enumerable: true,
    get: () => (globalThis as ThreadScope).SystemInfo ?? base,
    set: (value: unknown) => {
      base = value;
    },
  });
}
