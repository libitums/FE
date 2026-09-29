// 메신저 특별 유닛의 타입 전용 계약입니다 — 구현·고정 데이터·JSX를 두지 않고
// 하류가 공유할 타입만 둡니다.

import type { AnswerResult } from "../../lib/answer-result";
import type {
  SpecialUnitEntrySource,
  SpecialUnitExitLabel,
} from "../../lib/special-unit-entry-source";
import type { JourneyMapItemStatus } from "../journey-map/journey-map-units";

export type MessengerUnitId = "appointment-confirmation";

export type MessengerCompletionStatus = "available" | "completed";

export type MessengerReplyIndex = 0 | 1;

export type JiminMessage = {
  readonly id: "jimin-schedule" | "jimin-directions" | "jimin-goodbye";
  readonly sender: "jimin";
  readonly text: string;
  /** 말풍선 아래 흐린 줄의 번역입니다. */
  readonly translation: string;
};

export type SelfMessage = {
  readonly id: "self-accept" | "self-thanks";
  readonly sender: "self";
  /** 학습자가 가상 키보드로 쳐야 하는 답장이자, 맞힌 뒤 말풍선에 서는 문장입니다. */
  readonly text: string;
  /** 입력창의 힌트이자 말풍선 아래 번역입니다 — 학습자는 이 뜻을 한국어로 칩니다. */
  readonly translation: string;
  /**
   * 객관식 보기입니다(Figma 80-7380). 있으면 가상 키보드 대신 이 보기에서 골라 보냅니다 —
   * 정답(`text`)이 보기 안에 들어 있어야 합니다. 없으면 자판으로 칩니다(Figma 80-7082).
   */
  readonly choices?: readonly string[];
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

export type MessengerSessionAction = { readonly type: "reply" };

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
    };

/**
 * `null`은 이 실행에서 보내지 않는다는 뜻입니다(PostHog 키가 없거나 메인 스레드).
 * no-op 함수나 메모리 배열로 수집을 가장하지 않습니다. 대화 본문·답장 문구는
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
  readonly status: JourneyMapItemStatus;
  readonly onSelect: (id: MessengerUnitId) => void;
};

/** 여정 유닛 목록에 들어가는 모양입니다(`journey-map-units.ts`). */
export type MessengerJourneyUnitContract = {
  readonly kind: "special";
  readonly id: MessengerUnitId;
  readonly title: "약속 확인 메시지";
  readonly screen: "messenger";
};

/** 맵 항목입니다. */
export type MessengerJourneyMapItemContract = {
  readonly kind: "messenger";
  readonly id: MessengerUnitId;
  readonly title: MessengerConversation["title"];
};

export type MessengerScreenProps = {
  readonly conversation: MessengerConversation;
  readonly completionStatus: MessengerCompletionStatus;
  readonly onExit: (outcome: MessengerExitOutcome) => void;
  readonly onComplete: (id: MessengerUnitId) => void;
  /**
   * 끝난 대화의 `결과 보기`입니다 — 학습 완료 화면으로 갑니다. 결과는 답장마다 **첫 시도의
   * 정오**입니다. 완료한 유닛에 다시 들어와 전체 기록만 본 경우는 빈 목록입니다.
   */
  readonly onFinish: (id: MessengerUnitId, results: readonly AnswerResult[]) => void;
  readonly exitLabel?: SpecialUnitExitLabel;
};

export type MessageBubbleProps = {
  readonly message: MessengerMessage;
};

/**
 * 답장 입력창의 상태입니다. 입력의 진실은 누른 키의 열(`keys`)이고, 보이는 글자는
 * `composeHangul(keys)`로 파생합니다.
 *
 * - `typing`: 치는 중입니다.
 * - `correct`: 맞혔습니다. 잠시 뒤 답장이 대화에 섭니다.
 * - `incorrect`: 틀렸습니다. `Try Again`이 입력을 비우고 `typing`으로 되돌립니다.
 */
export type MessengerComposerState = {
  readonly keys: readonly string[];
  readonly shifted: boolean;
  readonly verdict: "typing" | "correct" | "incorrect";
};

export type MessengerComposerAction =
  | { readonly type: "press"; readonly key: string }
  | { readonly type: "choose"; readonly text: string }
  | { readonly type: "backspace" }
  | { readonly type: "shift" }
  | { readonly type: "submit"; readonly answer: string }
  | { readonly type: "retry" }
  | { readonly type: "clear" };

export type MessengerComposerProps = {
  readonly reply: SelfMessage;
  readonly typed: string;
  readonly verdict: MessengerComposerState["verdict"];
  readonly onSend: () => void;
};

export type MessengerChoicesProps = {
  readonly choices: readonly string[];
  readonly chosen: string;
  readonly onChoose: (text: string) => void;
};

export type MessengerKeyboardProps = {
  readonly shifted: boolean;
  readonly onPress: (key: string) => void;
  readonly onBackspace: () => void;
  readonly onShift: () => void;
};

export type MessengerFinishButtonProps = {
  readonly onFinish: () => void;
};
