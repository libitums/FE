import { chatSendEnvFrom } from "../_shared/chat-send-env.ts";
import { createStoriesHandler } from "../_shared/companion-stories-handler.ts";
import { outboundTimeoutMs, timedOutbound } from "../_shared/outbound.ts";

// 친구 스토리(ADR-0178) — 올림 · 알림. LLM을 부르지 않지만 환경(서버 키 · URL)은 컴패니언 함수와 같은 이름을 읽는다.
const env = chatSendEnvFrom((name) => Deno.env.get(name));

Deno.serve(
  createStoriesHandler({
    env,
    outbound: timedOutbound(fetch, outboundTimeoutMs),
    nowMs: () => Date.now(),
    log: (entry) => console.log(JSON.stringify(entry)),
  }),
);
