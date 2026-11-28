// 친구 스토리 그림의 두 길(ADR-0192 D5 · D9) — 인물이 나오는 컷(셀카 · 남이 찍어 준 컷: 장면 설계 · 기준 그림 · 편집 · v2m 검사)과
// 인물 없는 컷(손까지: 생성 · 사물 검사).
// 예산 · 닫기 · 올리기는 부르는 쪽(`companion-story-image.ts`)이 한다. 멈출 까닭은 `Stop`으로 던진다(다시 할 수 있는가를 싣는다).

import { claudeTool, downloadRef, type Fetch, imageBlock } from "./companion-media-engines.ts";
import type { MediaEnv } from "./companion-media-env.ts";
import { openaiImageEdit, openaiImageGenerate } from "./companion-media-openai.ts";
import {
  CHECK_TOOL,
  checkSystem,
  compose,
  type Manifest,
  normalizePlan,
  PLAN_TOOL,
  planContent,
  planSystem,
  type RecentPlan,
  route,
  SELFIE_SHOTS,
  type StoredPlan,
  suggestion,
  v2VerdictFrom,
} from "./companion-snapshot-v2.ts";
import {
  SCENERY_CHECK_SYSTEM,
  SHOT_PLAN_RULES,
  SCENERY_CHECK_TOOL,
  sceneryPrompt,
  sceneryVerdictFrom,
  STORY_FRAME,
  STORY_PLAN_RULES,
} from "./companion-story-image-prompts.ts";
import type { StoryShot } from "./companion-story-studio-shots.ts";

export const STORY_IMAGE_SIZE = "1024x1536";
/** webp 압축 정도 — 100(기본)이면 한 장이 1.5 MB다(2026-11-24 시험). 모두가 받는 공개 파일이라 줄인다. */
export const STORY_IMAGE_COMPRESSION = 82;

export type StoryImageJob = {
  readonly id: string;
  readonly characterId: string;
  readonly characterName: string;
  readonly look: string;
  readonly refSlug: string | null;
  readonly ko: string;
  readonly meaning: string;
  /** selfie · other는 인물이 나오는 컷(기준 그림), scene은 인물 없는 컷(손까지). */
  readonly shot: StoryShot;
  readonly scene: string;
  /** 그림 뒤 문구 맞추기에 쓰는 것 — 인물 카드 · 소재 · 추천 답안 · 붙어 있는 단어. */
  readonly persona: unknown;
  readonly topic: string;
  readonly replies: readonly string[];
  readonly wordKo: string | null;
  readonly tries: number;
  readonly recent: readonly RecentPlan[];
  readonly engine: string;
  readonly quality: string;
};

/** 멈춤 — `retry`가 참이면 다음 회차에 다시 그린다. */
export class Stop extends Error {
  constructor(
    message: string,
    readonly retry: boolean,
  ) {
    super(message);
  }
}
export const short = (error: unknown) => String((error as Error)?.message ?? error).slice(0, 300);

export type DrawContext = {
  readonly fetch: Fetch;
  readonly env: MediaEnv;
  readonly job: StoryImageJob;
  readonly anthropicKey: string;
  readonly openaiKey: string;
  /** 마지막 시도인가 — 안전하지 않은 그림은 여기서 실패로 끝난다. */
  readonly last: boolean;
  readonly meta: Record<string, unknown>;
  readonly usage: Record<string, unknown>;
  /** 이 단계에 쓸 시간(ms) — 남은 예산에서 뒤 단계 몫(`reserve`)을 뺀 만큼, 상한 `cap`. */
  readonly within: (cap: number, reserve: number) => number;
  readonly timed: <T>(name: string, work: () => Promise<T>) => Promise<T>;
};
export type Drawn = { readonly bytes: Uint8Array; readonly warnings: string[] };

