import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { speechComparisons, speechNormalizationLabel, speechTextShape } from "./speech-probe";
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

// 말하기 탐침 (LIB-267, ui).
//
// **개발용 탐침이고 사용자 도달 경로가 0건이다.** 어느 코드도 이 화면을 push하지
// 않는다 — 여기 닿으려면 `navigation.ts`의 `speechProbeNav`를 부팅 상태로 손수 바꿔
// 끼워야 한다. 바텀 네비게이션·여정 맵 어디에도 진입점이 없다. 손글씨 탐침과 같은
// 방식이고, 같은 이유다: 제품 경로에 진입점을 내면 탐침이 제품이 된다.
//
// ADR-0022 3분할: [고정] 머리 · [흐름] `<scroll-view>` · [고정] 액션 행.
// 「액션 행」의 이름과 내용이 갈리는 것도 손글씨 탐침과 같다 — ADR-0022 D1은 액션 행을
// 「나아가는 수단」으로 적는데 탐침에는 나아갈 곳이 없고 **조작**만 있다. 새 고정 영역을
// 만들지 않는 쪽을 골랐다. 그래야 3분할이 글자 그대로 서고 「스크롤 영역은 정확히
// 하나」가 지켜진다. 관측 줄은 수가 많아 흐름 영역이 진다.
//
// ⭐ **이 화면은 판정하지 않는다.** 「맞았다/틀렸다」를 말하는 자리가 없고, 정규화
// 후보를 골라 정본으로 삼지도 않는다. 후보 전부를 나란히 놓고, 네이티브가 준 값을
// 있는 그대로 낸다. 판정 규칙은 실기에서 본 뒤에 정할 일이다.
//
// ⭐ **거부 조합의 처방도 이 단위가 정하지 않는다.** 권한 상태 둘을 각각 줄로 내고
// 요청 수단을 늘 세워 둘 뿐, 조합에 따라 버튼을 감추거나 진행을 막지 않는다. 무엇을
// 되돌리라고 할지는 말하기 **제품 화면**을 설계하는 단위의 몫이고(ADR-0026 D3·D4),
// 탐침이 먼저 고르면 그 화면이 관찰 대신 선택을 물려받는다.

/**
 * 제시문. 인식기가 무엇을 실어 오는지 보려면 순수 로직의 **두 축이 다 걸린 문장**이어야
 * 한다 — 공백이 있고 문장부호가 있다. 둘 중 하나라도 없으면 후보 절반이 같은 줄을 내서
 * 표가 아무것도 가르지 못한다.
 *
 * 화면이 문구를 짓지 않는다는 규약은 **후보 라벨**에 걸린 것이고(그쪽은
 * `speechNormalizationLabel`이 낸다), 읽을 문장 자체는 순수 로직이 내지 않으므로 여기
 * 산다. 바꿔 가며 볼 값이라 상수 한 자리에 모아 둔다.
 */
const probePrompt = "안녕하세요, 오늘 날씨가 좋네요.";

// ⚠ **`data-*` 이름은 낱말 하나로만 쓴다.** 이 환경은 `data-x`를 `dataset["x"]`로
// 세팅하는데, 키에 하이픈이 들어가면 `SyntaxError: '...' is not a valid property name`이
// 나서 그 요소가 통째로 안 선다. `data-on-device` 같은 이름이 곧장 빨개지는 자리다.
// 낙타등(`data-onDevice`)을 쓰면 통과하기는 하지만 속성 이름이 환경마다 달리 굳어
// (jsdom은 `data-on-device`, 호스트는 `dataset.onDevice`) 실기 기록과 테스트가 서로 다른
// 이름을 부르게 된다. 그래서 두 자리에서 같은 글자인 소문자 한 낱말로 고정한다 —
// 맥락은 각 줄의 `data-testid`가 이미 좁혀 주므로 이름이 짧아도 읽힌다.

/** 불리언 관측값을 `data-*`로 낼 때 쓰는 글자. 빈 문자열(「아직 안 옴」)과 갈린다. */
function flag(value: boolean): string {
  return value ? "true" : "false";
}

