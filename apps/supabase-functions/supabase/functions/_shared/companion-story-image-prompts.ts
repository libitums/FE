// 친구 스토리 그림의 글(ADR-0192 D5 · D9) — 장면 설계에 더하는 규칙(셀카 · 남이 찍어 준 컷) · 인물 없는 컷(손까지)의 조립 · 검사. 런타임 중립.
// 인물 컷의 장면 설계 · 조립 · 검사 글은 스냅샷 v2m(`companion-snapshot-v2-prompts.ts`) 그대로이고, 여기는 스토리에서 달라지는 것만 둔다.

/** 조립한 이미지 프롬프트 끝에 붙이는 틀 — 휴대폰 세로 화면. */
export const STORY_FRAME = "Vertical 2:3 portrait framing for a phone story.";

/** 장면 설계 시스템 글에 더하는 규칙 — 스냅샷(대화의 한 순간)이 아니라 모두가 보는 게시물이다. */
export const STORY_PLAN_RULES = `
Story post rules (these override anything above that conflicts):
- This picture is not a chat snapshot. It is a public "story" the character posts for everyone, seen by teenagers too.
- The message is the story's caption. The stage direction in *asterisks* before it is the art brief written by the editor: follow it for the place, the action and what is in view.
- The learner is never in the picture: learner "none", and never the over_shoulder shot.
- The picture is a tall 2:3 portrait for a phone screen: choose a shot and angle that work vertically. The aspect field is ignored.
- No readable text, logos, brand marks, album covers or real people's faces: background_text null.`;

/** 인물이 나오는 두 컷의 규칙 — 장면 설계 시스템 글 끝에 붙인다. 계획의 각도 · 구도는 코드가 다시 고정한다. */
export const SHOT_PLAN_RULES = {
  selfie: `
- This story is a selfie the character took: angle "selfie", shot "close_up" or "medium". The character holds the phone at arm's length (the phone is not in the picture); what they are showing is beside or behind them.`,
  other: `
- This photo was taken by someone else: never the "selfie" angle. The character is not holding the camera; they are seen from a little distance doing what the art brief says (shot "medium", "full_body" or "wide").`,
} as const;

const STYLE = "Korean webtoon / manhwa illustration, clean line art, soft cel shading.";
const SCENERY_RULES =
  "A photo taken from the photographer's own point of view. No person in the picture except, at most, the " +
  "photographer's hand at the edge of the frame holding or reaching for the subject; small faceless passers-by far " +
  "in the background are fine. Never a visible face or a full figure in the foreground. " +
  "No text, letters, logos, brand marks or album covers anywhere in the image. No speech bubbles or captions.";

/** 사물 · 풍경 컷의 이미지 프롬프트 — 그림 주문(영어) + 고정 규칙 문장. 주문이 비었으면 한 줄의 뜻에서. */
export function sceneryPrompt(scene: string, meaning: string): string {
  const flat = (text: string) =>
    text
      .replace(/\s+/g, " ")
      .trim()
      .replace(/[.\s]+$/, "");
  const brief =
    flat(scene) !== ""
      ? flat(scene)
      : `A scene, without people, that fits this caption: ${flat(meaning).replace(/"/g, "'")}`;
  return `${brief}. ${STYLE} ${STORY_FRAME} ${SCENERY_RULES}`;
}

export const SCENERY_CHECK_SYSTEM = `You check a generated illustration for a public "story" post in a Korean-learning app, seen by teenagers. It should show a place, food or object with no main person — a hand at the edge of the frame holding the subject is fine.
Judge: safety (no sexual content, violence, or alcohol or smoking as the focus; safe for a teenager), face (a person's face — eyes, nose or mouth — clearly visible; tiny faceless background figures do NOT count), person (a person is a main subject of the picture — a body, a back view or a cropped figure in the foreground; a hand or forearm at the frame edge and tiny background passers-by do NOT count), text or logo (readable or garbled letters, a logo, a brand mark, an album cover or a speech bubble), matches (the picture fits the brief). Write the reasons first, then the fields.`;

export const SCENERY_CHECK_TOOL = {
  name: "story_picture_check",
  description: "The verdict on one generated story picture.",
  input_schema: {
    type: "object" as const,
    properties: {
      reasons: { type: "string" },
      safe: { type: "boolean" },
      face: { type: "boolean" },
      person: { type: "boolean" },
      text_or_logo: { type: "boolean" },
      matches: { type: "boolean" },
    },
    required: ["reasons", "safe", "face", "person", "text_or_logo", "matches"],
  },
};

export type SceneryVerdict = {
  readonly reasons: string;
  readonly safe: boolean;
  readonly face: boolean;
  /** 사람이 그림의 주인공으로 나왔는가(얼굴이 안 보여도 — 뒷모습 · 잘린 몸). 손 · 멀리 지나가는 사람은 아님. */
  readonly person: boolean;
  readonly text_or_logo: boolean;
  readonly matches: boolean;
  readonly pass: boolean;
};

/** pass는 모델에 묻지 않고 계산한다. 모양이 틀리면(칸이 빠져도) null — 다시 그린다. */
export function sceneryVerdictFrom(input: unknown): SceneryVerdict | null {
  if (typeof input !== "object" || input === null) return null;
  const value = input as Record<string, unknown>;
  // 다섯 칸이 모두 참 · 거짓이어야 한다 — 빠진 칸을 「문제없음」으로 읽지 않는다.
  const [safe, face, person, text, matches] = [
    value["safe"],
    value["face"],
    value["person"],
    value["text_or_logo"],
    value["matches"],
  ];
  if (
    typeof safe !== "boolean" ||
    typeof face !== "boolean" ||
    typeof person !== "boolean" ||
    typeof text !== "boolean" ||
    typeof matches !== "boolean"
  )
    return null;
  const verdict = {
    reasons: typeof value["reasons"] === "string" ? value["reasons"].slice(0, 600) : "",
    safe,
    face,
    person,
    text_or_logo: text,
    matches,
  };
  return {
    ...verdict,
    pass:
      verdict.safe && !verdict.face && !verdict.person && !verdict.text_or_logo && verdict.matches,
  };
}
