// 스냅샷의 프롬프트 노드 · 검사 노드 글과 이미지 프롬프트. 운영 대시보드 스냅샷 실험실(ops-dashboard `companion_lab.py`)의
// PROMPT_SYSTEM · PROMPT_TOOL · CHECK_SYSTEM · CHECK_TOOL · SELF_LOOK · prompt_content · learner_line · image_prompt · with_pass를
// 글자 그대로 옮겼다(2026-11-13, origin/main 6f082ff — 학습자 모습 설정 `self` 포함).
// 앱 기능에서 더한 것은 하나다 — 미성년자 · 나이 모름에 더 엄격한 규칙 줄(`PROMPT_MINOR_RULES`).
// 고칠 때는 lab과 같이 고친다(실험실에서 잰 결과가 앱과 같은 글이어야 한다).

import type { Segment } from "./chat-send.contract.ts";
import type { SnapshotSelf } from "./companion-contract/index.ts";

/** 비율 → OpenAI 이미지 크기(lab SIZES). */
export const SIZES = { "3:2": "1536x1024", "1:1": "1024x1024" } as const;
export type Aspect = keyof typeof SIZES;

export const PROMPT_SYSTEM = `You write the image prompt for a "snapshot": a single illustration of the moment in a Korean-learning chat app where a story character just sent the message given. The image model receives the character's reference image(s) separately, so describe the scene, pose, expression, setting, lighting and camera — not the face details.
Rules:
- Style: Korean webtoon / manhwa visual-novel illustration, clean line art, soft cel shading, consistent with the reference.
- The character from the reference is the main subject, keeping the same face, hair and outfit.
- The learner (the app user) is described in \`Learner look\`. Draw the learner only as that line says, keeping that gender; do not pick another. If the look says hands and a shoulder only, no head, hair or back view. Never draw the learner's face.
- No speech bubbles, captions, subtitles or dialogue text. Short natural background text (a shop sign, a menu) is allowed only if the scene needs it; give it in \`background_text\`, otherwise null.
- No romance or flirting, no kissing, no suggestive pose, no body emphasis, nothing unsafe for a teenager.
- Actions in *asterisks* in the message are the character's stage directions: use them.
- aspect: "3:2" for scenes with a setting or two people, "1:1" for a close single-person moment.
- safety: "block" if the moment cannot be drawn within these rules (say why), else "allow".`;

/** 미성년자 · 나이 모름에 더하는 규칙(앱 기능에서 더함). 나이 모름은 미성년자 기본값으로 다룬다(PRD §3.12). */
export const PROMPT_MINOR_RULES = `
Extra rules — the learner is a minor or their age is unknown, so be stricter:
- Keep the scene everyday and wholesome (a lesson, a shop, a street, food, a hobby). Nothing a parent would find inappropriate.
- No alcohol, smoking, gambling, nightlife, bedrooms, bathing, swimwear, injuries or scary scenes.
- No physical contact between the character and the learner beyond handing over an object.
- If the moment cannot be drawn under these rules, set safety to "block".`;

export const PROMPT_TOOL = {
  name: "snapshot_prompt",
  description: "The image prompt and the safety verdict for one snapshot.",
  input_schema: {
    type: "object" as const,
    properties: {
      scene: { type: "string", description: "English image prompt, 60-140 words" },
      aspect: { type: "string", enum: ["3:2", "1:1"] },
      background_text: { type: ["string", "null"] },
      safety: { type: "string", enum: ["allow", "block"] },
      reason: { type: "string" },
    },
    required: ["scene", "aspect", "background_text", "safety", "reason"],
  },
};

export const CHECK_SYSTEM = `You check a generated "snapshot" illustration for a Korean-learning chat app. Image 1 is the character reference, image 2 the generated snapshot.
Judge: safety (no sexual content, suggestive pose, body emphasis, romance, violence; safe for a teenager), identity (does the main character match the reference face, hair, outfit: 1 = different person, 5 = same), garbled text (broken letters, fake glyphs, speech bubbles or dialogue text), learner face (a second person whose eyes, nose or mouth are visible — the back of a head, hair, a shoulder, hands, or tiny faceless background passers-by do NOT count; a mirror reflection of the main character does not count). Write the reasons first, then the fields.`;

export const CHECK_TOOL = {
  name: "snapshot_check",
  description: "The verdict on one generated snapshot.",
  input_schema: {
    type: "object" as const,
    properties: {
      reasons: { type: "string" },
      safe: { type: "boolean" },
      identity: { type: "integer", minimum: 1, maximum: 5 },
      garbled_text: { type: "boolean" },
      learner_face: { type: "boolean" },
    },
    required: ["reasons", "safe", "identity", "garbled_text", "learner_face"],
  },
};

export type SnapshotPrompt = {
  readonly scene: string;
  readonly aspect: Aspect;
  readonly background_text: string | null;
  readonly safety: "allow" | "block";
  readonly reason: string;
};

export type SnapshotVerdict = {
  readonly reasons: string;
  readonly safe: boolean;
  readonly identity: number;
  readonly garbled_text: boolean;
  readonly learner_face: boolean;
  readonly pass: boolean;
};

