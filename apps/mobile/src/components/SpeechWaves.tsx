import type { ReactNode } from "@lynx-js/react";

import audioWaves from "@libitums/icons/lynx/audio-waves";
import { color } from "@libitums/design-tokens";

import type { SpeechWavesState } from "../lib/speech-attempt";

import "./speech-waves.css";

export type SpeechWavesProps = {
  readonly testId: string;
  readonly state: SpeechWavesState;
  /** idle · listening의 낭독 이름 — 주 버튼과 같은 문구(Speak · Stop speaking). off면 쓰지 않습니다. */
  readonly label: string;
  /** idle · listening에서만 불립니다. */
  readonly onTap: () => void;
};

// 대기(누를 수 있음)는 흰 면 위 3:1을 넘는 gray-700, 듣는 중은 주색, 꺼짐(누를 수 없음)은 가장 옅은 회색입니다.
const iconColorByState: Record<SpeechWavesState, string> = {
  idle: color.gray[700],
  listening: color.brand.primary,
  off: color.gray[300],
};

// 말하기 화면의 마이크(파형) 아이콘입니다. 눌리는 상태에서만 버튼 요소이고, 꺼지면 접근성 트리에도
// 탭에도 나서지 않습니다. 녹음 아이콘과 주 버튼이 같은 조작이라 이름도 같은 문구를 받습니다.
export function SpeechWaves({ testId, state, label, onTap }: SpeechWavesProps): ReactNode {
  const pressable = state !== "off";

  // custom prop 경계를 지나 `bindtap`에 닿는 핸들러라 `'background only'`를 둡니다.
  const handleTap = (): void => {
    "background only";
    onTap();
  };

  return (
    <view
      className="speech-waves"
      data-testid={testId}
      data-state={state}
      accessibility-element={pressable}
      accessibility-traits={pressable ? "button" : undefined}
      accessibility-label={pressable ? label : undefined}
      bindtap={pressable ? handleTap : undefined}
    >
      <svg
        className="speech-waves-icon"
        content={audioWaves}
        current-color={iconColorByState[state]}
      />
    </view>
  );
}
