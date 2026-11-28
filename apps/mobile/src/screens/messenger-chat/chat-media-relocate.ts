// 서버 사진 · 음성 줄의 자리 옮김 — 같은 매체(media id)가 다른 대상 아래에 이미 서 있으면 그 줄을 뺍니다.
//
// 결과 줄 id는 `<대상>~<종류>~<media id>`라, 서버가 그 매체를 다른 메시지에 붙였다고 알려 오면(받기 응답의 `messageId` · 다시 읽은
// 행 · 운영 정리로 옮긴 예시) 같은 사진이 두 대상 아래에 두 줄로 남았습니다(가이드 예시 두 장, #648 뒤). 매체 하나는 한 줄입니다.

import { mediaLineKey } from "./chat-media-rules";
import type { ChatMessage } from "./chat-source.contract";

/** 서버 media id(uuid) — 자리표시자 `req` · 회색 줄 `x번호`는 앱이 만든 이름이라 매체가 아닙니다. */
const MEDIA_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** `line`과 같은 매체(종류 · media id)인데 대상이 다른 줄을 뺀 로그. 자리표시자(`req`) · 회색 줄(`x번호`)은 건드리지 않습니다. */
export function withoutMovedCopies(
  messages: readonly ChatMessage[],
  line: ChatMessage,
): ChatMessage[] {
  const key = mediaLineKey(line.id);
  if (key === null || !MEDIA_ID.test(key.suffix)) return [...messages];
  return messages.filter((message) => {
    const other = mediaLineKey(message.id);
    return (
      other === null ||
      other.suffix !== key.suffix ||
      other.media !== key.media ||
      other.targetId === key.targetId
    );
  });
}
