// 자리 표시 상수 한 곳입니다(messenger-chat-ui spec §10). 정해진 값이 없어 전부 추론입니다. 가격은 `CHAT_COIN_PRICES`(chat-coins.ts)에 있습니다.
// 잔액은 여기 없습니다 — 앱의 보유 엽전(coinCount, ADR-0116)을 화면 prop으로 받습니다.

import type { ChatReportReasonId } from "./chat-source.contract";

const reportReasons: readonly ChatReportReasonId[] = [
  "rude",
  "sexual",
  "hateful",
  "wrong-korean",
  "other",
];

export const CHAT_PLACEHOLDERS = {
  coinSeed: 100,
  reportReasons,
  fixMaxLength: 200,
  messageMaxLength: 200,
  replyIdeaCount: 3,
  timing: {
    typingDelayMs: 600,
    replyDelayMs: 1800,
    photoArrivalMs: 3000,
    voiceArrivalMs: 2500,
    underlaySettleMs: 300,
    meaningMs: 700,
    correctionMs: 800,
    turnTickMs: 60_000,
  },
  waveform: [8, 14, 20, 12, 24, 16, 10, 22, 18, 12, 26, 14, 9, 20, 16, 11, 22, 13, 8, 15],
} as const;
