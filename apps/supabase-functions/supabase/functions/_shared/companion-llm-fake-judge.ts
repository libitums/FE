// 가짜 LLM의 답장 채점(평가 전용, `companion-llm-fake.ts`에서 나눔). 모두 통과 — 학습자 말에 「[spoil]」이 있으면 스포일러 실패,
// 학습 표현 지시가 있으면 답장에 그 표현이 있는지, 이야기 카드가 있으면 본편 일치는 통과.

import type { ReplyJudgement, ReplyJudgeRequest } from "./chat-send.contract.ts";

export function fakeJudgement(request: ReplyJudgeRequest): ReplyJudgement {
  const ok = { pass: true, reason: "가짜 채점" };
  const said = request.reply.map((segment) => segment.text).join(" ");
  return {
    axes: {
      persona: ok,
      speech: ok,
      spoiler: request.userText.includes("[spoil]")
        ? { pass: false, reason: "가짜 채점 — [spoil]" }
        : ok,
      level: ok,
      natural: ok,
      safety: ok,
      learning:
        request.target === null
          ? null
          : { pass: said.includes(request.target.surface), reason: "가짜 채점" },
      canon: request.story === null ? null : ok,
    },
    summary: "가짜 채점",
  };
}
