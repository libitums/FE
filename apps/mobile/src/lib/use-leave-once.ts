// 화면을 떠나는 동작을 서 있는 동안 한 번으로 묶는 훅입니다 — 전이가 그려지기 전에 온 두 번째 탭이 화면을 두 번 쌓거나
// 완주 이벤트를 두 번 내지 않게. 뒤로 와서 화면이 다시 서면 처음부터입니다.

import { useRef } from "@lynx-js/react";

export function useLeaveOnce(): (leave: () => void) => void {
  const left = useRef(false);
  return (leave) => {
    if (left.current) return;
    left.current = true;
    leave();
  };
}
