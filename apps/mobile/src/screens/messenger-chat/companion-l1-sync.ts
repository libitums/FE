// 학습자 언어(L1) 맞추기입니다(2026-11-17) — 서버 방은 앱 화면 언어를 서버 프로필 `l1`로 보냅니다. 서버는 캐릭터 답 번역 · 교정
// 설명 · 추천 답변 뜻을 이 언어로 만들고, 비어 있으면 영어로 만듭니다(`chat-send-translate.ts`). 출처를 만들 때 한 번, 화면
// 언어를 바꿀 때마다 맞추고, 같은 언어는 다시 보내지 않습니다. 못 맞췄으면 다음 기회에 같은 언어도 다시 보냅니다.

import type { ChatProfileRemote } from "./chat-remote.contract";

export function companionL1Sync(
  profile: Pick<ChatProfileRemote, "syncL1"> | undefined,
  current: () => string,
  subscribe: (listener: (language: string) => void) => () => void,
): () => void {
  const sync = profile?.syncL1;
  if (sync === undefined) return () => undefined;
  let sent: string | null = null;
  const send = (l1: string) => {
    if (l1 === sent) return;
    sent = l1;
    void sync(l1)
      .catch(() => false)
      .then((ok) => {
        if (!ok && sent === l1) sent = null;
      });
  };
  send(current());
  return subscribe(send);
}
