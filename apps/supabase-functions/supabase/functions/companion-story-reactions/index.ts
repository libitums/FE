import { chatSendEnvFrom } from "../_shared/chat-send-env.ts";
import { companionLlmFor } from "../_shared/companion-llm.ts";
import { reactionEnvOf } from "../_shared/companion-reaction-env.ts";
import { createReactionsHandler } from "../_shared/companion-reactions-handler.ts";
import { storyReaderFrom } from "../_shared/companion-story-read.ts";
import { storyUpkeep } from "../_shared/companion-story-upkeep.ts";
import { outboundTimeoutMs, timedOutbound } from "../_shared/outbound.ts";

// 내 스토리 반응(ADR-0191) — 정리 · 때가 된 반응을 그 인물 방의 메시지로 만들기 · 푸시. 환경은 컴패니언 함수와 같은 이름을 읽고,
// 답은 `COMPANION_REACTION_MODEL`(기본 Sonnet 5.5), 출력 검사 · 번역 · 칩은 Haiku(`companion-reaction-env.ts`).
// 같은 회차에 사진 스토리의 뒷정리도 한다(ADR-0191 D11 — 지운 사진 · 기한 지난 거절 파일 지우기, `checking` 스토리 다시 읽기).
const read = (name: string) => Deno.env.get(name);
const env = reactionEnvOf(chatSendEnvFrom(read), read);
const outbound = timedOutbound(fetch, outboundTimeoutMs);
const reader = storyReaderFrom(read);

Deno.serve(
  createReactionsHandler({
    env,
    outbound,
    ...(env === null
      ? {}
      : { upkeep: (now: string) => storyUpkeep({ outbound, fetch, reader }, env, now) }),
    llm: env === null ? null : companionLlmFor(env),
    nowMs: () => Date.now(),
    randomUuid: () => crypto.randomUUID(),
    log: (entry) => console.log(JSON.stringify(entry)),
  }),
);
