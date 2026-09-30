import { useEffect, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";
import { Avatar } from "@libitums/ui-lynx/avatar";

import { callClockLabel } from "../lib/call-clock";
import { useUiCopy } from "../lib/ui-copy";

import "./call-stage.css";

// 통화 화면의 가운데 — 통화 상대 묶음(음성 통화 · 얼굴 · 이름 · 시계)과 대사 말풍선입니다
// (Figma 80-7797 · 79-6043). ⟨2026-09-28⟩ 서사 통화의 것이었다가 여기로 올라왔습니다 —
// 통화 최종 테스트도 같은 통화 화면을 씁니다(ADR-0008: 화면 둘 이상이 쓰면 공용).
//
// testid는 화면이 앞부분(`testIdPrefix`)을 줍니다 — 화면마다 제 이름으로 찾습니다.

/**
 * 통화 시계입니다. 1초 타이머를 이 작은 컴포넌트 안에 가둡니다 — 시계가 매초 가도 화면
 * 전체가 다시 그려지지 않습니다. `running`이 꺼지면 멈추고, 멈춘 시계는 통화 길이를 보입니다.
 *
 * 낭독하지 않습니다 — 매초 바뀌는 값을 이름에 두면 스크린리더가 그 자리에 머무는 동안
 * 되풀이해 읽어 대사 낭독을 방해합니다.
 */
function CallClock({
  running,
  testId,
}: {
  readonly running: boolean;
  readonly testId: string;
}): ReactNode {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!running) {
      return undefined;
    }
    const timer = setInterval(() => setElapsedSeconds((seconds) => seconds + 1), 1000);
    return () => clearInterval(timer);
  }, [running]);

  return (
    <view className="call-stage-clock" data-testid={testId}>
      <text className="call-stage-clock-label">{callClockLabel(elapsedSeconds)}</text>
    </view>
  );
}

export type CallCallerProps = {
  readonly callerName: string;
  readonly callerPortrait: string | null;
  readonly clockRunning: boolean;
  readonly testIdPrefix: string;
};

/**
 * 통화 상대 묶음입니다 — 낱말 둘(음성 통화 · 이름)을 한 번에 읽습니다. 시계는 이름에 싣지
 * 않습니다. 얼굴 그림은 장식이라 가립니다.
 */
export function CallCaller({
  callerName,
  callerPortrait,
  clockRunning,
  testIdPrefix,
}: CallCallerProps): ReactNode {
  const copy = useUiCopy();
  return (
    <view
      className="call-stage-caller"
      data-testid={`${testIdPrefix}-caller`}
      accessibility-element={true}
      accessibility-label={copy.phoneCall.voiceCall(callerName)}
    >
      <text className="call-stage-kind">Voice Call</text>
      <view
        className={
          callerPortrait === null
            ? "call-stage-portrait-frame call-stage-portrait-frame-anonymous"
            : "call-stage-portrait-frame"
        }
        accessibility-elements-hidden={true}
      >
        {callerPortrait === null ? (
          <Avatar size="xl" accessibility="hidden" />
        ) : (
          <image className="call-stage-portrait" src={callerPortrait} mode="aspectFill" />
        )}
      </view>
      <text className="call-stage-name">{callerName}</text>
      <CallClock running={clockRunning} testId={`${testIdPrefix}-clock`} />
    </view>
  );
}

export type CallLineBubbleProps = {
  readonly text: string;
  readonly translation: string;
  readonly testIdPrefix: string;
};

/** 상대 대사 말풍선입니다 — 흰 면에 한국어 한 줄과 번역 한 줄입니다. */
export function CallLineBubble({
  text,
  translation,
  testIdPrefix,
}: CallLineBubbleProps): ReactNode {
  return (
    <view
      className="call-stage-line"
      data-testid={`${testIdPrefix}-line`}
      accessibility-element={true}
      accessibility-label={`${text}, ${translation}`}
    >
      <text className="call-stage-line-text" data-testid={`${testIdPrefix}-line-text`}>
        {text}
      </text>
      <text
        className="call-stage-line-translation"
        data-testid={`${testIdPrefix}-line-translation`}
      >
        {translation}
      </text>
    </view>
  );
}
