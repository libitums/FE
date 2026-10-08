export type ShellBottomInput = {
  readonly showsNavigator: boolean;
  /** 셸이 지금 화면에 쓰는 아래 safe 값입니다(`shellInsets.bottom` — 전체 화면 그림 화면이면 0). */
  readonly safeBottom: number;
  readonly tappableBottom: number;
};

export type ShellBottomLayout = {
  /** `.app`의 padding-bottom. */
  readonly shellPaddingBottom: number;
  /** 탭 바 밑에 덧대는 바닥 면의 높이. 0이면 그리지 않습니다. */
  readonly navigatorFloorHeight: number;
};

export function shellBottomLayout(input: ShellBottomInput): ShellBottomLayout {
  if (!input.showsNavigator) {
    return { shellPaddingBottom: input.safeBottom, navigatorFloorHeight: 0 };
  }
  return {
    shellPaddingBottom: input.tappableBottom,
    navigatorFloorHeight: input.tappableBottom,
  };
}
