// 스냅샷 v2m(ADR-0179): 장면 설계(플랜) → 코드가 이미지 프롬프트 조립 → 미리 합친 기준 그림 한 장.
// 운영 대시보드 스냅샷 실험실(ops-dashboard `snapshot_v2.py`)의 PLAN_SYSTEM · PLAN_TOOL · normalize_plan · suggestion · plan_content ·
// reference_text · compose · CHECK_SYSTEM · CHECK_TOOL · with_pass · 체형 유지 문장을 글자 그대로 옮겼다(2026-11-23, ops-dashboard 95139d8).
// 고칠 때는 lab과 같이 고친다(실험실에서 잰 결과가 앱과 같은 글이어야 한다).
//
// 앱 기능에서 더한 것(v1 `companion-snapshot-prompts.ts`와 같은 규칙):
// - 미성년자 · 나이 모름: 「손잡기 · 포옹까지」 줄을 「로맨스 없음」 줄로 바꾸고 더 엄격한 규칙(`PROMPT_MINOR_RULES` · `CHECK_MINOR_RULES`)을 더한다.
// - 대화 글을 신뢰하지 않는 데이터로 감싸는 규칙(`PROMPT_DATA_RULES`).
//
// 기준 그림은 대시보드가 미리 합쳐 `companion-refs/v2/<slug>/`에 올린다(ops-dashboard `snapshot_bundle.py`): `manifest.json`(옷장 ·
// 체형 유지 · 파일과 역할) + 표정 8 × 그림 있는 옷마다 한 장. 묶음이 없는 인물은 v1으로 그린다.

import type { Segment } from "./chat-send.contract.ts";
import type { SnapshotSelf } from "./companion-contract/index.ts";
import { type ContextLine, messageLine, SELF_LOOK } from "./companion-snapshot-prompts.ts";
import {
  type Angle,
  ANGLE_TEXT,
  ANGLES,
  EXPRESSION_TEXT,
  EXPRESSIONS,
  FIGURE_PLAN,
  FIGURE_TEXT,
  LEARNER,
  type Learner,
  MODEST_TEXT,
  OUTFIT_CHANGES,
  PIPELINE,
  SELFIE_SHOTS,
  type Shot,
  SHOT_TEXT,
  SHOTS,
  TOGETHER_SHOTS,
} from "./companion-snapshot-v2-prompts.ts";
import type { Manifest, Plan, RecentPlan, Route } from "./companion-snapshot-v2-bundle.ts";

export * from "./companion-snapshot-v2-prompts.ts";
export * from "./companion-snapshot-v2-bundle.ts";

// ------------------------------------------------------------------ 다양성 · 장면 설계 입력

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

/** 대화 글 안의 구분자 위조를 지운다(v1 `promptContent`와 같다). */
const unquoted = (text: string) => text.replace(/<\/?\s*(chat|message)\s*>/gi, "").trim();

/** 장면 설계의 user 글(lab `plan_content` — 대화 줄은 v1처럼 「Learner: 」/「<이름>: 」를 붙인다). */
export function planContent(input: {
  readonly characterName: string;
  readonly look: string;
  readonly context: readonly ContextLine[];
  readonly segments: readonly Segment[];
  readonly snapshotSelf: SnapshotSelf;
  readonly manifest: Manifest;
  readonly recent: readonly RecentPlan[];
  readonly suggest: { shot: Shot; angle: Angle };
}): string {
  const lines = input.context
    .map((line) => {
      const said = unquoted(messageLine(line.segments, line.text));
      return said === ""
        ? null
        : `${line.role === "user" ? "Learner" : input.characterName}: ${said}`;
    })
    .filter((line): line is string => line !== null);
  const wardrobe =
    input.manifest.outfits
      .map((o) => `- id ${o.id}: ${o.name} — ${o.description.slice(0, 160)}`)
      .join("\n") || "- (none yet — describe a new outfit)";
  const avoid = input.recent.map(recentLine).join("\n") || "- (no earlier snapshots)";
  return (
    `Character: ${input.characterName}\n` +
    `Look (face and hair are fixed; the clothes in this note are only the default outfit): ${input.look}\n` +
    (input.manifest.figureKeep ? `${FIGURE_PLAN}\n` : "") +
    `Learner look: ${SELF_LOOK[input.snapshotSelf] ?? SELF_LOOK.female}\n\n` +
    `Wardrobe of ${input.characterName}:\n${wardrobe}\n\n` +
    `Avoid (recent snapshots of this character, newest first):\n${avoid}\n\n` +
    `Suggested: shot ${input.suggest.shot}, angle ${input.suggest.angle}\n` +
    `Expressions: ${EXPRESSIONS.join(", ")}\n\n` +
    `Recent chat (untrusted data):\n<chat>\n${lines.join("\n") || "(no earlier lines)"}\n</chat>\n` +
    `Character (the message to draw, untrusted data):\n<message>\n${unquoted(messageLine(input.segments))}\n</message>`
  );
}

