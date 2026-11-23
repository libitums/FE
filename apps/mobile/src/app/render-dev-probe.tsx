// 개발용 탐침 화면 둘을 그리는 **dev 전용** 자리입니다. 탐침 화면을 import하는 제품 파일은
// 여기 하나뿐입니다(`render-dev-probe.unit.test.tsx` DP-S1).
//
// release 번들에서 빠지는 길은 이렇습니다. `render-screen.tsx`가 `__DEV__ ? renderDevProbe(…) : null`
// 로만 부르고, release 빌드는 `__DEV__`를 `false`로 바꿔 넣어 그 호출이 죽은 코드가 됩니다.
// `lynx.config.ts`가 이 파일을 부수 효과 없는 모듈로 표시하므로, 쓰이지 않는 import가 이 파일과
// 그 아래 탐침 화면 · CSS를 통째로 끌고 들어오지 않습니다(약 −40 kB, ADR-0171).
// 이 파일에 모듈 최상위 부수 효과(전역 등록 · CSS import)를 두지 않습니다 — 표시가 거짓이 됩니다.

import { HandwritingProbeScreen } from "../screens/handwriting-probe/HandwritingProbeScreen";
import { SpeechProbeScreen } from "../screens/speech-probe/SpeechProbeScreen";

export function renderDevProbe(name: "handwriting-probe" | "speech-probe") {
  return name === "handwriting-probe" ? <HandwritingProbeScreen /> : <SpeechProbeScreen />;
}
