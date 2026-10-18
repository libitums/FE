// 부팅한 App을 스플래시 너머로 넘기는 공용 헬퍼입니다. 가짜 타이머가 켜진 상태에서 부릅니다.
// 제품 코드가 import하지 않습니다. 이름에 `.test.`를 넣지 않습니다 — vitest가 테스트 파일로 모읍니다.
//
// 스플래시는 `useEffect`가 거는 안전 타이머(`entrySplashDurationMs`)로 끝납니다. 예전 헬퍼들은 그
// 시간을 **한 번만** 앞당겼는데, effect가 앞당김보다 늦게 돌면(렌더 스케줄이 밀리는 느린 CI)
// 타이머가 앞당김 뒤에 걸려 스플래시가 남았습니다 — 로컬에서는 재현되지 않고 CI에서만 가끔
// 「스플래시를 지나지 못했다」로 실패했습니다. 그래서 스플래시가 남아 있는 동안 정해진 횟수까지
// 다시 앞당기고, 그래도 남으면 오류를 던집니다.

import { vi } from "vitest";
import { act, screen } from "@lynx-js/react/testing-library";

import { entrySplashDurationMs } from "../../lib/entry-flow";

// 한 번이면 보통 넘습니다. 늦게 걸린 타이머 하나를 받치려면 둘이면 되고, 하나를 더 둡니다.
const maxRounds = 3;

export async function passSplash(): Promise<void> {
  for (let round = 0; round < maxRounds; round++) {
    act(() => {
      vi.advanceTimersByTime(entrySplashDurationMs);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    if (screen.queryByTestId("splash-screen-logo") === null) return;
  }
  // 넘지 못하면 여기서 분명히 실패합니다 — 하네스가 다음 화면의 요소를 못 찾는 모호한 오류로
  // 번지지 않게 합니다.
  throw new Error("passSplash: 스플래시를 지나지 못했습니다");
}
