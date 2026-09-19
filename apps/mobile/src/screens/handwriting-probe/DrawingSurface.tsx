import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";
import type { TouchEvent } from "@lynx-js/types";

import { strokePathData, strokesSvgDocument } from "./handwriting-probe";
import type { DrawingSurfaceProps } from "./handwriting-probe.contract";
import type { StrokePoint } from "../../lib/handwriting-recognition";

import "./drawing-surface.css";

// LIB-263 (ui): 계약 .agent-harness/work/lib-263/spec.md §2.
//
// 이 컴포넌트가 드는 상태는 **진행 중인 획 하나뿐**이다(§2.4). 끝난 획은 화면이
// 들고 `strokes`로 내려온다 — `touchmove`마다 바뀌는 값을 위로 올리면 매 프레임
// 화면 전체가 다시 렌더된다. 그리는 것은 `[...strokes, 진행 중인 획]`이고, 그 합성은
// 렌더 시점에 만들어져 어디에도 저장되지 않는다. 진실이 둘이 되지 않는다.

/**
 * 이벤트에서 표면 기준 좌표 하나를 꺼낸다. 꺼낼 것이 없으면 `undefined`다.
 *
 * `x`·`y`를 읽는 근거(§2.5): `@lynx-js/types`가 `x`/`y`를 **닿은 요소 기준**으로,
 * `pageX`/`clientX`를 각각 페이지·표시 영역 기준으로 적는다. `viewBox`가 표면 박스와
 * 같은 수라 표면 기준 좌표만이 좌표 변환 없이 그대로 맞물린다.
 *
 * ⚠ 타입은 `touches: Array<Touch>`라 **런타임의 부재·빈 배열을 TS가 막아 주지
 * 않는다.** 그래서 낙관하지 않고 조용히 버린다 — 던지면 그림 한 점 때문에 화면이
 * 죽고, 그것이 탐침의 관측을 통째로 가린다.
 */
function touchPoint(event: TouchEvent): StrokePoint | undefined {
  const [touch] = event.touches ?? [];

  if (touch === undefined) {
    return undefined;
  }

  return { x: touch.x, y: touch.y };
}

export function DrawingSurface({
  strokes,
  width,
  height,
  color,
  strokeWidth,
  onStrokeComplete,
  onStrokeCancel,
}: DrawingSurfaceProps): ReactNode {
  const [points, setPoints] = useState<readonly StrokePoint[]>([]);

  // `catch*`가 아니라 `bind*`인 근거(§2.3): 표면은 화면의 **고정 영역** 안에 있고
  // 스크롤 영역은 형제다 — 조상 사슬에 터치 핸들러가 없어 막을 대상이 0건이다.
  // `catch`를 쓰면 다음 사람이 「막아야 해서 막았다」로 읽고 제스처 우선순위 문제가
  // 확인된 줄 안다. 이 탐침은 그 축을 답하지 않았고 **우회**했을 뿐이다.
  //
  // 바인딩을 `<svg>` 자기 자신에 다는 근거: `Touch`의 `x`·`y`가 **닿은 요소** 기준이라
  // 리스너와 타깃이 다른 요소면 어느 상자 기준인지가 미확인 축으로 남는다.
  const begin = (event: TouchEvent) => {
    const point = touchPoint(event);

    if (point === undefined) {
      return;
    }

    // 진행 중인 획 위에 새 `touchstart`가 오는 자리다 — 손가락을 떼지 않았는데 둘째
    // 손가락이 닿으면 이렇게 된다. 진행분을 **취소로 보고하고** 새 획을 연다.
    //
    // 왜 완성이 아니라 취소인가: 끼어듦은 **중단**이지 사용자가 그으려던 획의 끝이
    // 아니다. 완성으로 올리면 긋다 만 조각이 끝난 획 목록에 들어가 글자에 섞이고,
    // 그러면 인식 결과가 사용자가 쓰지 않은 획까지 보고 답한다(Q3의 답이 오염된다).
    //
    // 왜 조용히 버리지 않는가: 이 화면의 관측 도구가 계수 줄(`data-strokes` ·
    // `data-cancels`)이다. 아무 콜백도 부르지 않고 버리면 모은 점이 **어느 수도 늘리지
    // 않고** 사라지고, 그러면 `docs/e2e/handwriting-probe.md`의 E3을 읽는 사람이 그
    // 소실을 「터치 바인딩이 실기에서 안 닿는다」로 오독한다. 탐침이 거짓 답을 낳는
    // 것보다 취소로 세는 편이 낫다 — 취소로 세면 M2가 재려던 것(손가락 둘을 얹었을 때
    // 무슨 일이 나는가)이 실제로 재어진다.
    if (points.length > 0) {
      onStrokeCancel();
    }

    setPoints([point]);
  };

  // 같은 좌표가 연달아 와도 솎아내지 않는다 — 솎아냄은 몇 획까지 견디는지(Q2)를
  // 실기에서 먼저 보고 정할 일이고, 미리 넣으면 그 관측이 왜곡된다.
  const extend = (event: TouchEvent) => {
    const point = touchPoint(event);

    if (point === undefined) {
      return;
    }

    setPoints((current) => [...current, point]);
  };

  // ⚠ `touchend`·`touchcancel`에서 좌표를 읽지 않는다(§2.5). 웹 규약에서 `touchend`의
  // `touches`가 비는 것이 알려져 있고 Lynx가 어느 쪽인지 확인되지 않았다 — 읽지 않으면
  // 그 미확인이 계약에 들어오지 않는다. 마지막 좌표는 직전 `touchmove`가 이미 넣었다.
  const finish = () => {
    if (points.length === 0) {
      return;
    }

    onStrokeComplete(points);
    setPoints([]);
  };

  // 취소된 획은 **확정하지 않고 버린다**. 확정해 버리면 「취소가 잦다」는 신호가 획
  // 속에 묻히는데, 그 신호가 곧 시스템 제스처와의 경쟁 관측이다.
  const cancel = () => {
    setPoints([]);
    onStrokeCancel();
  };

  const drawn = points.length === 0 ? strokes : [...strokes, points];

  return (
    <svg
      className="drawing-surface"
      data-testid="drawing-surface"
      // 노출용 `data-` 이름은 하이픈 없는 한 낱말이다 — 하이픈을 더 넣으면
      // `dataset` 대입이 `SyntaxError`로 터져 렌더 자체가 죽는다.
      data-strokes={String(strokes.length)}
      data-points={String(points.length)}
      data-path={strokePathData(points)}
      // 색은 `current-color`가 아니라 이 문자열 안의 SVG `stroke` 속성이 진다(§1.6) —
      // 「그었는데 안 보인다」가 좌표 실패인지 색 해석 실패인지로 갈리는 것을 막는다.
      content={strokesSvgDocument(drawn, { width, height, color, strokeWidth })}
      bindtouchstart={begin}
      bindtouchmove={extend}
      bindtouchend={finish}
      bindtouchcancel={cancel}
    />
  );
}
