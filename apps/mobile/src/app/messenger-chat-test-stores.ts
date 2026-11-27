// 메신저 결선에 테스트가 끼우는 메모리 저장 · 가짜 시계의 모양입니다(`setMessengerChatStoresForTests`). 앱은 기기 저장 · `Date.now`를 씁니다.

import type { UnlockStore } from "../screens/messenger-chat/chat-local-stores";
import type { ChatTier } from "../screens/messenger-chat/free-turns";

export type TestStores = {
  readonly unlock: UnlockStore;
  readonly now: () => number;
  /** 체험 남은 수의 처음 값입니다. 없으면 앱 안 방의 기본(체험 20통). */
  readonly trial?: number | null;
  /**
   * 대화 등급을 고정합니다. 시험 계정은 무제한이라, 체험 · 엽전 흐름을 앱 단에서 보는 테스트는 `free`를 넘깁니다.
   * 없으면 시험 계정 표시로 정합니다.
   */
  readonly tier?: ChatTier;
};
