// 친구 스토리의 그림 한 장(ADR-0192 D5). 스냅샷 v2m(ADR-0179)의 장면 설계 · 기준 그림 · 엔진을 다시 쓰되, 메시지 · 사용자 · 엽전과 떨어져 있다.
// - 인물이 나오는 컷(`selfie` 셀카 · `other` 남이 찍어 준 컷): 묶음(manifest) → 장면 설계(초안의 그림 주문을 무대 지시로) → 라우팅 · 조립 → 기준 그림 한 장 + 편집 호출 → 검사(v2m 검사 글).
//   묶음이 없으면 그리지 않는다(`no_bundle` — 그림 주문이 인물을 전제로 쓰여 있어 풍경 컷으로 바꾸면 주문과 어긋난다. 사람이 컷을 바꾼다).
// - 인물 없는 컷(`scene` — 사물 · 풍경, 손까지): 그림 주문을 고정 규칙 문장과 조립 → 기준 그림 없이 생성 호출 → 검사(사람 얼굴 · 글자 · 로고 없음).
// - 모두에게 보이므로 규칙은 미성년자 기준(`minor`)이고 검사는 늘 돈다. 세로 2:3(1024x1536), webp.
// - 안전하지 않다는 판정은 올리지 않는다. 그 밖의 탈락(동일성 · 깨진 글자 · 주문과 다름)은 다시 그리고, 마지막 시도면 경고를 달아 사람에게 보인다.
// - 그림이 검사를 통과하면 그 그림을 보고 문구를 맞춘다(D10 — `deps.caption`). 고친 글은 결과의 `line`으로 돌려준다.
// 던지지 않는다 — 결과(`ok` · `retry`)로 돌려준다. 저장소 올리기는 부르는 쪽이 준 `upload`가 한다. 두 길의 본문은 `companion-story-image-draw.ts`.

import { downloadRefJson, EngineError, type Fetch } from "./companion-media-engines.ts";
import type { MediaEnv } from "./companion-media-env.ts";
import { bundleDir, manifestFrom } from "./companion-snapshot-v2.ts";
import type { StoryCaption, StoryCaptioner } from "./companion-story-caption.ts";
import {
  drawCharacter,
  type DrawContext,
  drawScenery,
  short,
  Stop,
  STORY_IMAGE_SIZE,
  type StoryImageJob,
} from "./companion-story-image-draw.ts";

export { STORY_IMAGE_SIZE, type StoryImageJob } from "./companion-story-image-draw.ts";
export const STORY_IMAGE_TRIES = 3;
/** 한 장에 쓰는 시간(ms) — Edge 상한 150초 안에서 앞의 인증 · 고르기와 뒤의 닫기 · 파일 지우기까지 끝나게. */
export const STORY_IMAGE_BUDGET_MS = 105_000;

export type StoryImageDeps = {
  /** 그림을 보고 문구를 맞추는 단계(`companion-story-caption.ts`). 없으면 초안 그대로. */
  readonly caption?: StoryCaptioner | null;
  readonly fetch: Fetch;
  readonly nowMs: () => number;
  /** 그림을 공개 버킷에 올리고 묶음에 적을 경로를 돌려준다. */
  readonly upload: (job: StoryImageJob, bytes: Uint8Array, timeoutMs: number) => Promise<string>;
  readonly budgetMs?: number;
};
export type StoryImageResult =
  | {
      readonly ok: true;
      readonly path: string;
      readonly meta: Record<string, unknown>;
      /** 그림에 맞춰 고친 문구(고쳤을 때만). */
      readonly line: StoryLine | null;
    }
  | {
      readonly ok: false;
      readonly error: string;
      readonly retry: boolean;
      readonly meta: Record<string, unknown>;
    };

export type StoryLine = {
  /** 이 글을 맞출 때 본 초안의 한 줄 — 닫기가 지금 글과 같을 때만 바꾼다. */
  readonly from: string;
  readonly ko: string;
  readonly reading: string;
  readonly en: string;
  readonly replies: readonly string[];
};
const flat = (text: string, max: number) =>
  [...text.replace(/\s+/gu, " ").trim()].slice(0, max).join("").trimEnd();

