import { chatSendEnvFrom } from "../_shared/chat-send-env.ts";
import { createStudioHandler } from "../_shared/companion-story-studio-handler.ts";
import { studioLlmFrom } from "../_shared/companion-story-studio-llm.ts";
import { outboundTimeoutMs, timedOutbound } from "../_shared/outbound.ts";

// 친구 스토리 주간 기획(ADR-0192) — 운영 도구가 서버 키로 부른다: 달력 · 소재 조사(웹 검색) · 초안 쓰기 · 검토(두 번 승인).
// 조사 · 초안은 `COMPANION_STORY_PLAN_MODEL`(기본 Sonnet 5.5), 최종 승인의 번역은 Haiku. 그림은 `companion-story-images`가 그린다.
const read = (name: string) => Deno.env.get(name);

Deno.serve(
  createStudioHandler({
    env: chatSendEnvFrom(read),
    outbound: timedOutbound(fetch, outboundTimeoutMs),
    llm: studioLlmFrom(read),
    nowMs: () => Date.now(),
    log: (entry) => console.log(JSON.stringify(entry)),
  }),
);
