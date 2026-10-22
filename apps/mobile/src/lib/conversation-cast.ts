// 대화 장면의 출연진입니다(타입만) — 상대와 학습자의 이름 · 그림 주소.

export type ConversationFace = { readonly name?: string; readonly imageUrl?: string };

export type ConversationCast = {
  readonly counterpart: ConversationFace;
  readonly me: ConversationFace;
};