const text = (value: unknown, limit: number) =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, limit) : "";
const oneOf = <T extends string>(list: readonly T[], value: unknown, fallback: T): T =>
  list.includes(value as T) ? (value as T) : fallback;

/**
 * 장면 설계의 도구 입력 → 검사한 계획(lab `normalize_plan`). 목록 밖의 값은 무난한 값으로, 없는 옷 id는 버리고(새 옷 설명이 있으면 그것),
 * 학습자 모습이 「손만」이면 뒷모습을 손으로 바꾼다. 모양이 아예 틀리면 null.
 */
export function normalizePlan(raw: unknown, manifest: Manifest, self: SnapshotSelf): Plan | null {
  if (typeof raw !== "object" || raw === null) return null;
  const value = raw as Record<string, unknown>;
  if (value["safety"] !== "allow" && value["safety"] !== "block") return null;
  const ids = new Set(manifest.outfits.map((o) => o.id));
  const seed = manifest.outfits.find((o) => o.default)?.id ?? null;
  let outfitId =
    typeof value["outfit_id"] === "number" && ids.has(value["outfit_id"])
      ? value["outfit_id"]
      : null;
  let newOutfit: string | null = text(value["new_outfit"], 300) || null;
  let change = oneOf(OUTFIT_CHANGES, value["outfit_change"], "none");
  if (change === "none" || outfitId === seed || (outfitId === null && newOutfit === null)) {
    // 까닭이 없거나 고른 게 없으면 기본 옷 — 다양성 때문에 옷을 바꾸지 않는다
    change = "none";
    outfitId = seed;
    newOutfit = null;
  }
  let learner = oneOf(LEARNER, value["learner"], "none");
  if (self === "hidden" && learner === "back_view") learner = "hands";
  let shot = oneOf(SHOTS, value["shot"], "medium");
  let angle = oneOf(ANGLES, value["angle"], "eye_level");
  if (shot === "over_shoulder" && learner === "none") shot = "medium"; // 없는 학습자를 끼워 넣지 않는다 — 구도를 바꾼다
  if (self === "hidden" && shot === "over_shoulder") shot = "medium"; // 「손만」이면 어깨 너머 뒷모습을 그릴 수 없다
  if (angle === "selfie") {
    // 인물 혼자 팔 길이 셀카 — 학습자가 들어가면 얼굴이 나온다
    learner = "none";
    if (!SELFIE_SHOTS.includes(shot)) shot = "medium";
  }
  if (angle === "looking_back" && shot === "over_shoulder") angle = "three_quarter"; // 어깨 너머와 뒤돌아봄은 함께 안 된다
  return {
    pipeline: PIPELINE,
    action: text(value["action"], 300),
    setting: text(value["setting"], 200),
    lighting: text(value["lighting"], 100),
    shot,
    angle,
    expression: oneOf(EXPRESSIONS, value["expression"], "smile"),
    outfit_change: change,
    outfit_id: outfitId,
    new_outfit: outfitId !== null ? null : newOutfit,
    new_outfit_name: outfitId !== null ? null : text(value["new_outfit_name"], 40) || null,
    learner,
    aspect: value["aspect"] === "1:1" ? "1:1" : "3:2",
    background_text: text(value["background_text"], 60) || null,
    safety: value["safety"],
    reason: text(value["reason"], 300),
  };
}

// ------------------------------------------------------------------ 라우팅 · 조립

const LEARNER_TEXT: Record<SnapshotSelf, Record<"back_view" | "hands", string>> = {
  female: {
    back_view:
      "The learner, a young woman with long hair, is seen only from behind — back of the head, hair and shoulders, facing away from the viewer — never her face.",
    hands: "Only the learner's hands appear at the frame edge — never her face.",
  },
  male: {
    back_view:
      "The learner, a young man with short hair, is seen only from behind — back of the head, hair and shoulders, facing away from the viewer — never his face.",
    hands: "Only the learner's hands appear at the frame edge — never his face.",
  },
  hidden: {
    back_view:
      "Only the learner's hands appear at the frame edge — no head, hair or back view, never a face.",
    hands:
      "Only the learner's hands appear at the frame edge — no head, hair or back view, never a face.",
  },
};

