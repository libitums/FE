// 메신저 방 로그의 jumpKey입니다 — 학습자가 무언가를 보냈을 때(글 · 사진 · 음성 요청)만 바뀝니다.
// 줄의 id만 바뀌는 교체(보낸 글 localId → 서버 id, 매체 `~req` → `~<media id>`, 대기 → 완료 · 고지)는 계기가 아닙니다 — 보낸
// 직후 한 번 더 끌어내리지 않게. 그래서 id가 아니라 「내 글 수 · 마지막 내 글 · 매체 요청 정체 수」로 셉니다.

import { mediaLineKey } from "./chat-media-rules";
import type { ChatMessage } from "./chat-source.contract";

const MEDIA_KINDS: ReadonlySet<ChatMessage["kind"]> = new Set<ChatMessage["kind"]>([
  "photo-pending",
  "voice-pending",
  "photo",
  "voice",
]);

/** 매체 요청 하나의 정체 — 서버 매체 줄은 대상 · 종류(접미는 요청 → 결과로 바뀜), 가짜 출처는 줄 id(대기 · 결과가 같은 id). */
function mediaIdentity(message: ChatMessage): string | null {
  const key = mediaLineKey(message.id);
  if (key !== null) return `${key.targetId}~${key.media}`;
  return MEDIA_KINDS.has(message.kind) ? message.id : null;
}

/** `skip`인 줄은 세지 않습니다 — 안내의 무료 예시는 첫 인사 아래에 서서 끝으로 내리지 않고 그 줄을 보입니다(ADR-0146 개정). */
export function jumpKeyOf(
  messages: readonly ChatMessage[],
  skip: (id: string) => boolean = () => false,
): string {
  let own = 0;
  let last = "";
  const media = new Set<string>();
  for (const message of messages) {
    if (skip(message.id)) continue;
    if (message.kind === "text" && message.from === "me") {
      own += 1;
      last = message.text.ko; // 고친 문장 다시 보내기(ADR-0129)는 글 수가 같아도 글이 바뀝니다.
      continue;
    }
    const identity = mediaIdentity(message);
    if (identity !== null) media.add(identity);
  }
  return `${own}:${media.size}:${last}`;
}
