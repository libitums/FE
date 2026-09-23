// 개발용 탐침 화면 둘의 부팅 상태를 소유합니다. **제품 경로가 읽지 않습니다** —
// `App.tsx`에 이 이름이 한 자리도 없다는 것이 도달 경로 0건의 증거입니다.

import type { Nav } from "./nav-state";
import { initialNav } from "./nav-state";

/**
 * 개발용 탐침 부팅 상태입니다. **제품 경로가 이것을 읽지 않습니다** — `App.tsx`에
 * 이 이름이 한 자리도 없다는 것이 도달 경로 0건의 직접 증거입니다.
 *
 * 탐침을 보려면 `App.tsx`의 `useReducer(navReducer, entryInitialNav)` 한 자리를
 * `handwritingProbeNav`로 바꾸고 dev 서버를 다시 읽힙니다. 확인 뒤 되돌립니다 —
 * `git diff -- apps/mobile/src/app/App.tsx`가 0줄인 것이 되돌아왔다는 증거입니다.
 *
 * `initialNav`를 고치지 않고 **별도 초기값**을 세우는 근거는 이렇습니다: 첫
 * 렌더의 여정 맵을 단언하는 기존 integration 파일들이 부팅 상태를 공유합니다.
 * 한 자리를 고치면 그 구간이 통째로 빨개지고, 초기값을 나누면 그 구간이
 * 0이 됩니다.
 *
 * ⭐ `entry`를 비운 채로 세우는 것이 이 값의 불변식입니다. `activeStack`은
 * `entry`가 비어 있지 않으면 `entry`를 **먼저** 고르므로, 진입 구간이 실린
 * 부팅 상태(`entryInitialNav`)를 바탕으로 펼치면 부팅이 진입 흐름으로 가고
 * 탐침에는 영영 닿지 못합니다. 그래서 바탕은 `initialNav`이고 `entry: []`를
 * 문면에 적어 둡니다 — 바탕이 바뀌어도 이 한 줄이 불변식을 지킵니다.
 */
export const handwritingProbeNav: Nav = {
  ...initialNav,
  entry: [],
  stacks: { ...initialNav.stacks, journey: [{ name: "handwriting-probe" }] },
};

/**
 * 개발용 말하기 탐침 부팅 상태입니다. 위 `handwritingProbeNav`와 같은 모양이고
 * 같은 근거입니다 — **제품 경로가 이것을 읽지 않습니다.** `App.tsx`에 이 이름이
 * 한 자리도 없다는 것이 도달 경로 0건의 직접 증거입니다.
 *
 * 탐침을 보려면 `App.tsx`의 `useReducer(navReducer, entryInitialNav)` 한 자리를
 * `speechProbeNav`로 바꾸고 dev 서버를 다시 읽힙니다. 확인 뒤 되돌립니다 —
 * `git diff -- apps/mobile/src/app/App.tsx`가 0줄인 것이 되돌아왔다는 증거입니다.
 *
 * ⭐ `entry`를 비운 채로 세우는 것이 이 값의 불변식입니다. `activeStack`은
 * `entry`가 비어 있지 않으면 `entry`를 **먼저** 고르므로, 진입 구간이 실린
 * 부팅 상태(`entryInitialNav`)를 바탕으로 펼치면 부팅이 진입 흐름으로 가고
 * 탐침에는 영영 닿지 못합니다. 그래서 바탕은 `initialNav`이고 `entry: []`를
 * 문면에 적어 둡니다 — 바탕이 바뀌어도 이 한 줄이 불변식을 지킵니다.
 */
export const speechProbeNav: Nav = {
  ...initialNav,
  entry: [],
  stacks: { ...initialNav.stacks, journey: [{ name: "speech-probe" }] },
};
