// 한글 자판의 타입 전용 계약입니다 — 구현·고정 데이터·JSX를 두지 않습니다. 메신저 화면은 사라졌고(카탈로그 타이핑
// `TypingActivity`가 이 자판을 씁니다) 자판 몫만 남았습니다.

import type { KeyboardDockEdges } from "../../lib/keyboard-dock";

export type MessengerKeyboardProps = {
  readonly shifted: boolean;
  readonly onPress: (key: string) => void;
  readonly onBackspace: () => void;
  readonly onShift: () => void;
  /** 셸이 맡긴 아래 · 좌 · 우입니다. 키 줄 묶음의 바깥 여백이 됩니다. 0이면 지금과 같습니다. */
  readonly edges: KeyboardDockEdges;
};
