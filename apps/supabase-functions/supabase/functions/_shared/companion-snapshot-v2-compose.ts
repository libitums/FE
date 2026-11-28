// 스냅샷 v2m(ADR-0179) — 계획 → 이미지 프롬프트 조립(lab `learner_line` · `reference_text` · `compose`). 규칙 문장은 고정이다(모델이
// 바꾸지 못한다). 글은 실험실(ops-dashboard `snapshot_v2.py`)과 같이 고친다. 모아 쓰는 곳은 `companion-snapshot-v2.ts`.

import type { SnapshotSelf } from "./companion-contract/index.ts";
import {
  ANGLE_TEXT,
  EXPRESSION_TEXT,
  FIGURE_TEXT,
  type Learner,
  MODEST_TEXT,
  SHOT_TEXT,
} from "./companion-snapshot-v2-prompts.ts";
import type { Plan, Route } from "./companion-snapshot-v2-bundle.ts";
import { type RoutedSubject, subjectText } from "./companion-snapshot-v2-subjects.ts";

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

/**
 * 기준 그림의 역할 문장(lab `reference_text`) → [글, 의상 그림을 가리키는 말 또는 null]. roles 첫째는 인물(sheet · angles).
 * `more`는 인물 그림 뒤에 붙는 그림(고정 대상) 수 — 합친 한 장이어도 그림이 여럿이면 「Image 1 is one sheet」로 가리킨다.
 */
export function referenceText(
  roles: readonly string[],
  merged: boolean,
  defaultOutfit: boolean,
  more = 0,
): [string, string | null] {
  const angles = roles[0] === "angles";
  const keep = defaultOutfit
    ? "keep the same face, hairstyle, hair colour and outfit"
    : "keep the same face, hairstyle and hair colour";
  if (merged) {
    const rest = roles.slice(1);
    // 역할은 묶음 검사(`manifestFrom`)가 표정 · 옷으로만 남긴다 — 그래도 모르는 이름이면 그 이름 그대로.
    const names: Record<string, string> = {
      expression: "the facial expression to use",
      outfit: "the outfit to wear",
    };
    const name = (role: string) => names[role] ?? role;
    const right =
      rest.length > 1
        ? `; on the right, top: ${name(rest[0]!)}; bottom: ${name(rest[1]!)}`
        : rest.length
          ? `; on the right: ${name(rest[0]!)}`
          : "";
    const body =
      `${more > 0 ? "Image 1 is" : "The reference image is"} one sheet: on the left the character` +
      `${angles ? " from four angles (front, three-quarter, side, back)" : ""}${right}. Use each part only for ` +
      `that: ${keep}${angles ? ", matching the view this shot needs" : ""}` +
      `${defaultOutfit || rest.includes("outfit") ? "" : ", but not its clothes"}; do not copy the sheet's layout, ` +
      "poses, framing or background, and draw one single scene, not panels." +
      `${rest.includes("expression") ? PROPORTION_MERGED : ""}`;
    const sheet = more > 0 ? "image 1" : "the reference sheet";
    return [body, rest.includes("outfit") ? `as shown on the right of ${sheet}` : null];
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

/**
 * 계획 → 이미지 프롬프트(lab `compose`). 규칙 문장은 고정이다(모델이 바꾸지 못한다).
 * `subjects`는 실제로 붙인 대상 그림(인물 그림 다음 순서) — 받지 못한 대상은 부르는 쪽이 빼고 넘긴다. 없으면 대상 문장도 없다.
 */
export function compose(
  plan: Plan,
  self: SnapshotSelf,
  routed: Route,
  figure: boolean,
  subjects: readonly RoutedSubject[] = [],
): string {
  const [refsText, outfitAt] = referenceText(
    routed.roles,
    routed.merged,
    routed.defaultOutfit,
    subjects.length,
  );
  const first = routed.merged ? 2 : routed.roles.length + 1;
  const subjectsText = subjects.map((s, i) => subjectText(s, first + i)).join(" ");
  // 그림이 여럿이면 「the reference」가 어느 그림인지 흐려진다 — 기본 옷은 1번 그림을 가리킨다.
  const outfitText =
    subjects.length && routed.defaultOutfit
      ? "the character's default outfit, exactly as in image 1"
      : routed.outfitText;
  const parts = [
    `${SHOT_TEXT[plan.shot]}, ${ANGLE_TEXT[plan.angle]}.`,
    plan.action ? `Action: ${plan.action}.` : "",
    plan.setting ? `Setting: ${plan.setting}.` : "",
    plan.lighting ? `Lighting: ${plan.lighting}.` : "",
    `Expression: ${EXPRESSION_TEXT[plan.expression]}.`,
    outfitText ? `Outfit: ${outfitText}${outfitAt ? ` — ${outfitAt}.` : "."}` : "",
    learnerClause(plan.learner, self),
    plan.background_text
      ? `Background text allowed only: "${plan.background_text}", short and natural.`
      : "No text anywhere in the image.",
    "Korean webtoon / manhwa illustration, clean line art, soft cel shading. " + refsText,
    subjectsText,
    "No speech bubbles, captions or dialogue. " + (figure ? FIGURE_TEXT : MODEST_TEXT),
  ];
  return parts
    .filter((p) => p)
    .join(" ")
    .replaceAll("..", ".");
}
