// 이번 유저 말의 입력 출처(설계 문서 §07 ~ §08의 가벼운 판). 입력 길은 둘뿐이다 — 칩을 탭해 그대로 보내기, 직접 입력하기(칩 수정 없음,
// 사용자 결정 2026-11-10). 앱이 칩을 탭해 보냈으면 `suggestion: { message_id, index }`가 오고, 서버는 턴 시작 때 읽은 마지막 캐릭터
// 메시지의 칩(`companion_turn_status.latestSuggestionSet`)과 맞춰 본다.
//   · suggestion — 지금 칩을 글 그대로 보냄. 피드백 모델을 부르지 않는다(칩은 이미 자연스러운 문장).
//   · stale      — 그 사이 새 캐릭터 답이 와 지난 칩이 됨. 직접 입력처럼 피드백한다.
//   · manual     — 직접 입력. 표시가 왔는데 글이 칩과 다르거나 칩을 확인할 수 없어도 여기다(방어).
// 결과는 스트림을 닫은 뒤 `companion_record_choice`가 유저 메시지 meta와 앞 캐릭터 메시지의 칩 셋(`outcome`)에 적는다.

import type { TurnStatus } from "./chat-send-finish.ts";
import type { ChatSendRequest } from "./companion-contract/index.ts";

export type InputSource = "suggestion" | "manual" | "stale";

export type Choice = {
  readonly inputSource: InputSource;
  readonly suggestionMessageId?: string;
  readonly suggestionIndex?: number;
  readonly suggestionIntent?: string;
};

const manual: Choice = { inputSource: "manual" };

export function resolveChoice(
  body: Pick<ChatSendRequest, "text" | "suggestion" | "from_suggestion">,
  status: TurnStatus | null,
): Choice {
  const text = body.text.trim();
  const latest = status?.latestSuggestionSet;
  if (body.suggestion !== undefined) {
    const { message_id: messageId, index } = body.suggestion;
    // 칩을 읽지 못했으면(턴 상태 실패 · 옛 DB) 확인할 수 없다 — 직접 입력으로 보고 피드백한다.
    if (latest === undefined) return manual;
    if (latest === null || latest.messageId !== messageId)
      return { inputSource: "stale", suggestionMessageId: messageId, suggestionIndex: index };
    const item = latest.items[index];
    if (item === undefined || item.text.trim() !== text) return manual;
    return {
      inputSource: "suggestion",
      suggestionMessageId: messageId,
      suggestionIndex: index,
      ...(item.intent ? { suggestionIntent: item.intent } : {}),
    };
  }
  // 옛 표시: 마지막 캐릭터 메시지의 칩 어느 하나와 글이 같으면 그 칩.
  if (body.from_suggestion === true) {
    const texts = latest?.items.map((item) => item.text) ?? status?.latestSuggestions ?? [];
    const index = texts.findIndex((item) => item.trim() === text);
    if (index < 0) return manual;
    const intent = latest?.items[index]?.intent;
    return {
      inputSource: "suggestion",
      ...(latest ? { suggestionMessageId: latest.messageId } : {}),
      suggestionIndex: index,
      ...(intent ? { suggestionIntent: intent } : {}),
    };
  }
  return manual;
}
