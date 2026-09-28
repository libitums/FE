import { useEffect, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { prologueCallClock } from "./prologue-call";

/**
 * 통화 시계입니다. 1초 타이머를 이 작은 컴포넌트 안에 가둡니다 — 시계가 매초 가도 화면
 * 전체가 다시 그려지지 않습니다. `running`이 꺼지면 멈추고, 멈춘 시계는 통화 길이를 보입니다.
 *
 * 낭독하지 않습니다 — 통화 상대 묶음의 이름에 싣지 않는 것과 같은 까닭입니다: 매초 바뀌는
 * 값을 이름에 두면 스크린리더가 그 자리에 머무는 동안 되풀이해 읽어 대사 낭독을 방해합니다.
 */
export function PrologueCallClock({ running }: { readonly running: boolean }): ReactNode {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!running) {
      return undefined;
    }
    const timer = setInterval(() => setElapsedSeconds((seconds) => seconds + 1), 1000);
    return () => clearInterval(timer);
  }, [running]);

  return (
    <view className="prologue-call-screen-clock" data-testid="prologue-call-screen-clock">
      <text className="prologue-call-screen-clock-label">{prologueCallClock(elapsedSeconds)}</text>
    </view>
  );
}
