import type { SafeAreaInsets } from "./safe-area";

/** 셸이 자판 화면에 맡긴 세 가장자리입니다(위는 셸이 집니다). 단위는 호스트 값 그대로(pt/dp). */
export type KeyboardDockEdges = {
  readonly bottom: number;
  readonly left: number;
  readonly right: number;
};

export const zeroKeyboardDockEdges: KeyboardDockEdges = { bottom: 0, left: 0, right: 0 };

/** 자판 화면에서 아래 가장자리를 누가 지는가입니다 — 자판이 서면 자판, 아니면 몸통. */
export type KeyboardDockBottom = "keyboard" | "body";

/** 몸통 상자(자판 밖 내용)의 인라인 바깥 여백입니다. */
export type KeyboardDockBodyStyle = {
  readonly marginBottom: string;
  readonly marginLeft: string;
  readonly marginRight: string;
};

/** 자판 키 줄 묶음의 인라인 바깥 여백입니다 — 면의 CSS 여백에 더해집니다. */
export type KeyboardRowsInsetStyle = {
  readonly marginBottom: string;
  readonly marginLeft: string;
  readonly marginRight: string;
};

function edge(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function px(value: number): string {
  return `${edge(value)}px`;
}

/** 세 변을 뽑습니다. `top`은 버립니다. 유한한 양수가 아닌 값은 0. */
export function keyboardDockEdgesOf(insets: SafeAreaInsets): KeyboardDockEdges {
  return { bottom: edge(insets.bottom), left: edge(insets.left), right: edge(insets.right) };
}

/** 몸통 상자의 인라인 바깥 여백입니다. 아래는 몸통이 질 때만 인셋입니다. */
export function keyboardDockBodyStyle(
  edges: KeyboardDockEdges,
  bottom: KeyboardDockBottom,
): KeyboardDockBodyStyle {
  return {
    marginBottom: bottom === "body" ? px(edges.bottom) : "0px",
    marginLeft: px(edges.left),
    marginRight: px(edges.right),
  };
}

/** 자판 키 줄 묶음의 인라인 바깥 여백입니다. */
export function keyboardRowsInsetStyle(edges: KeyboardDockEdges): KeyboardRowsInsetStyle {
  return {
    marginBottom: px(edges.bottom),
    marginLeft: px(edges.left),
    marginRight: px(edges.right),
  };
}
