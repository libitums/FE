// 프로필 시트 목소리 견본의 제품 사용 이벤트입니다(ADR-0198 D4) — PostHog만(Airbridge로 보내지 않음). 타입만 둡니다.
// 공통 속성(`surface` · `daysSinceFirstOpen`)은 `companion-event.contract.ts`의 묶음과 같은 규약으로 붙습니다 — 보내는 자리는
// `emitCompanionEvent`입니다.

type Common = {
  readonly surface: "chat";
  readonly daysSinceFirstOpen: string;
};

/** 견본을 새로 틀었음(처음부터 재생이 시작됨) — 이어 듣기는 세지 않습니다. 못 틀었으면 내지 않습니다. */
export type FriendVoiceEvent = Common & {
  readonly name: "friend_voice_sample_played";
  readonly characterId: string;
};
