/**
 * 약속 확인 전화 특별 유닛의 타입 전용 계약입니다.
 *
 * 이 파일은 런타임 값이나 제품 동작을 만들지 않습니다. 기존 여정과 내비게이션의
 * discriminant는 연결할 수 있도록 별도 통합 형태로만 기록합니다.
 */

// 전화 계약에서 `SpecialUnitEntrySource`는 쓰지 않습니다 — 아래 `PhoneCallEvent`의
// 두 변형이 리터럴 `"journey"`·`"roleplay"`라 오늘은 `SpecialUnitExitLabel`만
// 필요합니다.
import type { SpecialUnitExitLabel } from "../../lib/special-unit-entry-source";

export type PhoneCallUnitId = "appointment-confirmation-phone-call";

export type PhoneCallTurnIndex = 0 | 1 | 2;
export type PhoneCallTurnId = "confirm-time" | "confirm-place" | "goodbye";
export type PhoneCallReplyId = "confirm-time-reply" | "confirm-place-reply" | "goodbye-reply";
export type PhoneCallAudioSource =
  | "phone-call-confirm-01"
  | "phone-call-confirm-02"
  | "phone-call-confirm-03";

export type ConfirmTimePhoneCallTurn = {
  readonly id: "confirm-time";
  readonly speakerId: "jimin";
  readonly speakerName: "지민";
  readonly transcript: "토요일 오후 2시에 역 앞 카페에서 만나는 거 맞죠?";
  readonly audioSource: "phone-call-confirm-01";
  readonly reply: {
    readonly id: "confirm-time-reply";
    readonly text: "네, 토요일 오후 2시에 만나요.";
  };
};

export type ConfirmPlacePhoneCallTurn = {
  readonly id: "confirm-place";
  readonly speakerId: "jimin";
  readonly speakerName: "지민";
  readonly transcript: "카페는 2번 출구 오른쪽에 있는 곳 맞죠?";
  readonly audioSource: "phone-call-confirm-02";
  readonly reply: {
    readonly id: "confirm-place-reply";
    readonly text: "네, 2번 출구 오른쪽 카페예요.";
  };
};

export type GoodbyePhoneCallTurn = {
  readonly id: "goodbye";
  readonly speakerId: "jimin";
  readonly speakerName: "지민";
  readonly transcript: "좋아요. 그럼 토요일에 봐요!";
  readonly audioSource: "phone-call-confirm-03";
  readonly reply: {
    readonly id: "goodbye-reply";
    readonly text: "네, 토요일에 봐요!";
  };
};

export type PhoneCallTurn =
  | ConfirmTimePhoneCallTurn
  | ConfirmPlacePhoneCallTurn
  | GoodbyePhoneCallTurn;

export type PhoneCallConversation = {
  readonly unitId: PhoneCallUnitId;
  readonly title: "약속 확인 전화";
  readonly turns: readonly [
    ConfirmTimePhoneCallTurn,
    ConfirmPlacePhoneCallTurn,
    GoodbyePhoneCallTurn,
  ];
};

/** 제품 코드의 단일 고정 대화를 읽는 내부 조회 함수 시그니처. */
export type GetPhoneCallConversation = () => PhoneCallConversation;

export type PhoneCallSessionState =
  | { readonly mode: "ready"; readonly turnIndex: PhoneCallTurnIndex }
  | { readonly mode: "playing"; readonly turnIndex: PhoneCallTurnIndex }
  | { readonly mode: "reply-ready"; readonly turnIndex: PhoneCallTurnIndex }
  | { readonly mode: "completed" };

export type PhoneCallSessionAction =
  | { readonly type: "play" }
  | { readonly type: "audio-settled" }
  | { readonly type: "audio-unavailable" }
  | { readonly type: "reply" }
  | { readonly type: "replay" };

