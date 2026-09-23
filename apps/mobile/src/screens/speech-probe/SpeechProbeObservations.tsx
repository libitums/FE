import type { ReactNode } from "@lynx-js/react";

import { flag, speechComparisons, speechNormalizationLabel, speechTextShape } from "./speech-probe";
import type {
  SpeechRequestOutcome,
  SpeechResult,
  SpeechStatus,
} from "../../lib/speech-recognition";

import "./speech-probe-observations.css";

// 관측 줄 아홉과 후보 대조 표를 그립니다. 받은 값을 읽기만 합니다 — 판정하지 않고
// 네이티브가 준 값을 있는 그대로 냅니다.

export type SpeechProbeObservationsProps = {
  readonly status: SpeechStatus | null;
  readonly result: SpeechResult | null;
  readonly available: boolean;
  readonly outcome: SpeechRequestOutcome | "";
  readonly prompt: string;
};

export function SpeechProbeObservations({
  status,
  result,
  available,
  outcome,
  prompt,
}: SpeechProbeObservationsProps): ReactNode {
  const recognized = result === null ? "" : result.text;
  const shape = speechTextShape(recognized);
  const comparisons = speechComparisons(prompt, recognized);

  return (
    <view
      className="speech-probe-screen-observations"
      data-testid="speech-probe-screen-observations"
    >
      {/* ADR-0026 D3 1단계. 접점이 없으면 아래 권한 줄이 비는 것이 **정상**이고,
          그 사실을 이 줄이 말합니다. */}
      <text
        className="speech-probe-screen-line"
        data-testid="speech-probe-screen-capability"
        data-available={flag(available)}
        data-outcome={outcome}
      >
        {`접점 ${available ? "있음" : "없음"} · 마지막 요청 ${outcome === "" ? "-" : outcome}`}
      </text>

      {/* ⭐ 권한 둘을 **각각 따로** 냅니다. 거부 조합 넷(둘 다 허용 · 마이크만 거부 ·
          인식만 거부 · 둘 다 거부)이 화면에서 갈려야 하고, 한 줄로 합치면 그 갈림이
          사라집니다. `restricted`도 접지 않고 그대로 싣습니다. */}
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

      {/* ⭐ 소리가 들어오는가. 버퍼 수가 늘고 레벨이 0이 아니면 탭이 실제로 프레임을 받고
          있는 것입니다. **폴링 타이머를 두지 않습니다** — 타이머를 두면 화면이 「언제
          읽는가」를 규칙으로 정하게 되고 테스트가 시간에 매입니다. 사람이 누른 시점의
          값이면 이 물음에 답이 되고, 버퍼 수는 누적이라 나중에 눌러도 들어온 양이
          보입니다. */}
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

      {/* ⭐ 인식 결과 문자열입니다. **빈 문자열도 유효한 기록값이라** 본문이 비어 보일 때
          「빈 문자열을 받았다」와 「아직 아무것도 안 왔다」가 갈려야 합니다 —
          `data-received`가 그 자리이고, `data-length`가 그것을 한 번 더 받칩니다. 본문에
          따옴표나 대체 글자를 넣지 않습니다: 넣으면 인식기가 준 문자열과 화면이 덧댄
          글자가 실기 기록에서 섞입니다. */}
      <text
        className="speech-probe-screen-recognized"
        data-testid="speech-probe-screen-recognized"
        data-received={result === null ? "no" : "yes"}
        data-length={result === null ? "" : String(shape.length)}
      >
        {recognized}
      </text>

      {/* ⭐ 온디바이스 넷. **요청한 것과 보장된 것이 갈리는 자리**가 이 줄입니다 —
          `requestedOnDevice`가 참인데 `onDevice`가 `not-guaranteed`면 기기가 못 한
          것이고, 요청 자체를 안 한 것과 다릅니다. `data-gap`은 그 갈림을 눈이 바로
          잡도록 얹은 **파생 관찰값**이고 판정이 아닙니다 — 원본 넷을 그대로 둔 위에
          얹었으므로, 의심스러우면 넷을 읽으면 됩니다. */}
      <text
        className="speech-probe-screen-line"
        data-testid="speech-probe-screen-on-device"
        data-requested={result === null ? "" : flag(result.requestedOnDevice)}
        data-supported={result === null ? "" : flag(result.supportsOnDevice)}
        data-required={result === null ? "" : flag(result.requiresOnDevice)}
        data-ondevice={result === null ? "" : result.onDevice}
        data-gap={
          result === null ? "" : flag(result.requestedOnDevice && result.onDevice !== "guaranteed")
        }
      >
        {result === null
          ? "온디바이스 -"
          : `요청 ${flag(result.requestedOnDevice)} · 지원 ${flag(
              result.supportsOnDevice,
            )} · 설정 ${flag(result.requiresOnDevice)} · ${result.onDevice}`}
      </text>

      {/* 세션이 끝난 뒤의 입력 집계입니다. 위 레벨 줄이 **조회 시점**의 값이라면 이쪽은
       **세션 전체**의 값입니다 — 둘을 한 줄에 두면 언제 잰 값인지가 흐려집니다. */}
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

      {/* 오류 셋입니다. `recognized`로 끝나도 오류 필드가 비어 있지 않을 수 있어(그때까지
          읽은 글자를 버리지 않는 것이 네이티브의 결정입니다) 상태 줄과 따로 둡니다. */}
      <text
        className="speech-probe-screen-line"
        data-testid="speech-probe-screen-error"
        data-domain={result === null ? "" : result.errorDomain}
        data-code={result === null ? "" : String(result.errorCode)}
      >
        {result === null ? "" : result.errorMessage}
      </text>

      <text className="speech-probe-screen-line" data-testid="speech-probe-screen-prompt">
        {prompt}
      </text>

      {/* 인식 결과 문자열의 모양입니다. 후보 표만으로는 「무엇을 지우면 붙는가」까지만
          보이고 「인식기가 애초에 무엇을 실어 왔는가」는 안 보입니다. */}
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

      {/* 후보별 대조 표입니다. 순수 로직이 낸 순서 그대로이고, 화면이 후보를 고르지
          않습니다 — 고르는 순간 그 선택이 규칙이 됩니다. 라벨도 짓지 않고
          `speechNormalizationLabel`이 내는 것을 씁니다. */}
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
  );
}
