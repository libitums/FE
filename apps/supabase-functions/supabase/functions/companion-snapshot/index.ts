import { createMediaHandler } from "../_shared/companion-media-handler.ts";
import { mediaEnvFrom } from "../_shared/companion-media-env.ts";

Deno.serve(
  createMediaHandler("snapshot", {
    env: mediaEnvFrom((name) => Deno.env.get(name)),
    fetch,
    nowMs: () => Date.now(),
    waitUntil: (work) => EdgeRuntime.waitUntil(work),
    log: (entry) => console.log(JSON.stringify(entry)),
  }),
);