export function SpeechProbeScreen(): ReactNode {
  // 온디바이스를 **요구할지**를 사람이 고른다. 이 탐침의 핵심 관찰이 「요청한 것과
  // 실제로 보장된 것이 갈리는가」라, 요청을 고정해 두면 그 갈림의 한쪽만 보인다.
  const [requireOnDevice, setRequireOnDevice] = useState(true);
  const [status, setStatus] = useState<SpeechStatus | null>(null);
  const [result, setResult] = useState<SpeechResult | null>(null);
  // 마지막 요청이 접점을 건넜는가 — ADR-0026 D3 **1단계**의 답이다. 2단계의 값(위
  // `status`)과 다른 상태로 든다: 1단계에서 끝난 것을 권한이 비어 있는 것으로 읽으면
  // 「물을 자리가 없었다」가 「물었는데 답이 없다」로 보인다.
  const [outcome, setOutcome] = useState<SpeechRequestOutcome | "">("");
  // **요청을 보내 놓고 결과를 기다리는 중인가.** 네이티브의 `listening`과 다른 값이고
  // 다른 일을 한다 — 이것은 연타 방어용 지역 상태이고, 실제로 듣고 있는지는 네이티브만
  // 안다(아래 레벨 줄의 `data-listening`이 그쪽이다). 접점에 두지 않는 이유는
  // `audio.ts`가 상태를 두지 않는 이유와 같다 — 두면 진실이 둘이 된다.
  const [awaiting, setAwaiting] = useState(false);

  // 1단계를 **관찰값으로** 낸다. 이 값으로 UI를 가르지 않는다 — 버튼도 줄도 그대로
  // 선다. 감추면 사람이 「권한이 비어 있다」와 「물을 자리조차 없었다」를 못 가른다.
  const available = isSpeechRecognitionAvailable();

  const refresh = () => {
    setOutcome(getSpeechStatus((next) => setStatus(next)));
  };

  const request = () => {
    // 거부 상태에서 눌러도 막지 않는다 — 막는 것이 곧 처방을 정하는 것이다. 네이티브가
    // 미요청인 것에만 묻고(ADR-0026 D5), 아무 일도 일어나지 않았다는 사실은 되돌아온
    // 상태 줄이 말한다.
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

    // 모듈이 없으면 콜백이 아예 오지 않는다 — 요청이 안 갔다는 것을 결과가 아니라
    // 요청의 반환값이 답한다. 기다림을 풀지 않으면 화면이 영영 잠긴다.
    if (requested === "unavailable") {
      setAwaiting(false);
    }
  };

  const stop = () => {
    // 콜백이 없다. 멈춘 뒤 확정된 결과는 `start`의 콜백이 싣고 오므로 여기서 기다림을
    // 풀지 않는다 — 풀면 확정 전에 잠금이 열려 요청이 겹친다.
    stopSpeechRecognition();
  };

  const recognized = result === null ? "" : result.text;
  const shape = speechTextShape(recognized);
  const comparisons = speechComparisons(probePrompt, recognized);

  return (
    <view className="speech-probe-screen">
      {/* [고정] 머리 — 나가는 수단이 없다. 탭 루트 자리라 바텀 네비게이션이 진다. */}
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
          `scroll-bar-enable` 둘뿐이고 `accessibility-*`를 붙이지 않는다 — 조작 단위가
          아니라 상자다(ADR-0022 D5). */}
      <scroll-view
        className="speech-probe-screen-scroll"
        data-testid="speech-probe-screen-scroll"
        scroll-orientation="vertical"
        scroll-bar-enable={true}
      >
        {/* 직계 자식은 이것 하나뿐이다(ADR-0022 D4) — `<scroll-view>`는 강제 linear라
            간격과 정렬을 여기가 진다. */}
        <view
          className="speech-probe-screen-observations"
          data-testid="speech-probe-screen-observations"
        >
          {/* ADR-0026 D3 1단계. 접점이 없으면 아래 권한 줄이 비는 것이 **정상**이고,
              그 사실을 이 줄이 말한다. */}
          <text
            className="speech-probe-screen-line"
            data-testid="speech-probe-screen-capability"
            data-available={flag(available)}
            data-outcome={outcome}
          >
            {`접점 ${available ? "있음" : "없음"} · 마지막 요청 ${outcome === "" ? "-" : outcome}`}
          </text>

          {/* ⭐ 권한 둘을 **각각 따로** 낸다. 거부 조합 넷(둘 다 허용 · 마이크만 거부 ·
              인식만 거부 · 둘 다 거부)이 화면에서 갈려야 하고, 한 줄로 합치면 그 갈림이
              사라진다. `restricted`도 접지 않고 그대로 싣는다. */}
          <text
            className="speech-probe-screen-line"
            data-testid="speech-probe-screen-microphone"
            data-permission={status === null ? "" : status.microphone}
          >
            {`마이크 ${status === null ? "-" : status.microphone}`}
          </text>

          <text
            className="speech-probe-screen-line"
            data-testid="speech-probe-screen-speech-recognition"
            data-permission={status === null ? "" : status.speechRecognition}
          >
            {`음성 인식 ${status === null ? "-" : status.speechRecognition}`}
          </text>

          <text
            className="speech-probe-screen-line"
            data-testid="speech-probe-screen-recognizer"
            data-recognizer={status === null ? "" : flag(status.recognizerAvailable)}
            data-supported={status === null ? "" : flag(status.supportsOnDevice)}
            data-locale={status === null ? "" : status.locale}
          >
            {status === null
              ? "인식기 -"
              : `인식기 ${flag(status.recognizerAvailable)} · 온디바이스 지원 ${flag(
                  status.supportsOnDevice,
                )} · ${status.locale}`}
          </text>

          {/* ⭐ 소리가 들어오는가. 버퍼 수가 늘고 레벨이 0이 아니면 탭이 실제로 프레임을
              받고 있는 것이다. **폴링 타이머를 두지 않는다** — 타이머를 두면 화면이
              「언제 읽는가」를 규칙으로 정하게 되고 테스트가 시간에 매인다. 사람이
              누른 시점의 값이면 이 물음에 답이 되고, 버퍼 수는 누적이라 나중에 눌러도
              들어온 양이 보인다. */}
          <text
            className="speech-probe-screen-line"
            data-testid="speech-probe-screen-level"
            data-listening={status === null ? "" : flag(status.listening)}
            data-buffers={status === null ? "" : String(status.bufferCount)}
            data-level={status === null ? "" : String(status.level)}
            data-peak={status === null ? "" : String(status.peakLevel)}
          >
            {status === null
              ? "입력 -"
              : `듣는 중 ${flag(status.listening)} · 버퍼 ${status.bufferCount} · 레벨 ${
                  status.level
                } · 피크 ${status.peakLevel}`}
          </text>

          <text
            className="speech-probe-screen-line"
            data-testid="speech-probe-screen-status"
            data-status={result === null ? "" : result.status}
            data-final={result === null ? "" : flag(result.isFinal)}
            data-duration={result === null ? "" : String(result.durationMs)}
          >
            {result === null
              ? "결과 -"
              : `${result.status} · 확정 ${flag(result.isFinal)} · ${result.durationMs}ms`}
          </text>

          {/* ⭐ 인식 결과 문자열. **빈 문자열도 유효한 기록값이라** 본문이 비어 보일 때
              「빈 문자열을 받았다」와 「아직 아무것도 안 왔다」가 갈려야 한다 —
              `data-received`가 그 자리이고, `data-length`가 그것을 한 번 더 받친다.
              본문에 따옴표나 대체 글자를 넣지 않는다: 넣으면 인식기가 준 문자열과
              화면이 덧댄 글자가 실기 기록에서 섞인다. */}
          <text
            className="speech-probe-screen-recognized"
            data-testid="speech-probe-screen-recognized"
            data-received={result === null ? "no" : "yes"}
            data-length={result === null ? "" : String(shape.length)}
          >
            {recognized}
          </text>

          {/* ⭐ 온디바이스 넷. **요청한 것과 보장된 것이 갈리는 자리**가 이 줄이다 —
              `requestedOnDevice`가 참인데 `onDevice`가 `not-guaranteed`면 기기가 못 한
              것이고, 요청 자체를 안 한 것과 다르다. `data-gap`은 그 갈림을 눈이 바로
              잡도록 얹은 **파생 관찰값**이고 판정이 아니다 — 원본 넷을 그대로 둔 위에
              얹었으므로, 의심스러우면 넷을 읽으면 된다. */}
          <text
            className="speech-probe-screen-line"
            data-testid="speech-probe-screen-on-device"
            data-requested={result === null ? "" : flag(result.requestedOnDevice)}
            data-supported={result === null ? "" : flag(result.supportsOnDevice)}
            data-required={result === null ? "" : flag(result.requiresOnDevice)}
            data-ondevice={result === null ? "" : result.onDevice}
            data-gap={
              result === null
                ? ""
                : flag(result.requestedOnDevice && result.onDevice !== "guaranteed")
            }
          >
            {result === null
              ? "온디바이스 -"
              : `요청 ${flag(result.requestedOnDevice)} · 지원 ${flag(
                  result.supportsOnDevice,
                )} · 설정 ${flag(result.requiresOnDevice)} · ${result.onDevice}`}
          </text>

          {/* 세션이 끝난 뒤의 입력 집계. 위 레벨 줄이 **조회 시점**의 값이라면 이쪽은
           **세션 전체**의 값이다 — 둘을 한 줄에 두면 언제 잰 값인지가 흐려진다. */}
          <text
            className="speech-probe-screen-line"
            data-testid="speech-probe-screen-result-level"
            data-buffers={result === null ? "" : String(result.bufferCount)}
            data-peak={result === null ? "" : String(result.peakLevel)}
            data-average={result === null ? "" : String(result.averageLevel)}
          >
            {result === null
              ? "세션 입력 -"
              : `세션 버퍼 ${result.bufferCount} · 피크 ${result.peakLevel} · 평균 ${result.averageLevel}`}
          </text>

          {/* 오류 셋. `recognized`로 끝나도 오류 필드가 비어 있지 않을 수 있어(그때까지
              읽은 글자를 버리지 않는 것이 네이티브의 결정이다) 상태 줄과 따로 둔다. */}
          <text
            className="speech-probe-screen-line"
            data-testid="speech-probe-screen-error"
            data-domain={result === null ? "" : result.errorDomain}
            data-code={result === null ? "" : String(result.errorCode)}
          >
            {result === null ? "" : result.errorMessage}
          </text>

          <text className="speech-probe-screen-line" data-testid="speech-probe-screen-prompt">
            {probePrompt}
          </text>

          {/* 인식 결과 문자열의 모양. 후보 표만으로는 「무엇을 지우면 붙는가」까지만
              보이고 「인식기가 애초에 무엇을 실어 왔는가」는 안 보인다. */}
          <text
            className="speech-probe-screen-line"
            data-testid="speech-probe-screen-shape"
            data-length={String(shape.length)}
            data-whitespace={String(shape.whitespaceCount)}
            data-edges={flag(shape.hasEdgeWhitespace)}
            data-repeats={flag(shape.hasRepeatedWhitespace)}
          >
            {`길이 ${shape.length} · 공백 ${shape.whitespaceCount} · 양끝 ${flag(
              shape.hasEdgeWhitespace,
            )} · 연속 ${flag(shape.hasRepeatedWhitespace)} · 부호 ${shape.punctuation.join("")}`}
          </text>

          {/* 후보별 대조 표. 순수 로직이 낸 순서 그대로이고, 화면이 후보를 고르지
              않는다 — 고르는 순간 그 선택이 규칙이 된다. 라벨도 짓지 않고
              `speechNormalizationLabel`이 내는 것을 쓴다. */}
          <view
            className="speech-probe-screen-comparisons"
            data-testid="speech-probe-screen-comparisons"
          >
            {comparisons.map((comparison) => (
              <view
                className="speech-probe-screen-comparison"
                data-testid={`speech-probe-screen-comparison-${comparison.id}`}
                data-identical={flag(comparison.identical)}
                key={comparison.id}
              >
                <text
                  className="speech-probe-screen-comparison-label"
                  data-testid={`speech-probe-screen-comparison-${comparison.id}-label`}
                >
                  {speechNormalizationLabel(comparison.normalization)}
                </text>
                <text
                  className="speech-probe-screen-comparison-value"
                  data-testid={`speech-probe-screen-comparison-${comparison.id}-prompt`}
                >
                  {comparison.prompt}
                </text>
                <text
                  className="speech-probe-screen-comparison-value"
                  data-testid={`speech-probe-screen-comparison-${comparison.id}-recognized`}
                >
                  {comparison.recognized}
                </text>
              </view>
            ))}
          </view>
        </view>
      </scroll-view>

      {/* [고정] 액션 행 — `<scroll-view>` 밖의 화면 직계 자식이다(ADR-0022 D1). 조작
          수단은 조합과 무관하게 **늘 전부 선다**: 무엇을 감출지가 곧 거부 조합의
          처방이고, 그것은 이 단위가 정하지 않는다. */}
      <view className="speech-probe-screen-actions" data-testid="speech-probe-screen-actions">
        <view
          className="speech-probe-screen-button"
          data-testid="speech-probe-screen-require-on-device"
          data-require={flag(requireOnDevice)}
          accessibility-element={true}
          accessibility-traits="button"
          accessibility-label="온디바이스 요구 바꾸기"
          bindtap={() => setRequireOnDevice((current) => !current)}
        >
          <text className="speech-probe-screen-button-label">
            {`온디바이스 요구 ${flag(requireOnDevice)}`}
          </text>
        </view>

        <view
          className="speech-probe-screen-button"
          data-testid="speech-probe-screen-request"
          accessibility-element={true}
          accessibility-traits="button"
          accessibility-label="권한 요청"
          bindtap={request}
        >
          <text className="speech-probe-screen-button-label">권한 요청</text>
        </view>

        <view
          className="speech-probe-screen-button"
          data-testid="speech-probe-screen-refresh"
          accessibility-element={true}
          accessibility-traits="button"
          accessibility-label="상태 읽기"
          bindtap={refresh}
        >
          <text className="speech-probe-screen-button-label">상태 읽기</text>
        </view>

        <view
          className="speech-probe-screen-button"
          data-testid="speech-probe-screen-start"
          data-awaiting={flag(awaiting)}
          accessibility-element={true}
          accessibility-traits="button"
          accessibility-label="듣기 시작"
          bindtap={start}
        >
          <text className="speech-probe-screen-button-label">듣기 시작</text>
        </view>

        <view
          className="speech-probe-screen-button"
          data-testid="speech-probe-screen-stop"
          accessibility-element={true}
          accessibility-traits="button"
          accessibility-label="멈추기"
          bindtap={stop}
        >
          <text className="speech-probe-screen-button-label">멈추기</text>
        </view>
      </view>
    </view>
  );
}
