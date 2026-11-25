import { chatSendEnvFrom } from "../_shared/chat-send-env.ts";
import { companionLlmFor } from "../_shared/companion-llm.ts";
import { createMyStoryHandler } from "../_shared/companion-my-story-handler.ts";
import { reactionEnvOf } from "../_shared/companion-reaction-env.ts";
import { storyReaderFrom } from "../_shared/companion-story-read.ts";
import { outboundTimeoutMs, timedOutbound } from "../_shared/outbound.ts";

// 사진 스토리(ADR-0191 D11) — 교정 · 올리기 · 글 고치기. 글 검수 · 번역은 반응 함수와 같은 모델 환경(Haiku), 교정은 대화의 피드백 모델
// (`COMPANION_FEEDBACK_MODEL`), 사진 읽기는 `COMPANION_STORY_READ_MODEL`(기본 Sonnet 5.5)이다.
const read = (name: string) => Deno.env.get(name);
const env = reactionEnvOf(chatSendEnvFrom(read), read);

Deno.serve(
  createMyStoryHandler({
    env,
    outbound: timedOutbound(fetch, outboundTimeoutMs),
    fetch,
    llm: env === null ? null : companionLlmFor(env),
    reader: storyReaderFrom(read),
    nowMs: () => Date.now(),
    log: (entry) => console.log(JSON.stringify(entry)),
  }),
);
