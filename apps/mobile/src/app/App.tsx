import { useState } from "@lynx-js/react";

import { AppSession } from "./AppSession";
import type { AppProps } from "./app-props";
import { initialAppStart, nextAppStart } from "./app-start";
import type { AppStart } from "./leave-app.contract";

// 바깥 App입니다 — `AppStart`(key · 첫 `Nav`) 하나만 쥡니다. `onLeaveApp`이 오면 key가 올라 `AppSession`이
// 처음부터 다시 섭니다(모든 App 상태가 처음 값).
export type { AppJourneySeed } from "./journey-progress";

export function App(props: AppProps = {}) {
  const [start, setStart] = useState<AppStart>(initialAppStart);
  return (
    <AppSession
      key={start.key}
      {...props}
      start={start.nav}
      exit={start.exit}
      onLeaveApp={(exit) => setStart((current) => nextAppStart(current, exit))}
    />
  );
}
