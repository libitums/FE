// 스냅샷 v2m(ADR-0179) — 기준 그림 묶음(manifest) · 계획 모양 · 다양성 추천 · 라우팅(계획 → 미리 합친 기준 그림 한 장 + 고정 대상 그림).
// 묶음은 대시보드가 만든다(ops-dashboard `snapshot_bundle.py`). 모아 쓰는 곳은 `companion-snapshot-v2.ts`.

import type { Aspect } from "./companion-snapshot-prompts.ts";
import {
  type Angle,
  ANGLES,
  type Expression,
  type Learner,
  type OutfitChange,
  PIPELINE,
  SELFIE_SHOTS,
  type Shot,
  SHOTS,
  TOGETHER_SHOTS,
} from "./companion-snapshot-v2-prompts.ts";
import {
  type ManifestSubject,
  type PlanSubject,
  type RoutedSubject,
  subjectsFrom,
} from "./companion-snapshot-v2-subjects.ts";

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
  /** 고정 대상. 칸이 없는 옛 묶음이면 빈 목록. */
  readonly subjects: readonly ManifestSubject[];
};

/** 버킷의 묶음 경로 앞부분. slug는 시작 RPC가 고른 기준 그림 `<slug>-ref.png`에서. */
export const bundleDir = (slug: string) => `v2/${slug}`;
export const slugFromRefs = (refs: readonly string[]): string | null => {
  const sheet = refs.find((name) => name.endsWith("-ref.png"));
  return sheet ? sheet.slice(0, -"-ref.png".length) : null;
};

const FILE = /^[a-z_]+(--o\d+)?\.png$/;
const SIDE_ROLES = ["expression", "outfit"];

/** 파일 하나의 칸 검사 — 이름(경로로 새지 않게) · 역할(첫째는 인물 sheet · angles, 나머지는 표정 · 옷 한 번씩) · 합침 여부. */
function refFrom(input: unknown): ManifestRef | null {
  if (typeof input !== "object" || input === null) return null;
  const ref = input as Record<string, unknown>;
  const roles = ref["roles"];
  if (typeof ref["file"] !== "string" || !FILE.test(ref["file"]) || !Array.isArray(roles))
    return null;
  const [person, ...rest] = roles as unknown[];
  if (person !== "angles" && person !== "sheet") return null;
  if (rest.length > 2 || new Set(rest).size !== rest.length) return null;
  if (!rest.every((role) => typeof role === "string" && SIDE_ROLES.includes(role))) return null;
  return {
    file: ref["file"],
    roles: [person, ...(rest as string[])],
    merged: ref["merged"] === true,
  };
}

/** 표정 → 칸 → 파일. 틀린 칸은 버리고, 무표정 · 기본 옷 칸이 없으면 null. */
function refsFrom(input: unknown): Manifest["refs"] | null {
  if (typeof input !== "object" || input === null) return null;
  const out: Record<string, Record<string, ManifestRef>> = {};
  for (const [expression, cells] of Object.entries(input as Record<string, unknown>)) {
    if (typeof cells !== "object" || cells === null) continue;
    const kept: Record<string, ManifestRef> = {};
    for (const [key, raw] of Object.entries(cells as Record<string, unknown>)) {
      const ref = refFrom(raw);
      if (ref !== null && (key === "default" || /^o\d+$/.test(key))) kept[key] = ref;
    }
    if (Object.keys(kept).length) out[expression] = kept;
  }
  return out["neutral"]?.["default"] ? out : null;
}

/**
 * manifest.json → 모양 검사. 틀리면 null(그 인물은 v1으로 그린다). 칸 하나가 틀리면 그 칸만 버린다(라우팅이 기본 칸으로 간다).
 * 고정 대상(`subjects`)은 틀려도 null로 만들지 않는다 — 틀린 대상만 버린다.
 */
