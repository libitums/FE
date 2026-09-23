// 메신저 특별 유닛의 타입 전용 계약입니다 — 구현·고정 데이터·JSX를 두지 않고
// 하류가 공유할 타입만 둡니다.

import type {
  SpecialUnitEntrySource,
  SpecialUnitExitLabel,
} from "../../lib/special-unit-entry-source";

export type MessengerUnitId = "appointment-confirmation";

export type MessengerCompletionStatus = "available" | "completed";

export type MessengerReplyIndex = 0 | 1;

export type JiminMessage = {
  readonly id: "jimin-schedule" | "jimin-directions" | "jimin-goodbye";
  readonly sender: "jimin";
  readonly text: string;
};

export type SelfMessage = {
  readonly id: "self-accept" | "self-thanks";
  readonly sender: "self";
  readonly text: string;
};

export type MessengerMessage = JiminMessage | SelfMessage;

export type MessengerConversation = {
  readonly id: MessengerUnitId;
  readonly title: "약속 확인 메시지";
  readonly participantName: "지민";
  readonly messages: readonly [
    JiminMessage & { readonly id: "jimin-schedule" },
    SelfMessage & { readonly id: "self-accept" },
    JiminMessage & { readonly id: "jimin-directions" },
    SelfMessage & { readonly id: "self-thanks" },
    JiminMessage & { readonly id: "jimin-goodbye" },
  ];
};

export type MessengerSessionState =
  | { readonly mode: "active"; readonly replyIndex: MessengerReplyIndex }
  | { readonly mode: "completed" };

export type MessengerSessionAction = { readonly type: "reply" } | { readonly type: "replay" };

export type MessengerExitOutcome = "incomplete" | "completed";

/**
 * 열림 이벤트는 출처별 변형이 둘입니다 — 롤플레이 출처는 `entryStatus`를 싣지
 * 않습니다. 그 밖 세 이벤트는 두 출처 모두 같은 모양입니다.
 */
export type MessengerEvent =
  | {
      readonly name: "messenger_unit_opened";
      readonly unitId: MessengerUnitId;
      readonly entrySource: "journey";
      readonly entryStatus: MessengerCompletionStatus;
    }
  | {
      readonly name: "messenger_unit_opened";
      readonly unitId: MessengerUnitId;
      readonly entrySource: "roleplay";
    }
  | {
      readonly name: "messenger_unit_completed";
      readonly unitId: MessengerUnitId;
      readonly entrySource: SpecialUnitEntrySource;
    }
  | {
      readonly name: "messenger_unit_exited_incomplete";
      readonly unitId: MessengerUnitId;
      readonly entrySource: SpecialUnitEntrySource;
    }
  | {
      readonly name: "messenger_unit_replay_started";
      readonly unitId: MessengerUnitId;
      readonly entrySource: SpecialUnitEntrySource;
    };

/**
 * `null`은 현재 제품에 출시 집계 sink가 없다는 사실을 타입으로 드러냅니다. no-op
 * 함수나 메모리 배열로 수집 완료를 가장하지 않습니다. 대화 본문·답장 문구는
 * 이벤트에 없습니다.
 */
export type MessengerEventSink = ((event: MessengerEvent) => void) | null;

/**
 * App의 유일한 외부 메신저 계측 주입 surface입니다. prop 생략은 App 경계에서
 * `null`로 정규화하므로 기존 `<App />` 호출부를 깨지 않고, 테스트만 callback spy를
 * 주입할 수 있습니다.
 */
export type MessengerAppProps = {
  readonly messengerEventSink?: MessengerEventSink;
};

export type MessengerMapItemProps = {
  readonly id: MessengerUnitId;
  readonly title: MessengerConversation["title"];
  readonly status: MessengerCompletionStatus;
  readonly onSelect: (id: MessengerUnitId) => void;
};

export type MessengerScreenProps = {
  readonly conversation: MessengerConversation;
  readonly completionStatus: MessengerCompletionStatus;
  readonly onExit: (outcome: MessengerExitOutcome) => void;
  readonly onComplete: (id: MessengerUnitId) => void;
  readonly onReplay: (id: MessengerUnitId) => void;
  readonly exitLabel?: SpecialUnitExitLabel;
};

export type MessageBubbleProps = {
  readonly message: MessengerMessage;
};

export type ReplyButtonProps = {
  readonly reply: SelfMessage;
  readonly onReply: () => void;
};

export type ReplayButtonProps = {
  readonly onReplay: () => void;
};
