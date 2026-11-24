// 스냅샷 진행 표시 — 단계 · 비율(20270104)과 중간 그림 미리보기(20261207).
// - 이미지 엔진을 부르기 직전(`start`) 장면 구상이 끝났으니 `companion_media_stage`로 단계 `drawing`과 고른 비율을 행에 적는다 — 앱은 만드는 중
//   결과의 `stage` · `stageAt`으로 상태 줄 · 진행 막대를, `aspect`로 자리표시자 비율을 맞춘다(ADR-0146 개정 2026-11-23).
// - 이미지 엔진이 보낸 흐릿한 중간 그림을 `companion-media/<user>/<media>.preview.png`로 올리고 `companion_media_preview`로 행에 적는다 — 앱은
//   만드는 중 결과의 `previewPath`로 먼저 보인다.
// 둘 다 덤이라 실패해도 그림은 계속 만든다. 어떻게 끝나든 닫기 전에 `clear()`로 미리보기를 지운다(남기면 고아 파일). 지우기 실패는 무시 —
// 계정 삭제가 폴더째 지운다.

import { removeMedia, uploadMedia } from "./companion-media-engines.ts";
import type { Aspect } from "./companion-snapshot-prompts.ts";
import type { MediaEnv } from "./companion-media-env.ts";
import type { MediaRunDeps } from "./companion-media-job.ts";
import { callRpc } from "./companion-rpc.ts";

/** 미리보기 올리기 · 지우기의 제한 시간(ms). 길게 기다리지 않는다. */
const previewTimeoutMs = 10_000;
const clearTimeoutMs = 5_000;

export function snapshotPreview(
  deps: MediaRunDeps,
  env: MediaEnv,
  job: { readonly userId: string; readonly mediaId: string },
  timings: Record<string, number>,
) {
  const path = `${job.userId}/${job.mediaId}.preview.png`;
  let uploaded = false;
  let from = deps.nowMs();
  let staged: Promise<unknown> = Promise.resolve();
  return {
    path,
    /**
     * 이미지 엔진을 부르기 직전 — 단계 `drawing`과 비율을 적고(기다리지 않는다 — 그리기를 늦추지 않게), 첫 중간 그림까지의 시간
     * (`timings.firstPartial`)을 여기서 잰다.
     */
    start(aspect: Aspect) {
      from = deps.nowMs();
      staged = callRpc(deps.outbound, env, "companion_media_stage", {
        p_media_id: job.mediaId,
        p_stage: "drawing",
        p_aspect: aspect,
      }).catch(() => undefined);
    },
    async onPartial(bytes: Uint8Array) {
      await uploadMedia(
        deps.fetch,
        env,
        path,
        bytes,
        "image/png",
        Math.min(deps.storageTimeoutMs ?? previewTimeoutMs, previewTimeoutMs),
      );
      uploaded = true;
      await callRpc(deps.outbound, env, "companion_media_preview", {
        p_media_id: job.mediaId,
        p_path: path,
      });
      timings["firstPartial"] ??= deps.nowMs() - from;
    },
    async clear() {
      await staged; // 단계 적기가 닫기(finish) 뒤에 닿지 않게 — 닿아도 pending이 아니라 바뀌는 것은 없다
      if (uploaded) await removeMedia(deps.fetch, env, path, clearTimeoutMs);
    },
  };
}