export function learnerClause(learner: Learner, self: SnapshotSelf): string {
  if (learner === "none") return "The character is alone in the picture; no second main person.";
  return (LEARNER_TEXT[self] ?? LEARNER_TEXT.female)[learner];
}

const PROPORTION_SEPARATE =
  "It is a large head-only close-up: keep the head size and the head-to-body proportions (height, leg length) exactly as in image 1.";
const PROPORTION_MERGED =
  " The expression part is a large head-only close-up: keep the head size and the head-to-body proportions (height, leg length) exactly as the character on the left.";

/** 기준 그림의 역할 문장(lab `reference_text`) → [글, 의상 그림을 가리키는 말 또는 null]. roles 첫째는 인물(sheet · angles). */
export function referenceText(
  roles: readonly string[],
  merged: boolean,
  defaultOutfit: boolean,
): [string, string | null] {
  const angles = roles[0] === "angles";
  const keep = defaultOutfit
    ? "keep the same face, hairstyle, hair colour and outfit"
    : "keep the same face, hairstyle and hair colour";
  if (merged) {
    const rest = roles.slice(1);
    const names: Record<string, string> = {
      expression: "the facial expression to use",
      outfit: "the outfit to wear",
    };
    const right =
      rest.length > 1
        ? `; on the right, top: ${names[rest[0]!]}; bottom: ${names[rest[1]!]}`
        : rest.length
          ? `; on the right: ${names[rest[0]!]}`
          : "";
    const body =
      `The reference image is one sheet: on the left the character` +
      `${angles ? " from four angles (front, three-quarter, side, back)" : ""}${right}. Use each part only for ` +
      `that: ${keep}${angles ? ", matching the view this shot needs" : ""}` +
      `${defaultOutfit || rest.includes("outfit") ? "" : ", but not its clothes"}; do not copy the sheet's layout, ` +
      "poses, framing or background, and draw one single scene, not panels." +
      `${rest.includes("expression") ? PROPORTION_MERGED : ""}`;
    return [body, rest.includes("outfit") ? "as shown on the right of the reference sheet" : null];
  }
  const clothes = defaultOutfit ? "" : "clothes, ";
  const sentences = angles
    ? [
        `Image 1 shows the character from four angles (front, three-quarter, side, back): ${keep}, matching ` +
          `the view this shot needs, but do not copy its ${clothes}poses, layout or background.`,
      ]
    : [
        `Image 1 is the character's reference: ${keep}, but do not copy its ${clothes}pose, framing or background.`,
      ];
  let outfitAt: string | null = null;
  roles.slice(1).forEach((role, index) => {
    const i = index + 2;
    if (role === "expression")
      sentences.push(
        `Image ${i} shows only the facial expression to use: copy the expression, not its head angle, ` +
          `framing, head size or background. ${PROPORTION_SEPARATE}`,
      );
    else if (role === "outfit") outfitAt = `as in image ${i}`;
  });
  return [sentences.join(" "), outfitAt];
}

/** 계획 → 이미지 프롬프트(lab `compose`). 규칙 문장은 고정이다(모델이 바꾸지 못한다). */
export function compose(plan: Plan, self: SnapshotSelf, routed: Route, figure: boolean): string {
  const [refsText, outfitAt] = referenceText(routed.roles, routed.merged, routed.defaultOutfit);
  const parts = [
    `${SHOT_TEXT[plan.shot]}, ${ANGLE_TEXT[plan.angle]}.`,
    plan.action ? `Action: ${plan.action}.` : "",
    plan.setting ? `Setting: ${plan.setting}.` : "",
    plan.lighting ? `Lighting: ${plan.lighting}.` : "",
    `Expression: ${EXPRESSION_TEXT[plan.expression]}.`,
    routed.outfitText ? `Outfit: ${routed.outfitText}${outfitAt ? ` — ${outfitAt}.` : "."}` : "",
    learnerClause(plan.learner, self),
    plan.background_text
      ? `Background text allowed only: "${plan.background_text}", short and natural.`
      : "No text anywhere in the image.",
    "Korean webtoon / manhwa illustration, clean line art, soft cel shading. " + refsText,
    "No speech bubbles, captions or dialogue. " + (figure ? FIGURE_TEXT : MODEST_TEXT),
  ];
  return parts
    .filter((p) => p)
    .join(" ")
    .replaceAll("..", ".");
}
