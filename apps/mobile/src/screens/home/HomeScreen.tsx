// 아이콘은 필요한 이름의 subpath만 가져온다. SVG XML 문자열을 그대로 받는
// `<svg content>` 경로를 쓴다 — `<image>`로 SVG를 쓰려면 loader가 필요하고
// FE에는 만들지 않는다 (ADR-0014 D6).
import house from "@libitums/icons/lynx/house";

// 아이콘 색에 한해 TS token 상수를 쓴다 (ADR-0014 D2). Lynx `<svg>`는 CSS
// `color`를 읽지 않고 `current-color` 속성만 받는데, 속성이라 `var()`가 풀리지
// 않는다. 시각 값 중 CSS 커스텀 프로퍼티로 지정할 수 없는 유일한 항목이다.
import { color } from "@libitums/design-tokens";

import "./home-screen.css";

// 화면 컴포넌트: 파일명 PascalCase, export 이름과 일치, `~Screen` 접미사 (ADR-0003 D6).
export function HomeScreen() {
  return (
    <view className="home-screen">
      <view className="home-screen-header">
        <svg
          data-testid="home-screen-icon"
          className="home-screen-icon"
          content={house}
          current-color={color.fg.neutral}
        />
        <text
          data-testid="home-screen-title"
          className="home-screen-title"
          accessibility-traits="header"
        >
          홈
        </text>
      </view>
      {/* [흐름] 내용 슬롯 — LIB-226 계약 §1.5. 지금은 자식이 없다. `scroll-orientation`·
          `scroll-bar-enable`을 적는다 — 안 적으면 초기값이 각각 가로·꺼짐이라
          세로 스크롤이 원리적으로 불가능하다(계약 R5.2·R5.3). accessibility-*를
          붙이지 않는다(계약 R6). */}
      <scroll-view
        className="home-screen-scroll"
        data-testid="home-screen-scroll"
        scroll-orientation="vertical"
        scroll-bar-enable={true}
      ></scroll-view>
    </view>
  );
}
