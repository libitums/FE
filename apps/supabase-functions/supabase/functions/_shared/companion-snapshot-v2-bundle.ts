// 스냅샷 v2m(ADR-0179) — 기준 그림 묶음(manifest) · 계획 모양 · 라우팅(계획 → 미리 합친 기준 그림 한 장).
// 묶음은 대시보드가 만든다(ops-dashboard `snapshot_bundle.py`). 모아 쓰는 곳은 `companion-snapshot-v2.ts`.

import type { Aspect } from "./companion-snapshot-prompts.ts";
import {
  type Angle,
  type Expression,
  type Learner,
  type OutfitChange,
  PIPELINE,
  type Shot,
} from "./companion-snapshot-v2-prompts.ts";

// ------------------------------------------------------------------ 묶음(manifest)

export type ManifestOutfit = {
  readonly id: number;
  readonly name: string;
  readonly description: string;
  readonly default: boolean;
  readonly image: boolean;
};
export type ManifestRef = {
  readonly file: string;
  readonly roles: readonly string[];
  readonly merged: boolean;
};
export type Manifest = {
  readonly version: number;
  readonly pipeline: string;
  readonly slug: string;
  readonly figureKeep: boolean;
  readonly outfits: readonly ManifestOutfit[];
  readonly refs: Readonly<Record<string, Readonly<Record<string, ManifestRef>>>>;
};

/** 버킷의 묶음 경로 앞부분. slug는 시작 RPC가 고른 기준 그림 `<slug>-ref.png`에서. */
export const bundleDir = (slug: string) => `v2/${slug}`;
export const slugFromRefs = (refs: readonly string[]): string | null => {
  const sheet = refs.find((name) => name.endsWith("-ref.png"));
  return sheet ? sheet.slice(0, -"-ref.png".length) : null;
};

/** manifest.json → 모양 검사. 틀리면 null(그 인물은 v1으로 그린다). */
export function manifestFrom(input: unknown): Manifest | null {
  if (typeof input !== "object" || input === null) return null;
  const value = input as Record<string, unknown>;
  if (value["pipeline"] !== PIPELINE || typeof value["slug"] !== "string") return null;
  const outfits = Array.isArray(value["outfits"]) ? value["outfits"] : null;
  const refs = value["refs"];
  if (outfits === null || typeof refs !== "object" || refs === null) return null;
  const neutral = (refs as Record<string, unknown>)["neutral"] as
    | Record<string, unknown>
    | undefined;
  if (!neutral || typeof neutral["default"] !== "object") return null;
  const clean = outfits
    .filter(
      (o): o is Record<string, unknown> =>
        typeof o === "object" &&
        o !== null &&
        typeof (o as Record<string, unknown>)["id"] === "number",
    )
    .map((o) => ({
      id: o["id"] as number,
      name: typeof o["name"] === "string" ? o["name"] : "",
      description: typeof o["description"] === "string" ? o["description"] : "",
      default: o["default"] === true,
      image: o["image"] === true,
    }));
  if (!clean.some((o) => o.default)) return null;
  return {
    version: typeof value["version"] === "number" ? value["version"] : 0,
    pipeline: PIPELINE,
    slug: value["slug"],
    figureKeep: value["figureKeep"] === true,
    outfits: clean,
    refs: refs as Manifest["refs"],
  };
}

// ------------------------------------------------------------------ 다양성 · 장면 설계 입력

export type Plan = {
  readonly pipeline: string;
  readonly action: string;
  readonly setting: string;
  readonly lighting: string;
  readonly shot: Shot;
  readonly angle: Angle;
  readonly expression: Expression;
  readonly outfit_change: OutfitChange;
  readonly outfit_id: number | null;
  readonly new_outfit: string | null;
  readonly new_outfit_name: string | null;
  readonly learner: Learner;
  readonly aspect: Aspect;
  readonly background_text: string | null;
  readonly safety: "allow" | "block";
  readonly reason: string;
};

/** 결과 행(`companion.media.prompt`)에 남기는 계획 — 다음 스냅샷의 다양성 입력이 되고, 운영 진단에 쓴다. */
export type StoredPlan = Plan & {
  readonly suggested: { readonly shot: Shot; readonly angle: Angle };
  readonly outfit_name: string | null;
  /** 엔진에 넣은 기준 그림(`v2/<slug>/<file>`). */
  readonly ref: string;
  readonly figure: boolean;
};

/** 다양성에 쓰는 최근 계획 한 줄(운영 DB `companion.media.prompt`에서 — 모양이 달라도 있는 칸만). */
export type RecentPlan = {
  readonly shot?: string;
  readonly angle?: string;
  readonly expression?: string;
  readonly outfit_name?: string | null;
  readonly new_outfit_name?: string | null;
  readonly setting?: string;
};

// ------------------------------------------------------------------ 라우팅

export type Route = {
  /** 버킷의 기준 그림 경로(`v2/<slug>/<file>`). */
  readonly ref: string;
  readonly roles: readonly string[];
  readonly merged: boolean;
  readonly outfitText: string | null;
  readonly defaultOutfit: boolean;
  readonly outfitName: string | null;
};

/** 계획 → 미리 합친 기준 그림 하나와 옷 문장(lab `route`의 v2m 갈래). 그 표정 · 옷 칸이 없으면 기본 옷 칸, 그것도 없으면 무표정. */
export function route(manifest: Manifest, plan: Plan): Route {
  const row =
    plan.outfit_id === null
      ? null
      : (manifest.outfits.find((o) => o.id === plan.outfit_id) ?? null);
  const defaultOutfit = row !== null && row.default;
  const key = row !== null && !row.default && row.image ? `o${row.id}` : "default";
  const byExpression = manifest.refs[plan.expression] ?? manifest.refs["neutral"]!;
  const ref = byExpression[key] ?? byExpression["default"] ?? manifest.refs["neutral"]!["default"]!;
  const angles = ref.roles[0] === "angles";
  const outfitText = defaultOutfit
    ? `the character's default outfit, exactly as in ${angles ? "the reference" : "image 1"}`
    : (plan.new_outfit ?? row?.description ?? null);
  return {
    ref: `${bundleDir(manifest.slug)}/${ref.file}`,
    roles: ref.roles,
    merged: ref.merged,
    outfitText,
    defaultOutfit,
    outfitName: row?.name ?? plan.new_outfit_name,
  };
}
