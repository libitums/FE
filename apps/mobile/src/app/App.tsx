import { useGlobalProps, useState } from "@lynx-js/react";
import { MotionProvider, motionFromReducedMotion } from "@libitums/ui-lynx/motion";

import { reducedMotionFrom } from "../lib/reduced-motion";
import { AppSession } from "./AppSession";
import type { AppProps } from "./app-props";
import { initialAppStart, nextAppStart } from "./app-start";
import type { AppStart } from "./leave-app.contract";

// 바깥 App입니다 — `AppStart`(key · 첫 `Nav`) 하나만 쥡니다. `onLeaveApp`이 오면 key가 올라 `AppSession`이
// 처음부터 다시 섭니다(모든 App 상태가 처음 값).
export type { AppJourneySeed } from "./journey-progress";

export function App(props: AppProps = {}) {
  const [start, setStart] = useState<AppStart>(initialAppStart);
  // 동작 줄이기는 세션과 무관한 호스트 상태라 세션(key) 밖에서 Provider로 내립니다.
  const motion = motionFromReducedMotion(reducedMotionFrom(useGlobalProps()));
  return (
    <MotionProvider motion={motion}>
      <AppSession
        key={start.key}
        {...props}
        start={start.nav}
        exit={start.exit}
        onLeaveApp={(exit) => setStart((current) => nextAppStart(current, exit))}
      />
    </MotionProvider>
  );
}
