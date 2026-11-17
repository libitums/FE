// 답장 보기의 낭독 문자열입니다(messenger-chat-ui spec §4.1). 비지 않은 줄만 「, 」로 잇고, 동작(`action`)이 있으면 끝에 붙입니다.

export function chatReplyOptionLabel(
  primary: string,
  lines: readonly string[],
  action?: string,
): string {
  return [primary, ...lines, action ?? ""].filter((line) => line !== "").join(", ");
}
