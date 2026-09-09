// LIB-254 specification 계약. 구현·고정 데이터·JSX를 두지 않고 하류가 공유할 타입만 둔다.
// 이 파일은 계약 고정 시점부터 변경하려면 specification 재고정이 필요하다.

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

export type MessengerEvent =
  | {
      readonly name: "messenger_unit_opened";
      readonly unitId: MessengerUnitId;
      readonly entryStatus: MessengerCompletionStatus;
    }
  | {
      readonly name: "messenger_unit_completed";
      readonly unitId: MessengerUnitId;
    }
  | {
      readonly name: "messenger_unit_exited_incomplete";
      readonly unitId: MessengerUnitId;
    }
  | {
      readonly name: "messenger_unit_replay_started";
      readonly unitId: MessengerUnitId;
    };

// null은 현재 제품에 출시 집계 sink가 없다는 사실을 타입으로 드러낸다. no-op 함수나
// 메모리 배열로 수집 완료를 가장하지 않는다. 대화 본문·답장 문구는 이벤트에 없다.
export type MessengerEventSink = ((event: MessengerEvent) => void) | null;

// App의 유일한 외부 메신저 계측 주입 surface다. prop 생략은 App 경계에서 null로
// 정규화하므로 기존 <App /> 호출부를 깨지 않고, 테스트만 callback spy를 주입할 수 있다.
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
