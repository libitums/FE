// 스냅샷 v2m(ADR-0179): 장면 설계(플랜) → 코드가 이미지 프롬프트 조립 → 미리 합친 기준 그림 한 장.
// 운영 대시보드 스냅샷 실험실(ops-dashboard `snapshot_v2.py`)의 PLAN_SYSTEM · PLAN_TOOL · normalize_plan · suggestion · plan_content ·
// reference_text · compose · CHECK_SYSTEM · CHECK_TOOL · with_pass · 체형 유지 문장을 글자 그대로 옮겼다(2026-11-23, ops-dashboard 95139d8).
// 고칠 때는 lab과 같이 고친다(실험실에서 잰 결과가 앱과 같은 글이어야 한다).
//
// 앱 기능에서 더한 것(v1 `companion-snapshot-prompts.ts`와 같은 규칙):
// - 미성년자 · 나이 모름: 「손잡기 · 포옹까지」 줄을 「로맨스 없음」 줄로 바꾸고 더 엄격한 규칙(`PROMPT_MINOR_RULES` · `CHECK_MINOR_RULES`)을 더한다.
// - 대화 글을 신뢰하지 않는 데이터로 감싸는 규칙(`PROMPT_DATA_RULES`).
// - 고정 대상 기준 그림(ADR-0179 D8, 2026-11-28): PLAN_SYSTEM의 대상 규칙 줄 셋 · PLAN_TOOL `subjects` · 입력의 대상 목록 · 대상 문장
//   (`companion-snapshot-v2-subjects.ts`) · 검사 글 `SUBJECT_CHECK`. 아직 lab에 없다 — lab에도 같은 글을 넣는다.
// - 학습자는 기본으로 없다(ADR-0179 D9, 2026-11-28): PLAN_SYSTEM의 학습자 두 줄 · PLAN_TOOL `learner` 설명 · `learnerClause` ·
//   CHECK_SYSTEM의 learner matches 정의를 고쳤다. 아직 lab에 없다 — lab에도 같은 글을 넣는다.
//
// 기준 그림은 대시보드가 미리 합쳐 `companion-refs/v2/<slug>/`에 올린다(ops-dashboard `snapshot_bundle.py`): `manifest.json`(옷장 ·
// 체형 유지 · 파일과 역할) + 표정 8 × 그림 있는 옷마다 한 장. 묶음이 없는 인물은 v1으로 그린다.

import type { Segment } from "./chat-send.contract.ts";
import type { SnapshotSelf } from "./companion-contract/index.ts";
import { type ContextLine, messageLine, SELF_LOOK } from "./companion-snapshot-prompts.ts";
import {
  type Angle,
  ANGLES,
  EXPRESSIONS,
  FIGURE_PLAN,
  LEARNER,
  OUTFIT_CHANGES,
  PIPELINE,
  SELFIE_SHOTS,
  type Shot,
  SHOTS,
} from "./companion-snapshot-v2-prompts.ts";
import {
  type Manifest,
  type Plan,
  type RecentPlan,
  recentLine,
} from "./companion-snapshot-v2-bundle.ts";
import { planSubjects, subjectLine } from "./companion-snapshot-v2-subjects.ts";

export * from "./companion-snapshot-v2-prompts.ts";
export * from "./companion-snapshot-v2-bundle.ts";
export * from "./companion-snapshot-v2-subjects.ts";
export * from "./companion-snapshot-v2-compose.ts";

// ------------------------------------------------------------------ 장면 설계 입력 · 계획 정리
// 다양성 추천(`suggestion` · `recentLine`)은 `companion-snapshot-v2-bundle.ts`, 고정 대상은 `companion-snapshot-v2-subjects.ts`,
// 학습자 · 기준 그림 문장과 이미지 프롬프트 조립(`compose`)은 `companion-snapshot-v2-compose.ts`.

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
  // 고정 대상(ADR-0179 D8)이 있는 인물만 — 없으면 이 칸 자체를 쓰지 않는다(옛 묶음 · 대상 없는 인물은 글이 그대로다).
  const subjects = input.manifest.subjects.length
    ? `Fixed subjects of ${input.characterName} (things that must look the same in every picture):\n` +
      input.manifest.subjects.map(subjectLine).join("\n") +
      "\n\n"
    : "";
  return (
    `Character: ${input.characterName}\n` +
    `Look (face and hair are fixed; the clothes in this note are only the default outfit): ${input.look}\n` +
    (input.manifest.figureKeep ? `${FIGURE_PLAN}\n` : "") +
    `Learner look: ${SELF_LOOK[input.snapshotSelf] ?? SELF_LOOK.female}\n\n` +
    `Wardrobe of ${input.characterName}:\n${wardrobe}\n\n` +
    subjects +
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
    subjects: planSubjects(value["subjects"], manifest),
    aspect: value["aspect"] === "1:1" ? "1:1" : "3:2",
    background_text: text(value["background_text"], 60) || null,
    safety: value["safety"],
    reason: text(value["reason"], 300),
  };
}