export function manifestFrom(input: unknown): Manifest | null {
  if (typeof input !== "object" || input === null) return null;
  const value = input as Record<string, unknown>;
  const slug = value["slug"];
  if (value["pipeline"] !== PIPELINE || typeof slug !== "string" || !/^[a-z0-9-]+$/.test(slug))
    return null;
  const outfits = Array.isArray(value["outfits"]) ? value["outfits"] : null;
  const refs = refsFrom(value["refs"]);
  if (outfits === null || refs === null) return null;
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
    slug,
    figureKeep: value["figureKeep"] === true,
    outfits: clean,
    refs,
    subjects: subjectsFrom(value["subjects"]),
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
  /** 이 순간 그림에 실제로 보이는 고정 대상(장소 하나 · 동물이나 물건 하나까지, 장소 먼저). file은 묶음 폴더 안의 이름. */
  readonly subjects: readonly PlanSubject[];
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

/**
 * 최근 계획들(새것부터)을 보고 권할 구도 · 각도(lab `suggestion`). 바로 앞 둘에 쓴 구도 · 각도는 피하고, 덜 쓴 것에 무게를 둔다.
 * 어깨 너머는 학습자가 그 자리에 있어야 하는 구도라 권하지 않는다.
 */
export function suggestion(
  recent: readonly RecentPlan[],
  random: () => number = Math.random,
): { shot: Shot; angle: Angle } {
  const shotsUsed = recent.map((p) => p.shot);
  const anglesUsed = recent.map((p) => p.angle);
  const solo = SHOTS.filter((s) => !TOGETHER_SHOTS.includes(s));
  const shotPool = solo.filter((s) => !shotsUsed.slice(0, 2).includes(s));
  const anglePool = ANGLES.filter((a) => !anglesUsed.slice(0, 2).includes(a));
  const pick = <T extends string>(pool: readonly T[], used: readonly (string | undefined)[]): T => {
    const weights = pool.map((x) => 1 / (1 + used.filter((u) => u === x).length));
    let roll = random() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < pool.length; i += 1) {
      roll -= weights[i]!;
      if (roll <= 0) return pool[i]!;
    }
    return pool[pool.length - 1]!;
  };
  let shot = pick(shotPool.length ? shotPool : solo, shotsUsed);
  const angle = pick(anglePool.length ? anglePool : ANGLES, anglesUsed);
  if (angle === "selfie" && !SELFIE_SHOTS.includes(shot)) {
    shot = SELFIE_SHOTS[Math.floor(random() * SELFIE_SHOTS.length)] ?? "medium";
  }
  return { shot, angle };
}

/** lab `recent_line`. */
export function recentLine(plan: RecentPlan): string {
  const outfit = plan.outfit_name || plan.new_outfit_name || "-";
  return `- ${plan.shot ?? "-"}, ${plan.angle ?? "-"}, ${plan.expression ?? "-"}, outfit: ${outfit}, place: ${(plan.setting || "-").slice(0, 60)}`;
}

// ------------------------------------------------------------------ 라우팅

export type Route = {
  /** 버킷의 기준 그림 경로(`v2/<slug>/<file>`). */
  readonly ref: string;
  readonly roles: readonly string[];
  readonly merged: boolean;
  readonly outfitText: string | null;
  readonly defaultOutfit: boolean;
  readonly outfitName: string | null;
  /** 붙일 대상 그림 — 인물 그림 다음에 이 순서로(장소 → 동물 · 물건). 받지 못한 것은 부르는 쪽이 빼고 조립한다. */
  readonly subjects: readonly RoutedSubject[];
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
    subjects: plan.subjects.flatMap((chosen): RoutedSubject[] => {
      const subject = manifest.subjects.find((s) => s.id === chosen.id);
      const file = subject?.files.find((f) => f.file === chosen.file);
      if (subject === undefined || file === undefined) return [];
      return [
        {
          id: subject.id,
          kind: subject.kind,
          ref: `${bundleDir(manifest.slug)}/${file.file}`,
          caption: file.caption,
          description: subject.description,
        },
      ];
    }),
  };
}
