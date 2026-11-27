import type { ReactNode } from "@lynx-js/react";

import mic from "@libitums/icons/lynx/mic";
import stop from "@libitums/icons/lynx/stop";
import { color } from "@libitums/design-tokens";
import { useMotion } from "@libitums/ui-lynx/motion";

import { speechMicBarHeights, speechMicRingSvg } from "./speech-mic";
import type { SpeechMicState } from "./speech-mic";
import { useSpeechMeter } from "./use-speech-meter";

import "./speech-mic.css";

export type SpeechMicProps = {
  readonly testId: string;
  readonly state: SpeechMicState;
  /** 단추의 낭독 이름 — 대기면 「Speak」, 듣는 중이면 「Stop speaking」. */
  readonly label: string;
  /** 단추 아래 굵은 한 줄(「Listening…」 · 「Checking…」). 없으면 그리지 않습니다. */
  readonly status?: string | null;
  /** 그 아래 옅은 한 줄(「Tap to stop when you're done」). */
  readonly hint?: string | null;
  /** 대기 · 듣는 중에서만 불립니다. */
  readonly onTap: () => void;
  /** 듣는 중 최대 시간(8초)이 지나면 한 번 불립니다 — 화면이 스스로 멈춥니다. */
  readonly onExpire?: () => void;
};

const ICON_BY_STATE: Readonly<Record<SpeechMicState, string>> = {
  idle: mic,
  listening: stop,
  checking: stop,
  disabled: mic,
};

// 말하기 퀴즈 · 롤플레이가 함께 쓰는 큰 마이크입니다(시안 S1 · R2). 듣는 중에는 음량 막대가 실제 음량에 맞춰 움직이고
// 둘레 링이 남은 시간을 보입니다. 움직임 줄이기면 막대 · 링이 멈추고 문구만 바뀝니다. 단추는 88pt(44pt 넘음)이며 눌리는
// 국면(대기 · 듣는 중)에서만 단추로 낭독됩니다.
export function SpeechMic({
  testId,
  state,
  label,
  status,
  hint,
  onTap,
  onExpire,
}: SpeechMicProps): ReactNode {
  const reduced = useMotion() === "reduced";
  const listening = state === "listening";
  const { meter, remaining } = useSpeechMeter(listening, reduced, onExpire);
  const pressable = state === "idle" || listening;

  // custom prop 경계를 지나 `bindtap`에 닿는 핸들러라 `'background only'`를 둡니다.
  const handleTap = (): void => {
    "background only";
    onTap();
  };

  return (
    <view className="speech-mic" data-testid={testId} data-state={state}>
      {/* 막대 · 링은 듣는 중에만 자리를 차지합니다 — 대기에는 단추만 서서 작은 화면에서도 아래 버튼과 겹치지 않습니다. */}
      {listening ? (
        <view className="speech-mic-bars" data-testid={`${testId}-bars`}>
          {speechMicBarHeights(meter, reduced).map((height, index) => (
            <view
              key={String(index)}
              className="speech-mic-bar"
              style={{ height: `${String(height)}px` }}
            />
          ))}
        </view>
      ) : null}
      <view className={listening ? "speech-mic-dial speech-mic-dial-ringed" : "speech-mic-dial"}>
        {listening ? (
          <svg
            className="speech-mic-ring"
            data-testid={`${testId}-ring`}
            content={speechMicRingSvg(remaining, color.background.elevated, color.brand.primary)}
          />
        ) : null}
        <view
          className={`speech-mic-button speech-mic-button-${state}`}
          data-testid={`${testId}-button`}
          accessibility-element={pressable}
          flatten={false}
          accessibility-traits={pressable ? "button" : undefined}
          accessibility-label={pressable ? label : undefined}
          bindtap={pressable ? handleTap : undefined}
        >
          <svg
            className="speech-mic-icon"
            content={ICON_BY_STATE[state]}
            current-color={state === "disabled" ? color.fg["neutral-subtle"] : color.white}
          />
        </view>
      </view>
      {status == null ? null : (
        <text className="speech-mic-status" data-testid={`${testId}-status`}>
          {status}
        </text>
      )}
      {hint == null ? null : <text className="speech-mic-hint">{hint}</text>}
    </view>
  );
}
