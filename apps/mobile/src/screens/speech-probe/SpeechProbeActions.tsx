import type { ReactNode } from "@lynx-js/react";

import { flag } from "./speech-probe";

import "./speech-probe-actions.css";

// 액션 버튼 다섯을 그립니다. 조작 수단은 조합과 무관하게 **늘 전부 섭니다**: 무엇을
// 감출지가 곧 거부 조합의 처방이고, 그것은 이 단위가 정하지 않습니다(ADR-0026 D3·D4).

export type SpeechProbeActionsProps = {
  readonly requireOnDevice: boolean;
  readonly awaiting: boolean;
  readonly onToggleRequireOnDevice: () => void;
  readonly onRequest: () => void;
  readonly onRefresh: () => void;
  readonly onStart: () => void;
  readonly onStop: () => void;
};

export function SpeechProbeActions({
  requireOnDevice,
  awaiting,
  onToggleRequireOnDevice,
  onRequest,
  onRefresh,
  onStart,
  onStop,
}: SpeechProbeActionsProps): ReactNode {
  return (
    <>
      <view
        className="speech-probe-screen-button"
        data-testid="speech-probe-screen-require-on-device"
        data-require={flag(requireOnDevice)}
        accessibility-element={true}
        accessibility-traits="button"
        accessibility-label="온디바이스 요구 바꾸기"
        bindtap={onToggleRequireOnDevice}
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
        bindtap={onRequest}
      >
        <text className="speech-probe-screen-button-label">권한 요청</text>
      </view>

      <view
        className="speech-probe-screen-button"
        data-testid="speech-probe-screen-refresh"
        accessibility-element={true}
        accessibility-traits="button"
        accessibility-label="상태 읽기"
        bindtap={onRefresh}
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
        bindtap={onStart}
      >
        <text className="speech-probe-screen-button-label">듣기 시작</text>
      </view>

      <view
        className="speech-probe-screen-button"
        data-testid="speech-probe-screen-stop"
        accessibility-element={true}
        accessibility-traits="button"
        accessibility-label="멈추기"
        bindtap={onStop}
      >
        <text className="speech-probe-screen-button-label">멈추기</text>
      </view>
    </>
  );
}
