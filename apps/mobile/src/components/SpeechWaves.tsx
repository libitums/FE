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

// 말하기 화면의 마이크(파형) 아이콘입니다. 스캐폴드: 상태 표식과 아이콘만 서고, 접근성 이름 · 탭 ·
// 상태별 색은 구현 단계에서 채웁니다.
export function SpeechWaves({ testId, state }: SpeechWavesProps): ReactNode {
  return (
    <view className="speech-waves" data-testid={testId} data-state={state}>
      <svg className="speech-waves-icon" content={audioWaves} current-color={color.gray[700]} />
    </view>
  );
}
