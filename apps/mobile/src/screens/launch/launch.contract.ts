// 엽전 출시 · 채팅 새 기능 모달의 계약입니다(ADR-0140).

const id = (suffix: string): string => `launch-${suffix}`;

export const launchTestIds = {
  coins: id("coins"),
  balance: id("balance"),
  gotIt: id("got-it"),
  chat: id("chat"),
  person: (index: number): string => id(`person-${index}`),
  later: id("later"),
  start: id("start"),
} as const;

export type LaunchCoinsModalProps = {
  /** 깬 에피소드에서 소급한 학습 보상(0이면 그 줄 없음). */
  readonly learning: number;
  readonly bonus: number;
  /** 서버 지갑 잔액. */
  readonly balance: number;
  /** 날아갈 곳 — 지도 머리 엽전 칩 아이콘의 id. */
  readonly coinTargetId: string;
  /** 엽전이 하나 닿을 때마다(닿은 수 · 전체 수) — 칩 숫자를 그만큼 올립니다. */
  readonly onCoinLanded?: (landed: number, of: number) => void;
  /** 마지막 엽전이 칩에 닿은 뒤(움직임 줄이기면 곧바로) — 닫기. */
  readonly onDone: () => void;
};

export type LaunchCastMember = {
  readonly name: string;
  readonly avatarUrl: string | null;
  readonly met: boolean;
  /** 만나는 에피소드 번호 — 처음부터 열린 인물은 null. */
  readonly episode: number | null;
};

export type ChatIntroModalProps = {
  readonly cast: readonly LaunchCastMember[];
  readonly onLater: () => void;
  readonly onStart: () => void;
  /** 시스템 뒤로가기로 닫을 때 — 없으면 `onLater`와 같습니다. */
  readonly onBack?: () => void;
};