/** 인물 컷: 장면 설계 → 조립 → 기준 그림 + 편집 → 검사. */
export async function drawCharacter(ctx: DrawContext, bundle: Manifest): Promise<Drawn> {
  // ---- 인물 컷: 장면 설계 → 조립 → 기준 그림 + 편집
  ctx.meta["pipeline"] = "story-v2m";
  // 고정 대상 그림(ADR-0179 D8)은 스냅샷에만 붙인다 — 스토리의 장면 설계 입력 · 계획에는 넣지 않는다(글이 전과 같다).
  const manifest: Manifest = { ...bundle, subjects: [] };
  // 셀카면 각도를 셀카로, 남이 찍어 준 컷이면 셀카 각도를 쓰지 않는다 — 권하는 값과 계획 둘 다에서 고정한다.
  const selfie = ctx.job.shot === "selfie";
  const base = suggestion(ctx.job.recent);
  const suggest = selfie
    ? {
        shot: SELFIE_SHOTS.includes(base.shot) ? base.shot : ("medium" as const),
        angle: "selfie" as const,
      }
    : { shot: base.shot, angle: base.angle === "selfie" ? ("eye_level" as const) : base.angle };
  const call = await ctx
    .timed("plan", () =>
      claudeTool(
        ctx.fetch,
        ctx.anthropicKey,
        ctx.env.snapshotModel,
        {
          system:
            planSystem("minor") + STORY_PLAN_RULES + SHOT_PLAN_RULES[selfie ? "selfie" : "other"],
          tool: PLAN_TOOL,
          content: planContent({
            characterName: ctx.job.characterName,
            look: ctx.job.look,
            context: [],
            segments: [
              { kind: "action", text: ctx.job.scene },
              {
                kind: "speech",
                text: ctx.job.meaning ? `${ctx.job.ko} (${ctx.job.meaning})` : ctx.job.ko,
              },
            ],
            snapshotSelf: "hidden",
            manifest,
            recent: ctx.job.recent,
            suggest,
          }),
          maxTokens: 1024,
        },
        ctx.within(20_000, 65_000),
      ),
    )
    .catch((error) => {
      throw new Stop(`plan: ${short(error)}`, true);
    });
  ctx.usage["plan"] = call.usage;
  const raw = normalizePlan(call.input, manifest, "hidden");
  if (raw === null) throw new Stop("plan: bad shape", true);
  // 스토리에는 학습자가 없다 — 모델이 뭐라 했든 고정한다.
  const plan = {
    ...raw,
    learner: "none" as const,
    background_text: null,
    shot: selfie
      ? SELFIE_SHOTS.includes(raw.shot)
        ? raw.shot
        : ("medium" as const)
      : raw.shot === "over_shoulder"
        ? ("medium" as const)
        : raw.shot,
    angle: selfie
      ? ("selfie" as const)
      : raw.angle === "selfie"
        ? ("eye_level" as const)
        : raw.angle,
  };
  const routed = route(manifest, plan);
  const stored: StoredPlan = {
    ...plan,
    suggested: suggest,
    outfit_name: routed.outfitName,
    ref: routed.ref,
    figure: manifest.figureKeep,
  };
  ctx.meta["plan"] = stored;
  if (plan.safety === "block") throw new Stop(`plan blocked: ${plan.reason}`, false);
  const text = `${compose(plan, "hidden", routed, manifest.figureKeep)} ${STORY_FRAME}`;
  ctx.meta["prompt"] = text.slice(0, 2000);
  const ref = await ctx
    .timed("ref", () => downloadRef(ctx.fetch, ctx.env, routed.ref, ctx.within(8_000, 60_000)))
    .catch((error) => {
      throw new Stop(`ref: ${short(error)}`, true);
    });
  const drawn = await ctx.timed("image", () =>
    openaiImageEdit(
      ctx.fetch,
      ctx.openaiKey,
      {
        model: ctx.job.engine,
        refs: [ref],
        prompt: text,
        size: STORY_IMAGE_SIZE,
        quality: ctx.job.quality,
        complexity: ctx.env.snapshotComplexity,
        outputFormat: "webp",
        outputCompression: STORY_IMAGE_COMPRESSION,
      },
      ctx.within(70_000, 30_000),
    ),
  );
  const bytes = drawn.png;
  ctx.usage["image"] = drawn.usage;
  const checked = await ctx
    .timed("check", () =>
      claudeTool(
        ctx.fetch,
        ctx.anthropicKey,
        ctx.env.snapshotModel,
        {
          system: checkSystem("minor", manifest.figureKeep),
          tool: CHECK_TOOL,
          content: [
            imageBlock(ref),
            imageBlock({ bytes, mime: "image/webp" }),
            {
              type: "text" as const,
              text: "Image 1: face reference. Image 2: snapshot. Planned learner: none. Give the verdict.",
            },
          ],
          maxTokens: 600,
        },
        ctx.within(25_000, 8_000),
      ),
    )
    .catch((error) => {
      throw new Stop(`check: ${short(error)}`, true);
    });
  ctx.usage["check"] = checked.usage;
  const verdict = v2VerdictFrom(checked.input);
  if (verdict === null) throw new Stop("check: bad shape", true);
  ctx.meta["verdict"] = verdict;
  if (!verdict.safe || verdict.learner_face) throw new Stop("check: unsafe", !ctx.last);
  const warnings = [
    ...(verdict.identity < 3 ? ["identity"] : []),
    ...(verdict.garbled_text ? ["garbled_text"] : []),
    // 스토리에는 학습자가 없다 — 둘째 인물이 끼어들었으면 알린다.
    ...(verdict.learner_matches === false ? ["second_person"] : []),
  ];
  return { bytes, warnings };
}

