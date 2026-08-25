import { expect, test } from "vitest";
import { render } from "@lynx-js/react/testing-library";

import { HomeScreen } from "./HomeScreen.js";

// `ui` 계층: 컴포넌트 렌더와 상호작용 (ADR-0006 D4).
// 계산된 스타일과 레이아웃은 단언할 수 없다 — 환경이 jsdom 기반이라
// `style` 속성은 선언한 문자열로만 남는다.
test("홈 화면이 제목을 렌더한다", () => {
  const { container } = render(<HomeScreen />);

  expect(container).toMatchInlineSnapshot(`
    <page>
      <view
        class="home-screen"
      >
        <text
          class="home-screen-title"
        >
          홈
        </text>
      </view>
    </page>
  `);
});
