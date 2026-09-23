import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { SpeechProbeActions } from "./SpeechProbeActions";
import { SpeechProbeObservations } from "./SpeechProbeObservations";
import {
  getSpeechStatus,
  isSpeechRecognitionAvailable,
  requestSpeechPermissions,
  startSpeechRecognition,
  stopSpeechRecognition,
} from "../../lib/speech-recognition";
import type {
  SpeechRequestOutcome,
  SpeechResult,
  SpeechStatus,
} from "../../lib/speech-recognition";

import "./speech-probe-screen.css";

// **개발용 탐침이고 사용자 도달 경로가 0건입니다.** 어느 코드도 이 화면을 push하지
// 않습니다 — 여기 닿으려면 `navigation.ts`의 `speechProbeNav`를 부팅 상태로 손수 바꿔
// 끼워야 합니다. 바텀 네비게이션·여정 맵 어디에도 진입점이 없습니다. 손글씨 탐침과 같은
// 방식이고, 같은 이유입니다: 제품 경로에 진입점을 내면 탐침이 제품이 됩니다.
//
// ADR-0022 3분할: [고정] 머리 · [흐름] `<scroll-view>` · [고정] 액션 행. 「액션 행」의
// 이름과 내용이 갈리는 것도 손글씨 탐침과 같습니다 — ADR-0022 D1은 액션 행을 「나아가는
// 수단」으로 적는데 탐침에는 나아갈 곳이 없고 **조작**만 있습니다. 새 고정 영역을 만들지
// 않는 쪽을 골랐습니다. 그래야 3분할이 글자 그대로 서고 「스크롤 영역은 정확히 하나」가
// 지켜집니다. 관측 줄은 수가 많아 흐름 영역이 집니다.
//
// ⭐ **이 화면은 판정하지 않습니다.** 「맞았다/틀렸다」를 말하는 자리가 없고, 정규화
// 후보를 골라 정본으로 삼지도 않습니다. 후보 전부를 나란히 놓고, 네이티브가 준 값을
// 있는 그대로 냅니다. 판정 규칙은 실기에서 본 뒤에 정할 일입니다.
//
// ⭐ **거부 조합의 처방도 이 단위가 정하지 않습니다.** 권한 상태 둘을 각각 줄로 내고
// 요청 수단을 늘 세워 둘 뿐, 조합에 따라 버튼을 감추거나 진행을 막지 않습니다. 무엇을
// 되돌리라고 할지는 말하기 **제품 화면**을 설계하는 단위의 몫이고(ADR-0026 D3·D4),
// 탐침이 먼저 고르면 그 화면이 관찰 대신 선택을 물려받습니다.
//
// 관측 줄·후보 대조 표는 `SpeechProbeObservations`가, 액션 버튼 다섯은
// `SpeechProbeActions`가 그립니다. 이 파일은 상태 다섯을 소유하고 네이티브 명령 넷을
// 부르며 골격(머리·스크롤·액션 행)을 세웁니다.

/**
 * 제시문입니다. 인식기가 무엇을 실어 오는지 보려면 순수 로직의 **두 축이 다 걸린
 * 문장**이어야 합니다 — 공백이 있고 문장부호가 있습니다. 둘 중 하나라도 없으면 후보
 * 절반이 같은 줄을 내서 표가 아무것도 가르지 못합니다.
 *
 * 화면이 문구를 짓지 않는다는 규약은 **후보 라벨**에 걸린 것이고(그쪽은
 * `speechNormalizationLabel`이 냅니다), 읽을 문장 자체는 순수 로직이 내지 않으므로 여기
 * 삽니다. 바꿔 가며 볼 값이라 상수 한 자리에 모아 둡니다.
 */
const probePrompt = "안녕하세요, 오늘 날씨가 좋네요.";

