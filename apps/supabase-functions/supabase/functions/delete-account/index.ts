import { signEs256 } from "../_shared/apple-client-secret.ts";
import { purgeUserMedia } from "../_shared/companion-media-purge.ts";
import { purgeUserStoryFiles, STORY_BUCKETS } from "../_shared/companion-story-storage.ts";
import { createDeleteAccountHandler } from "../_shared/delete-account-handler.ts";
import { deleteAccountEnvFrom } from "../_shared/delete-account-env.ts";
import { outboundTimeoutMs, timedOutbound } from "../_shared/outbound.ts";

const env = deleteAccountEnvFrom((name) => Deno.env.get(name));

Deno.serve(
  createDeleteAccountHandler({
    env,
    outbound: timedOutbound(fetch, outboundTimeoutMs),
    nowMs: () => Date.now(),
    signEs256,
    log: (entry) => console.log(JSON.stringify(entry)),
    // 컴패니언 스냅샷 · 음성 파일(`companion-media/<user_id>/`)과 내 스토리 사진 · 거절 격리 파일
    // (`my-story-photos` · `my-story-quarantine`의 `<user_id>/`, ADR-0191 D11). DB 행은 auth.users cascade로 지워진다.
    ...(env === null
      ? {}
      : {
          purgeUserFiles: async (userId: string) => {
            let removed = await purgeUserMedia(fetch, env, userId, outboundTimeoutMs);
            for (const bucket of STORY_BUCKETS)
              removed += await purgeUserStoryFiles(fetch, env, bucket, userId, outboundTimeoutMs);
            return removed;
          },
        }),
  }),
);