/** 한 줄에 쓸 수 있는 글자 — 한글 · 숫자 · 로마자 · 흔한 문장부호. 이모지 · 다른 문자가 섞이면 쓰지 않는다. */
const LINE_CHARS = /^[가-힣ㄱ-ㅎㅏ-ㅣ0-9A-Za-z\s.,!?~'"“”‘’()·…:;%+\-/&]+$/u;
/** 고친 한 줄의 길이 상한(지시는 60자) — 넘으면 자르지 않고 버린다. */
const LINE_MAX = 80;

/**
 * 문구 맞추기의 출력 → 쓸 글. `keep`: 그대로(모델이 그대로 두었거나 같은 글) · `unusable`: 고쳤다는데 쓸 수 없는 글(초안 그대로 간다).
 * 쓸 수 없는 글: 비었거나 너무 길다 · 한글이 거의 없다 · 쓸 수 없는 글자(이모지 등) · 초안에 없던 로마자 낱말(주소 · 영어 문장이 끼어든 것).
 */
export function lineFrom(
  caption: StoryCaption,
  draft: { readonly ko: string },
): StoryLine | "keep" | "unusable" {
  const flatAll = (text: string) => text.replace(/\s+/gu, " ").trim();
  const [ko, en] = [flatAll(caption.ko), flat(caption.en, 300)];
  if (!caption.changed || ko === flatAll(draft.ko)) return "keep";
  const replies = [...new Set(caption.replies.map((reply) => flat(reply, 40)))]
    .filter((reply) => reply !== "")
    .slice(0, 3);
  const latinOk = (ko.match(/[A-Za-z]+/g) ?? []).every((word) => draft.ko.includes(word));
  if (
    ko === "" ||
    en === "" ||
    replies.length === 0 ||
    [...ko].length > LINE_MAX ||
    (ko.match(/[가-힣]/gu) ?? []).length < 2 ||
    !LINE_CHARS.test(ko) ||
    !latinOk
  )
    return "unusable";
  return { from: draft.ko, ko, reading: flat(caption.reading, 200), en, replies };
}

export async function drawStoryImage(
  deps: StoryImageDeps,
  env: MediaEnv,
  job: StoryImageJob,
): Promise<StoryImageResult> {
  const started = deps.nowMs();
  const deadline = started + (deps.budgetMs ?? STORY_IMAGE_BUDGET_MS);
  const timings: Record<string, number> = {};
  const usage: Record<string, unknown> = {};
  const meta: Record<string, unknown> = {
    aiGenerated: true,
    model: job.engine,
    quality: job.quality,
    size: STORY_IMAGE_SIZE,
    nodeModel: env.snapshotModel,
    shot: job.shot,
    usage,
    timings,
  };
  // 모자라면 시도하지 않고 다음 회차로 미룬다.
  const within = (cap: number, reserve: number) => {
    const left = deadline - deps.nowMs() - reserve;
    if (left < 3_000) throw new Stop("budget exhausted", true);
    return Math.min(cap, left);
  };
  const timed = async <T>(name: string, work: () => Promise<T>): Promise<T> => {
    const from = deps.nowMs();
    try {
      return await work();
    } finally {
      timings[name] = deps.nowMs() - from;
    }
  };
  const last = job.tries >= STORY_IMAGE_TRIES;

  try {
    if (env.anthropicKey === null || env.openaiKey === null) throw new Stop("keys missing", false);
    const ctx: DrawContext = {
      fetch: deps.fetch,
      env,
      job,
      anthropicKey: env.anthropicKey,
      openaiKey: env.openaiKey,
      last,
      meta,
      usage,
      within,
      timed,
    };
    // 인물 컷은 묶음(manifest)이 있어야 한다. 읽기 오류는 다음 회차에 다시, 없거나 틀리면 사람에게 넘긴다.
    let manifest = null;
    if (job.shot !== "scene") {
      if (job.refSlug === null) throw new Stop("no_bundle", false);
      const timeout = within(8_000, 80_000);
      const name = `${bundleDir(job.refSlug)}/manifest.json`;
      const raw = await timed("bundle", () =>
        downloadRefJson(deps.fetch, env, name, timeout),
      ).catch((error) => {
        throw new Stop(`bundle: ${short(error)}`, true);
      });
      manifest = manifestFrom(raw);
      if (manifest === null) throw new Stop("no_bundle", false);
    }
    const { bytes, warnings } =
      manifest !== null ? await drawCharacter(ctx, manifest) : await drawScenery(ctx);

    // 안전하지만 흠이 있는 그림 — 다시 그린다. 마지막 시도면 경고를 달아 사람이 보고 정하게 한다.
    if (warnings.length > 0 && !last) throw new Stop(`check: ${warnings.join(", ")}`, true);
    if (warnings.length > 0) meta["warnings"] = warnings;

    // 문구 맞추기 — 그림을 보고 한 줄을 맞춘다. 실패해도 그림은 살린다(초안 그대로).
    let line: StoryLine | null = null;
    if (deps.caption) {
      try {
        const timeout = within(20_000, 12_000);
        const caption = await timed("caption", () =>
          deps.caption!({
            image: { bytes, mime: "image/webp" },
            characterName: job.characterName,
            persona: job.persona,
            shot: job.shot,
            topic: job.topic,
            ko: job.ko,
            en: job.meaning,
            replies: job.replies,
            wordKo: job.wordKo,
            signal: AbortSignal.timeout(timeout),
          }),
        );
        const fitted = lineFrom(caption, job);
        line = typeof fitted === "string" ? null : fitted;
        meta["caption"] =
          fitted === "unusable"
            ? "unusable"
            : fitted === "keep"
              ? { changed: false }
              : { changed: true, draft: { ko: job.ko, en: job.meaning } };
      } catch {
        meta["caption"] = "failed";
      }
    }
    const uploadTimeout = within(12_000, 0);
    const path = await timed("upload", () => deps.upload(job, bytes, uploadTimeout)).catch(
      (error) => {
        throw new Stop(`upload: ${short(error)}`, true);
      },
    );
    meta["bytes"] = bytes.length;
    meta["ms"] = deps.nowMs() - started;
    return { ok: true, path, meta, line };
  } catch (error) {
    meta["ms"] = deps.nowMs() - started;
    if (error instanceof Stop) return { ok: false, error: error.message, retry: error.retry, meta };
    // 엔진 거절은 다시 해도 같다. 그 밖의 엔진 오류는 다음 회차에 다시.
    const refused = error instanceof EngineError && error.refused;
    return {
      ok: false,
      error: `${refused ? "engine refused" : "engine"}: ${short(error)}`,
      retry: !refused,
      meta,
    };
  }
}
