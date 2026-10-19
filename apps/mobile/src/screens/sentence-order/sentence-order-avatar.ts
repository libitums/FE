import type { DialogueSpeaker } from "./sentence-order-questions";

// 대화 조립(대화 순서 문항) 줄 아바타의 이름 고르기입니다(순수). 아바타는 장식이라 이름은 머리글자로만
// 쓰이고 낭독하지 않습니다 — 칸 낭독은 문구표의 일반 화자 이름(「Partner」 · 「You」)이 그대로 집니다.

/** 화자별 아바타 이름입니다. 카탈로그 레슨은 에피소드 상대 이름 · 학습자 이름을 싣고, 튜토리얼은 주지 않습니다. */
export type DialogueSpeakerNames = { readonly [speaker in DialogueSpeaker]?: string };

/**
 * 그 화자 아바타에 줄 이름입니다. 상대는 이름이 없으면 `undefined` — 아바타가 머리글자 대신 중립
 * 자리표시 그림(사람 실루엣)을 그립니다. 튜토리얼에는 정해진 상대 인물이 없어 아무 글자도 지어내지
 * 않습니다. 나는 이름이 없으면 문구표의 대체 이름(`meFallback`, 「You」)이라 늘 머리글자가 섭니다.
 */
export function dialogueAvatarNameOf(
  speaker: DialogueSpeaker,
  names: DialogueSpeakerNames | undefined,
  meFallback: string,
): string | undefined {
  const named = names?.[speaker]?.trim();
  if (named) return named;
  return speaker === "me" ? meFallback : undefined;
}
