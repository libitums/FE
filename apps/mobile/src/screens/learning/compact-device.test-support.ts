// ui 테스트용 밀도 대역입니다. 테스트 환경의 기본 창은 2532 / 3 = 844pt(regular)이고,
// 13 mini 판은 2436 / 3 = 812pt + 안전 영역 위 50 · 아래 34 = 728pt(compact)입니다.

type SystemInfoShape = { pixelHeight: number; pixelRatio: number };

type Restore = () => void;

function globalScope(): { SystemInfo: SystemInfoShape } {
  return globalThis as unknown as { SystemInfo: SystemInfoShape };
}

function lynxScope(): { __globalProps: unknown } {
  return lynx as unknown as { __globalProps: unknown };
}

/** 13 mini 크기 창 + 안전 영역으로 바꿉니다. 돌려주는 함수를 테스트 끝(afterEach)에 부릅니다. */
export function useCompactDevice(): Restore {
  const scope = globalScope();
  const previousInfo = scope.SystemInfo;
  const previousProps = lynxScope().__globalProps;
  scope.SystemInfo = { ...previousInfo, pixelHeight: 2436, pixelRatio: 3 };
  lynxScope().__globalProps = { safeAreaInsets: { top: 50, bottom: 34, left: 0, right: 0 } };
  return function restore(): void {
    scope.SystemInfo = previousInfo;
    lynxScope().__globalProps = previousProps;
  };
}
