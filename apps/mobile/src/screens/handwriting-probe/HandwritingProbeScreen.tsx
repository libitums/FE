import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";
import { color } from "@libitums/design-tokens";

import { DrawingSurface } from "./DrawingSurface";
import { probeStrokeWidth, probeSurfaceSize } from "./handwriting-probe";
import { readHandwriting } from "../../lib/handwriting-recognition";
import type { HandwritingReadOutcome, Stroke } from "../../lib/handwriting-recognition";

import "./handwriting-probe-screen.css";

// **개발용 탐침이고 사용자 도달 경로가 0건입니다.** 어느 코드도 이 화면을
// push하지 않습니다 — 여기 닿으려면 `navigation.ts`의 `handwritingProbeNav`를
// 부팅 상태로 손수 바꿔 끼워야 합니다. 바텀 네비게이션·여정 맵 어디에도 진입점이
// 없습니다.
//
// ADR-0022 3분할: [고정] 머리 · [흐름] `<scroll-view>` · [고정] 액션 행.
// ⭐ 그리기 표면은 **액션 행**에 있습니다 — 스크롤 영역 안에 두면 표면과 스크롤이
// 같은 제스처를 다투게 되고, 그 다툼은 이 탐침이 답하기로 한 축이 아닙니다. 표면을
// 고정 영역에 둬서 우회했다는 사실이 이 자리의 결정입니다.
//
// 「액션 행」의 이름과 내용이 갈립니다: ADR-0022 D1은 액션 행을 「나아가는
// 수단」으로 적는데 탐침에는 나아갈 곳이 없고 **조작**만 있습니다. 새 고정
// 영역을 만들지 않는 쪽을 골랐습니다 — 그래야 3분할이 글자 그대로 서고 「스크롤
// 영역은 정확히 하나」가 지켜집니다.

/**
 * 결과 줄 한 자리가 싣는 값입니다.
 *
 * 접점 모듈은 「요청이 갔는가」(`HandwritingReadRequestOutcome`)와 「결과가
 * 무엇인가」(`HandwritingReadOutcome`)를 **다른 값**으로 가릅니다 — 같은 사실을
 * 두 자리가 지지 않게 하려는 결정입니다. 그 둘을 사람이 읽을 한 줄로 합치는
 * 것은 **표시의 선택**이므로, 접점의 union에 멤버를 더하지 않고 여기 지역
 * 타입으로 만듭니다.
 */
type ProbeResultLine = HandwritingReadOutcome | { readonly status: "unavailable" };

