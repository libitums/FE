// 턴 스트림의 첫 이벤트 — `start`(계약 판 · 대화 · 메시지 id · 말투) 뒤 이번 턴 고지(`notice`)를 차례로 보냅니다(API §4.3 순서 규칙).

import type { TurnContext } from "./chat-send-context.ts";
import { CONTRACT_VERSION } from "./companion-contract/index.ts";

export function sendTurnStart({ sink, turn, gate, assistantMessageId }: TurnContext): void {
  sink.send({
    event: "start",
    data: {
      contractVersion: CONTRACT_VERSION,
      conversationId: turn.conversationId,
      userMessageId: turn.userMessageId,
      assistantMessageId,
      speechLevel: turn.speechLevel,
    },
  });
  for (const kind of gate.notices) sink.send({ event: "notice", data: { kind } });
}
