// 키 없는 기억 추출(`companion-llm-fake.ts`의 `extractMemories`). 묶음의 유저 메시지마다
//   「저는 … 좋아해요」 → 더하기   「…로 이사했어요」 → 「… 산다」 기억 고치기   「이제 …(을) 안 좋아해요」 → 그 기억 잊기

import type { MemoryOp, MemoryRequest } from "./chat-send.contract.ts";

export function fakeMemoryOps(request: Pick<MemoryRequest, "messages" | "existing">): MemoryOp[] {
  const find = (word: string) => request.existing.find((memory) => memory.content.includes(word));
  return request.messages.flatMap((entry): MemoryOp[] => {
    if (entry.role !== "user") return [];
    const likes = /저는 (.{1,20}) 좋아해요/.exec(entry.text);
    if (likes)
      return [
        { op: "add", kind: "fact", content: `${likes[1]} 좋아한다`, shared: true, reason: "fake" },
      ];
    const moved = /(\S+?)(?:으로|로) 이사했어요/.exec(entry.text);
    const home = moved ? find("산다") : undefined;
    if (moved && home)
      return [{ op: "update", ref: home.ref, content: `${moved[1]}에 산다`, reason: "fake" }];
    const quit = /이제 (\S+?)(?:을|를)? 안 좋아해요/.exec(entry.text);
    const liked = quit ? find(quit[1]!) : undefined;
    return liked ? [{ op: "forget", ref: liked.ref, reason: "fake" }] : [];
  });
}