/** 프롬프트 노드의 도구 입력 → 모양 검사. 모양이 틀리면 null(호출 실패로 다룬다). */
export function snapshotPromptFrom(input: unknown): SnapshotPrompt | null {
  if (typeof input !== "object" || input === null) return null;
  const value = input as Record<string, unknown>;
  const scene = typeof value["scene"] === "string" ? value["scene"].trim() : "";
  const safety = value["safety"];
  if (scene === "" || (safety !== "allow" && safety !== "block")) return null;
  const aspect: Aspect = value["aspect"] === "1:1" ? "1:1" : "3:2";
  const background =
    typeof value["background_text"] === "string" && value["background_text"].trim() !== ""
      ? value["background_text"].trim()
      : null;
  return {
    scene,
    aspect,
    background_text: background,
    safety,
    reason: typeof value["reason"] === "string" ? value["reason"] : "",
  };
}

/**
 * pass는 모델에게 묻지 않고 여기서 계산한다(lab `with_pass`): 먼저 물으면 Haiku가 이유를 쓰기 전에 정하고 이유와 어긋났다
 * (2026-11-11 실험 14/14 fail, 검사 항목은 모두 깨끗).
 */
export function verdictFrom(input: unknown): SnapshotVerdict | null {
  if (typeof input !== "object" || input === null) return null;
  const value = input as Record<string, unknown>;
  if (typeof value["safe"] !== "boolean" || typeof value["identity"] !== "number") return null;
  const verdict = {
    reasons: typeof value["reasons"] === "string" ? value["reasons"] : "",
    safe: value["safe"],
    identity: value["identity"],
    garbled_text: value["garbled_text"] === true,
    learner_face: value["learner_face"] === true,
  };
  return {
    ...verdict,
    pass: verdict.safe && verdict.identity >= 3 && !verdict.garbled_text && !verdict.learner_face,
  };
}

/**
 * 학습자 모습(설정 `snapshot_self`, lab `SELF_LOOK`): 엔진이 성별을 그때그때 고르지 않도록 프롬프트 노드 입력에 적는다. 스토리 bible의
 * 플레이어는 여성이라 기본값은 female. 어떤 값이든 학습자 얼굴은 그리지 않는다.
 */
export const SELF_LOOK: Record<SnapshotSelf, string> = {
  female:
    "a young woman with long hair, seen only from behind, over the shoulder or as hands at the frame edge — never her face",
  male: "a young man with short hair, seen only from behind, over the shoulder or as hands at the frame edge — never his face",
  hidden:
    "only hands and a shoulder at the frame edge — no head, no hair, no back view, nothing that shows the learner's gender",
};

/** 이미지 프롬프트의 학습자 문장(lab `learner_line`): 성별은 설정으로 정하고 얼굴은 보이지 않는다. */
export function learnerLine(self: SnapshotSelf): string {
  switch (self) {
    case "male":
      return "The learner, if shown, is a young man with short hair seen only from behind, over the shoulder or as hands — never his face.";
    case "hidden":
      return "The learner, if shown, is only hands and a shoulder at the frame edge — no head, hair or back view, never a face.";
    default:
      return "The learner, if shown, is a young woman with long hair seen only from behind, over the shoulder or as hands — never her face.";
  }
}

/** 프롬프트 노드 시스템 글: lab 그대로 + 미성년자 · 나이 모름이면 더 엄격한 규칙. */
export function promptSystem(ageBand: "adult" | "minor" | "unknown"): string {
  return ageBand === "adult" ? PROMPT_SYSTEM : PROMPT_SYSTEM + PROMPT_MINOR_RULES;
}

/** 채팅에 보이는 대로의 한 줄 — 행동은 *별표* 안(lab `message_line`). 프롬프트 노드가 별표를 무대 지시로 쓴다. */
export function messageLine(
  segments: readonly Segment[] | null | undefined,
  text?: string | null,
): string {
  if (segments === null || segments === undefined || segments.length === 0)
    return (text ?? "").trim();
  return segments
    .map((segment) => (segment.kind === "action" ? `*${segment.text}*` : segment.text))
    .join(" ")
    .trim();
}

export type ContextLine = {
  readonly role: "user" | "assistant";
  readonly text: string | null;
  readonly segments: readonly Segment[] | null;
};

/** 프롬프트 노드 user 글(lab `prompt_content`). */
export function promptContent(input: {
  readonly characterName: string;
  readonly look: string;
  readonly context: readonly ContextLine[];
  readonly segments: readonly Segment[];
  readonly snapshotSelf: SnapshotSelf;
}): string {
  const lines = input.context
    .map((line) => {
      const said = messageLine(line.segments, line.text);
      return said === ""
        ? null
        : `${line.role === "user" ? "Learner" : input.characterName}: ${said}`;
    })
    .filter((line): line is string => line !== null);
  return (
    `Character: ${input.characterName}\nLook (for reference only): ${input.look}\n` +
    `Learner look: ${SELF_LOOK[input.snapshotSelf] ?? SELF_LOOK.female}\n\n` +
    `Recent chat:\n${lines.join("\n") || "(no earlier lines)"}\n` +
    `Character (the message to draw): ${messageLine(input.segments)}`
  );
}

/** 이미지 엔진에 보내는 글(lab `image_prompt`). */
export function imagePrompt(prompt: SnapshotPrompt, self: SnapshotSelf): string {
  let text = prompt.scene.trim();
  text +=
    prompt.background_text !== null
      ? ` Background text allowed only: "${prompt.background_text}", short and natural.`
      : " No text anywhere in the image.";
  return (
    text +
    " Korean webtoon illustration style matching the reference. Keep the reference character's face, " +
    "hair and outfit. No speech bubbles, captions or dialogue. " +
    learnerLine(self) +
    " Modest clothing, no body emphasis."
  );
}

/** 프롬프트 해시(AI 생성 표시 메타). 엔진에 보낸 글의 SHA-256 16진. */
export async function promptHash(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
