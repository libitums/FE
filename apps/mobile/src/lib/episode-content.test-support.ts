// 테스트 지원 — 디코더가 받아들이는 가장 작은 최종 테스트(ROLEPLAY_TURN) 와이어 문항입니다.
// 제품 코드는 import하지 않습니다.

export function minimalRoleplayTurnWire(id: string): Record<string, unknown> {
  return {
    id,
    type: "ROLEPLAY_TURN",
    mode: "either",
    event: "R",
    prompt: { ko: "뭐라고 말할까요?", en: "What do you say?" },
    context: { ko: "상대 대사", roman: "sangdae daesa", en: "Other line" },
    stimulus: {
      text: { ko: "내 대사", roman: "nae daesa", en: "My line" },
      audio_url: "",
      image_url: "",
    },
    tiles: [
      { ko: "내", roman: "nae" },
      { ko: "대사", roman: "daesa" },
    ],
    answers: [{ ko: "내 대사", roman: "nae daesa", en: "My line" }],
    feedback: { correct: { ko: "맞아요" } },
    roleplay: { line_id: "D1", tiles_gloss: [{ tile: "내" }, { tile: "대사", en: "line" }] },
  };
}
