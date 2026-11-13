import { signEs256 } from "../_shared/apple-client-secret.ts";
import { purgeUserMedia } from "../_shared/companion-media-engines.ts";
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
    // 컴패니언 스냅샷 · 음성 파일(`companion-media/<user_id>/`). DB 행은 auth.users cascade로 지워진다.
    ...(env === null
      ? {}
      : {
          purgeUserFiles: (userId: string) => purgeUserMedia(fetch, env, userId, outboundTimeoutMs),
        }),
  }),
);
