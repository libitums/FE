// 호스트가 LynxView를 **전체 화면**으로 띄우고, 가려지는 가장자리(상태바 · 홈
// 인디케이터)의 크기를 globalProps `safeAreaInsets`로 넘긴다(apps/ios ViewController).
// 앱 셸이 이 값으로 안쪽 여백을 잡아 콘텐츠를 가려지지 않는 영역에 두고, 여백 자체는
// 셸 배경이 칠한다 — 그래서 화면이 가장자리 색까지 정할 수 있다(스플래시).
//
// Lynx에는 `env(safe-area-inset-*)`가 없어 값을 CSS가 아니라 JS로 받는다.
// 값이 없거나(Explorer · 테스트 환경) 모양이 틀리면 0으로 둔다 — 호스트가 값을 넘기기
// 전 첫 렌더도 0이고, 값이 오면 `useGlobalProps`가 다시 그린다.

export type SafeAreaInsets = {
  readonly top: number;
  readonly bottom: number;
  readonly left: number;
  readonly right: number;
};

export const zeroSafeAreaInsets: SafeAreaInsets = { top: 0, bottom: 0, left: 0, right: 0 };

function edge(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

export function safeAreaInsetsFrom(globalProps: unknown): SafeAreaInsets {
  if (typeof globalProps !== "object" || globalProps === null) return zeroSafeAreaInsets;
  const raw = (globalProps as { safeAreaInsets?: unknown }).safeAreaInsets;
  if (typeof raw !== "object" || raw === null) return zeroSafeAreaInsets;
  const insets = raw as Record<string, unknown>;
  return {
    top: edge(insets.top),
    bottom: edge(insets.bottom),
    left: edge(insets.left),
    right: edge(insets.right),
  };
}
