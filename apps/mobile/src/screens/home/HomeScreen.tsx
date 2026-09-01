// 아이콘은 필요한 이름의 subpath만 가져온다. Lynx는 `<image>`가 SVG를 지원하지
// 않으므로 SVG XML 문자열을 그대로 받는 `<svg content>` 경로를 쓴다 (ADR-0014 D6).
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
          data-testid="home-icon"
          className="home-screen-icon"
          content={house}
          current-color={color.fg.neutral}
        />
        <text data-testid="home-title" className="home-screen-title">
          홈
        </text>
      </view>
    </view>
  );
}
