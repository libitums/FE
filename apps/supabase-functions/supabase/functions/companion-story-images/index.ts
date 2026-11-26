import { mediaEnvFrom } from "../_shared/companion-media-env.ts";
import { storyCaptionerFrom } from "../_shared/companion-story-caption.ts";
import { createStoryImagesHandler } from "../_shared/companion-story-images-handler.ts";
import { outboundTimeoutMs, timedOutbound } from "../_shared/outbound.ts";

// 친구 스토리 그림 일꾼(ADR-0192 D5) — 기획 승인된 초안을 한 번에 둘까지 그린다(pg_cron 매분 · 운영 도구의 「지금 그리기」).
// 그림이 검사를 통과하면 그 그림을 보고 문구를 맞춘다(`COMPANION_STORY_PLAN_MODEL`, 기본 Sonnet 5.5).
// 환경은 스냅샷과 같은 이름을 읽는다(ANTHROPIC_API_KEY · OPENAI_API_KEY · COMPANION_SNAPSHOT_MODEL). 그림은 공개 콘텐츠 버킷
// (`COMPANION_CONTENT_BUCKET`, 기본 `content` — 앱이 읽는 버킷과 같아야 한다)에 올린다.
const read = (name: string) => Deno.env.get(name);
const bucket = read("COMPANION_CONTENT_BUCKET")?.trim() ?? "";

Deno.serve(
  createStoryImagesHandler({
    env: mediaEnvFrom(read),
    bucket: /^content(-[a-z0-9-]+)?$/.test(bucket) ? bucket : "content",
    outbound: timedOutbound(fetch, outboundTimeoutMs),
    fetch,
    caption: storyCaptionerFrom(read),
    nowMs: () => Date.now(),
    log: (entry) => console.log(JSON.stringify(entry)),
  }),
);