export function HandwritingProbeScreen(): ReactNode {
  const [strokes, setStrokes] = useState<readonly Stroke[]>([]);
  const [cancels, setCancels] = useState(0);
  const [result, setResult] = useState<ProbeResultLine | null>(null);
  const [reading, setReading] = useState(false);

  // ⚠ 이 목록은 **이 컴포넌트가 도는 스레드의 전역**입니다 — ReactLynx에서
  // 컴포넌트 본문은 백그라운드 스레드에서 돌므로 메인 스레드(worklet)가 보는
  // 전역 셋과 다릅니다. 실기에서 눈으로 읽을 때 그 차이를 잊지 않도록 여기
  // 적습니다.
  //
  // 계산을 순수 모듈에 넣지 않는 근거: 입력이 환경이라 결정적 기대값을 적을 수
  // 없고, unit에 넣으면 공허한 케이스가 됩니다. ui는 **자기 정합성**(적은 수 =
  // 그린 줄 수, 오름차순)까지만 봅니다.
  const globals = [...Object.keys(globalThis)].sort();

  const clear = () => {
    setStrokes([]);
    setCancels(0);
    setResult(null);
  };

  const read = () => {
    // 연타 방어는 화면이 집니다 — 접점 모듈에 상태를 두면 진실이 둘이 됩니다.
    if (reading) {
      return;
    }

    setReading(true);
    setResult(null);

    const requested = readHandwriting(
      {
        width: probeSurfaceSize.width,
        height: probeSurfaceSize.height,
        strokeWidth: probeStrokeWidth,
        strokes,
      },
      (outcome) => {
        setReading(false);
        setResult(outcome);
      },
    );

    // 모듈이 없으면 `onResult`가 아예 오지 않습니다 — 요청이 안 간 것을 결과가
    // 아니라 요청의 반환값이 답합니다. 그 사실을 사람이 읽을 수 있게 줄에 세웁니다.
    if (requested === "unavailable") {
      setReading(false);
      setResult({ status: "unavailable" });
    }
  };

  return (
    <view className="handwriting-probe-screen">
      {/* [고정] 머리 — 나가는 수단이 없습니다. 탭 루트 자리라 바텀 네비게이션이 집니다. */}
      <view className="handwriting-probe-screen-header">
        <text
          className="handwriting-probe-screen-title"
          data-testid="handwriting-probe-screen-title"
          accessibility-traits="header"
        >
          손글씨 탐침
        </text>
      </view>

      {/* [흐름] 스크롤 — 화면당 정확히 하나, 중첩 없음. 클래스와 `data-testid`가
          같은 문자열입니다. 속성은 `scroll-orientation`·`scroll-bar-enable`
          둘뿐이고 `bounces`·`enable-scroll`을 쓰지 않습니다. `accessibility-*`는
          붙이지 않습니다 — 조작 단위가 아니라 상자입니다(ADR-0022 D5). */}
      <scroll-view
        className="handwriting-probe-screen-scroll"
        data-testid="handwriting-probe-screen-scroll"
        scroll-orientation="vertical"
        scroll-bar-enable={true}
      >
        {/* 직계 자식은 이것 하나뿐입니다(ADR-0022 D4). 전역 목록이 한 벌로 두
            값을 합니다: 표면이 스크롤과 다투지 않는다는 관측에는 **다툴 스크롤이
            실제로 있어야** 하고, 동시에 ADR-0017 D1 조건 2의 「JS 런타임 전역
            셋」을 실기에서 눈으로 확인하는 수단이 됩니다. */}
        <view
          className="handwriting-probe-screen-globals"
          data-testid="handwriting-probe-screen-globals"
          data-globals={String(globals.length)}
        >
          {globals.map((name) => (
            <text className="handwriting-probe-screen-global" key={name}>
              {name}
            </text>
          ))}
        </view>
      </scroll-view>

      {/* [고정] 액션 행 — `<scroll-view>` 밖의 화면 직계 자식입니다(ADR-0022 D1). */}
      <view
        className="handwriting-probe-screen-actions"
        data-testid="handwriting-probe-screen-actions"
      >
        <DrawingSurface
          strokes={strokes}
          width={probeSurfaceSize.width}
          height={probeSurfaceSize.height}
          color={color.fg.neutral}
          strokeWidth={probeStrokeWidth}
          onStrokeComplete={(stroke) => setStrokes((current) => [...current, stroke])}
          onStrokeCancel={() => setCancels((current) => current + 1)}
        />

        {/* 지우기는 표면의 책임이 아닙니다 — 끝난 획의 주인이 화면이라서입니다.
            실기에서 여러 번 시도하려면 앱을 다시 켜지 않고 비울 수단이 있어야
            합니다. */}
        <view
          className="handwriting-probe-screen-clear"
          data-testid="handwriting-probe-screen-clear"
          accessibility-element={true}
          accessibility-traits="button"
          accessibility-label="지우기"
          bindtap={clear}
        >
          <text className="handwriting-probe-screen-button-label">지우기</text>
        </view>

        <view
          className="handwriting-probe-screen-read"
          data-testid="handwriting-probe-screen-read"
          accessibility-element={true}
          accessibility-traits="button"
          accessibility-label="읽기"
          bindtap={read}
        >
          <text className="handwriting-probe-screen-button-label">읽기</text>
        </view>

        {/* 결과 줄 — `data-status`가 판정의 자리입니다. `read`+빈 문자열 /
            `read`+틀린 글자 / `language-unsupported` / `failed`가 **각각 다른
            답**이라 접지 않습니다. */}
        <text
          className="handwriting-probe-screen-result"
          data-testid="handwriting-probe-screen-result"
          data-status={result === null ? "" : result.status}
        >
          {result !== null && result.status === "read" ? result.text : ""}
        </text>

        {/* 계수 줄 — 사람이 실기에서 읽는 관측값입니다. 획이 하나도 안 보일 때
            `data-strokes`가 느는지가 「좌표는 왔는데 렌더가 문제」와 「바인딩이
            안 닿는다」를 가르고, `data-cancels`가 시스템이 제스처를 가져가는지를
            보입니다. */}
        <text
          className="handwriting-probe-screen-counts"
          data-testid="handwriting-probe-screen-counts"
          data-strokes={String(strokes.length)}
          data-cancels={String(cancels)}
        >
          {`획 ${strokes.length} · 취소 ${cancels}`}
        </text>
      </view>
    </view>
  );
}