export type PhoneCallCompletionStatus = "available" | "completed";
export type PhoneCallExitOutcome = "incomplete" | "completed";
export type PhoneCallPlayLabel = "통화 시작" | "듣기" | "다시 듣기";
export type PhoneCallStatusLabel = "통화 준비" | "상대방이 말하는 중" | "답장할 차례" | "통화 완료";

export type PhoneCallTranscriptEntry =
  | {
      readonly speaker: "jimin";
      readonly speakerName: "지민";
      readonly turnId: PhoneCallTurnId;
      readonly text: PhoneCallTurn["transcript"];
    }
  | {
      readonly speaker: "self";
      readonly speakerName: "나";
      readonly replyId: PhoneCallReplyId;
      readonly text: PhoneCallTurn["reply"]["text"];
    };

export type PhoneCallMapItemProps = {
  readonly id: PhoneCallUnitId;
  readonly title: "약속 확인 전화";
  readonly status: PhoneCallCompletionStatus;
  readonly onSelect: (id: PhoneCallUnitId) => void;
};

export type PhoneCallScreenProps = {
  readonly unitId: PhoneCallUnitId;
  readonly conversation: PhoneCallConversation;
  readonly completionStatus: PhoneCallCompletionStatus;
  readonly onComplete: (id: PhoneCallUnitId) => void;
  readonly onExit: (outcome: PhoneCallExitOutcome) => void;
  readonly exitLabel?: SpecialUnitExitLabel;
};

/** 전화에는 열림 이벤트만 있습니다 — 완료·다시보기 이벤트는 만들지 않습니다. */
export type PhoneCallEvent =
  | {
      readonly name: "phone_call_unit_opened";
      readonly unitId: PhoneCallUnitId;
      readonly entrySource: "journey";
      readonly entryStatus: PhoneCallCompletionStatus;
    }
  | {
      readonly name: "phone_call_unit_opened";
      readonly unitId: PhoneCallUnitId;
      readonly entrySource: "roleplay";
    };

/** `null`은 출시 집계 sink가 없다는 사실을 타입으로 드러냅니다(`MessengerEventSink`와 같은 규약). */
export type PhoneCallEventSink = ((event: PhoneCallEvent) => void) | null;

/**
 * App의 유일한 외부 전화 계측 주입 surface입니다. prop 생략은 App 경계에서
 * `null`로 정규화하므로 기존 `<App />` 호출부를 깨지 않고, 테스트만 callback spy를
 * 주입할 수 있습니다.
 */
export type PhoneCallAppProps = {
  readonly phoneCallEventSink?: PhoneCallEventSink;
};

/**
 * 기존 여정 유닛 union(`JourneyUnit`)에 그대로 연결되는 형태입니다. 현재 런타임
 * union은 변경하지 않아 기존 App의 exhaustive 분기와 일반 여정 동작을 보존합니다.
 */
export type PhoneCallJourneyUnitContract = {
  readonly kind: "special";
  readonly id: PhoneCallUnitId;
  readonly title: "약속 확인 전화";
  readonly screen: "phone-call";
};

export type PhoneCallJourneyMapItemContract = {
  readonly kind: "phone-call";
  readonly id: PhoneCallUnitId;
  readonly title: "약속 확인 전화";
  readonly status: PhoneCallCompletionStatus;
};

export type PhoneCallNavigationScreenContract = {
  readonly name: "phone-call";
  readonly unitId: PhoneCallUnitId;
};

export type PhoneCallTestId =
  | `journey-map-phone-call-${PhoneCallUnitId}`
  | "phone-call-screen"
  | "phone-call-title"
  | "phone-call-contact-name"
  | "phone-call-status"
  | `phone-call-transcript-jimin-${PhoneCallTurnId}`
  | `phone-call-transcript-self-${PhoneCallReplyId}`
  | "phone-call-audio-button"
  | `phone-call-reply-${PhoneCallReplyId}`
  | "phone-call-replay-button"
  | "phone-call-exit-button";
