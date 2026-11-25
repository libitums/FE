// 채팅 첫 답장 뒤 알림 권한 카드의 제품 사용 이벤트입니다(ADR-0197 D4). 타입만 둡니다. PostHog만(Airbridge 매핑 없음).
// 공통 속성(`surface` · `daysSinceFirstOpen`)은 `companion-event.contract.ts`의 묶음과 같은 규약으로 붙습니다 — 보내는 자리는
// `emitCompanionEvent`입니다. 값은 문자열뿐입니다(수는 10진 문자열).

import type { ChatPillEvent } from "./chat-pill-event.contract";
import type { ChatSuggestionEvent } from "./chat-suggestion-event.contract";
import type { FriendVoiceEvent } from "./friend-voice-event.contract";

type Common = {
  readonly surface: "chat";
  readonly daysSinceFirstOpen: string;
};

/** `shown`: 카드가 섬(`count` 이번이 몇 번째). `tapped`: Turn on · Not now. `answered`: Turn on 뒤 시스템 창의 결과. */
export type ChatPushAskEvent =
  | (Common & {
      readonly name: "chat_push_ask_shown";
      readonly characterId: string;
      readonly count: string;
    })
  | (Common & {
      readonly name: "chat_push_ask_tapped";
      readonly characterId: string;
      readonly choice: "turn_on" | "not_now";
    })
  | (Common & {
      readonly name: "chat_push_ask_answered";
      readonly characterId: string;
      readonly result: "allowed" | "denied";
    });

/**
 * 채팅 방 안의 추천 문장(ADR-0195) · 알림 권한 카드 · 「새 메시지 ↓」 알약(ADR-0117 2026-11-25) 이벤트와 프로필 시트 목소리 견본
 * (ADR-0198) — `CompanionEvent`가 한 줄로 받습니다(그 파일의 줄 수 한도).
 */
export type ChatRoomEvent =
  | ChatSuggestionEvent
  | ChatPushAskEvent
  | ChatPillEvent
  | FriendVoiceEvent;
