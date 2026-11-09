// 답장 보기의 낭독 문자열입니다(messenger-chat-ui spec §4.1). 비지 않은 줄만 「, 」로 잇습니다.

export function chatReplyOptionLabel(primary: string, lines: readonly string[]): string {
  return [primary, ...lines].filter((line) => line !== "").join(", ");
}