/** 사물 · 풍경 컷: 그림 주문 그대로 조립 → 생성 → 검사. */
export async function drawScenery(ctx: DrawContext): Promise<Drawn> {
  // ---- 사물 · 풍경 컷: 그림 주문 그대로 조립 → 생성
  ctx.meta["pipeline"] = "story-scenery";
  const text = sceneryPrompt(ctx.job.scene, ctx.job.meaning);
  ctx.meta["prompt"] = text.slice(0, 2000);
  const drawn = await ctx.timed("image", () =>
    openaiImageGenerate(
      ctx.fetch,
      ctx.openaiKey,
      {
        model: ctx.job.engine,
        prompt: text,
        size: STORY_IMAGE_SIZE,
        quality: ctx.job.quality,
        outputFormat: "webp",
        outputCompression: STORY_IMAGE_COMPRESSION,
      },
      ctx.within(70_000, 30_000),
    ),
  );
  const bytes = drawn.png;
  ctx.usage["image"] = drawn.usage;
  const checked = await ctx
    .timed("check", () =>
      claudeTool(
        ctx.fetch,
        ctx.anthropicKey,
        ctx.env.snapshotModel,
        {
          system: SCENERY_CHECK_SYSTEM,
          tool: SCENERY_CHECK_TOOL,
          content: [
            imageBlock({ bytes, mime: "image/webp" }),
            {
              type: "text" as const,
              text: `Brief: ${ctx.job.scene || ctx.job.meaning}\nGive the verdict.`,
            },
          ],
          maxTokens: 600,
        },
        ctx.within(25_000, 8_000),
      ),
    )
    .catch((error) => {
      throw new Stop(`check: ${short(error)}`, true);
    });
  ctx.usage["check"] = checked.usage;
  const verdict = sceneryVerdictFrom(checked.input);
  if (verdict === null) throw new Stop("check: bad shape", true);
  ctx.meta["verdict"] = verdict;
  // 인물 없는 컷에 사람이 주인공으로 나온 것(얼굴이 안 보여도)은 기준 그림 없이 그린 「그 인물 아닌 사람」이다 — 올리지 않는다.
  if (!verdict.safe || verdict.face || verdict.person) throw new Stop("check: unsafe", !ctx.last);
  const warnings = [
    ...(verdict.text_or_logo ? ["text_or_logo"] : []),
    ...(verdict.matches ? [] : ["mismatch"]),
  ];
  return { bytes, warnings };
}