export function SpeechProbeScreen(): ReactNode {
  // 온디바이스를 **요구할지**를 사람이 고릅니다. 이 탐침의 핵심 관찰이 「요청한 것과
  // 실제로 보장된 것이 갈리는가」라, 요청을 고정해 두면 그 갈림의 한쪽만 보입니다.
  const [requireOnDevice, setRequireOnDevice] = useState(true);
  const [status, setStatus] = useState<SpeechStatus | null>(null);
  const [result, setResult] = useState<SpeechResult | null>(null);
  // 마지막 요청이 접점을 건넜는가 — ADR-0026 D3 **1단계**의 답입니다. 2단계의 값(위
  // `status`)과 다른 상태로 듭니다: 1단계에서 끝난 것을 권한이 비어 있는 것으로 읽으면
  // 「물을 자리가 없었다」가 「물었는데 답이 없다」로 보입니다.
  const [outcome, setOutcome] = useState<SpeechRequestOutcome | "">("");
  // **요청을 보내 놓고 결과를 기다리는 중인가.** 네이티브의 `listening`과 다른 값이고
  // 다른 일을 합니다 — 이것은 연타 방어용 지역 상태이고, 실제로 듣고 있는지는 네이티브만
  // 압니다(관측 줄의 `data-listening`이 그쪽입니다). 접점에 두지 않는 이유는 `audio.ts`가
  // 상태를 두지 않는 이유와 같습니다 — 두면 진실이 둘이 됩니다.
  const [awaiting, setAwaiting] = useState(false);

  // 1단계를 **관찰값으로** 냅니다. 이 값으로 UI를 가르지 않습니다 — 버튼도 줄도 그대로
  // 섭니다. 감추면 사람이 「권한이 비어 있다」와 「물을 자리조차 없었다」를 못 가릅니다.
  const available = isSpeechRecognitionAvailable();

  const refresh = () => {
    setOutcome(getSpeechStatus((next) => setStatus(next)));
  };

  const request = () => {
    // 거부 상태에서 눌러도 막지 않습니다 — 막는 것이 곧 처방을 정하는 것입니다. 네이티브가
    // 미요청인 것에만 묻고(ADR-0026 D5), 아무 일도 일어나지 않았다는 사실은 되돌아온
    // 상태 줄이 말합니다.
    setOutcome(requestSpeechPermissions((next) => setStatus(next)));
  };

  const start = () => {
    if (awaiting) {
      return;
    }

    setAwaiting(true);
    setResult(null);

    const requested = startSpeechRecognition({ requireOnDevice }, (next) => {
      setAwaiting(false);
      setResult(next);
    });
    setOutcome(requested);

    // 모듈이 없으면 콜백이 아예 오지 않습니다 — 요청이 안 갔다는 것을 결과가 아니라
    // 요청의 반환값이 답합니다. 기다림을 풀지 않으면 화면이 영영 잠깁니다.
    if (requested === "unavailable") {
      setAwaiting(false);
    }
  };

  const stop = () => {
    // 콜백이 없습니다. 멈춘 뒤 확정된 결과는 `start`의 콜백이 싣고 오므로 여기서
    // 기다림을 풀지 않습니다 — 풀면 확정 전에 잠금이 열려 요청이 겹칩니다.
    stopSpeechRecognition();
  };

  return (
    <view className="speech-probe-screen">
      {/* [고정] 머리 — 나가는 수단이 없습니다. 탭 루트 자리라 바텀 네비게이션이 집니다. */}
      <view className="speech-probe-screen-header">
        <text
          className="speech-probe-screen-title"
          data-testid="speech-probe-screen-title"
          accessibility-traits="header"
        >
          말하기 탐침
        </text>
      </view>

      {/* [흐름] 스크롤 — 화면당 정확히 하나, 중첩 없음. 속성은 `scroll-orientation`·
          `scroll-bar-enable` 둘뿐이고 `accessibility-*`를 붙이지 않습니다 — 조작 단위가
          아니라 상자입니다(ADR-0022 D5). */}
      <scroll-view
        className="speech-probe-screen-scroll"
        data-testid="speech-probe-screen-scroll"
        scroll-orientation="vertical"
        scroll-bar-enable={true}
      >
        {/* 직계 자식은 이것 하나뿐입니다(ADR-0022 D4) — `<scroll-view>`는 강제 linear라
            간격과 정렬을 이 컴포넌트의 루트가 집니다. */}
        <SpeechProbeObservations
          status={status}
          result={result}
          available={available}
          outcome={outcome}
          prompt={probePrompt}
        />
      </scroll-view>

      {/* [고정] 액션 행 — `<scroll-view>` 밖의 화면 직계 자식입니다(ADR-0022 D1). */}
      <view className="speech-probe-screen-actions" data-testid="speech-probe-screen-actions">
        <SpeechProbeActions
          requireOnDevice={requireOnDevice}
          awaiting={awaiting}
          onToggleRequireOnDevice={() => setRequireOnDevice((current) => !current)}
          onRequest={request}
          onRefresh={refresh}
          onStart={start}
          onStop={stop}
        />
      </view>
    </view>
  );
}
