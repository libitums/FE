// 가짜 출처의 씨앗과 출처 옵션입니다(messenger-chat-ui spec §5.1) — `chat-source.contract.ts`에서 옮겼습니다(파일 300줄 상한).

import type { SnapshotSelfStore } from "./chat-fixture-album";
import type { BirthYearStore } from "./chat-fixture-birth-year";
import type { ChatMediaHooks } from "./chat-media.contract";
import type { ChatRemote } from "./chat-remote.contract";
import type { ReplyIdeasStore } from "./reply-ideas-pref";
import type {
  ChatBirthYear,
  ChatCorrection,
  ChatCrisisResource,
  ChatMeaning,
  ChatNoticeKind,
  ChatPreferences,
  ChatReplyIdea,
  ChatRoomAccess,
  ChatRoomSettings,
  ChatStoryPoint,
  ChatText,
  ChatTimers,
} from "./chat-source.contract";

// 픽스처 씨앗: 메시지의 `at` 대신 minutesAgo, 그림은 상대 경로(imageUrlOf가 풉니다).
export type ChatFixtureMessage =
  | {
      readonly kind: "text";
      readonly from: "me" | "them";
      readonly text: ChatText;
      readonly minutesAgo: number;
      /** from "me"만 의미 있음. */
      readonly correction?: ChatFixtureCorrection;
    }
  | { readonly kind: "photo"; readonly imagePath: string | null; readonly minutesAgo: number }
  | {
      readonly kind: "voice";
      readonly durationMs: number;
      readonly text: ChatText;
      readonly minutesAgo: number;
    }
  | { readonly kind: "notice"; readonly notice: ChatNoticeKind; readonly minutesAgo: number }
  | {
      readonly kind: "crisis";
      readonly resources: readonly ChatCrisisResource[];
      readonly minutesAgo: number;
    };

export type ChatFixtureRoom = {
  readonly roomId: string;
  readonly counterpart: {
    readonly id: string;
    readonly name: string;
    readonly avatarPath: string | null;
  };
  readonly access: ChatRoomAccess;
  readonly unread: number;
  readonly messages: readonly ChatFixtureMessage[];
  readonly storyPoints: readonly ChatStoryPoint[];
  readonly settings: ChatRoomSettings;
  readonly ideaSets: readonly (readonly ChatReplyIdea[])[];
  readonly cannedReplies: readonly ChatText[];
  readonly photoPath: string | null;
  readonly voiceLine: { readonly durationMs: number; readonly text: ChatText };
  /** 해금될 때 로그에 놓이는 첫 말(없으면 빈 방). */
  readonly opening?: ChatText;
  /** 확인용 씨앗만 씁니다. 시각은 지금부터 몇 분 뒤입니다. */
  readonly inputBlock?:
    | { readonly kind: "temporarily-blocked" | "usage-time-limit"; readonly inMinutes: number }
    | { readonly kind: "age-restricted" };
};

export type ChatFixtureMeaning = { readonly ko: string } & ChatMeaning;
export type ChatFixtureCorrection = { readonly original: string } & ChatCorrection;

export type ChatFixtureSeed = {
  readonly rooms: readonly ChatFixtureRoom[];
  readonly meanings?: readonly ChatFixtureMeaning[];
  readonly corrections?: readonly ChatFixtureCorrection[];
  readonly fallbackMeaning?: ChatMeaning;
  /** 없으면 추천 답변 켬 · 하루 한 번 · 아무 때나 · 카드만. */
  readonly preferences?: ChatPreferences;
  /** 기억 씨앗(글만). 인물은 상대 id로 찾습니다. */
  readonly memories?: {
    readonly shared: readonly string[];
    readonly byCharacter: Readonly<Record<string, readonly string[]>>;
  };
  /** 없으면 unasked입니다. */
  readonly birthYear?: ChatBirthYear;
};

export type FixtureChatSourceOptions = {
  readonly imageUrlOf: (relativePath: string) => string | null;
  readonly seed?: ChatFixtureSeed;
  readonly now?: () => number;
  readonly timers?: ChatTimers;
  /** 처음부터 열린 채 시작할 인물 id(재시작 뒤 모습). */
  readonly unlocked?: readonly string[];
  readonly remote?: ChatRemote; // 서버 모드(ADR-0137) — 방 기록 · 첫 인사 · 보내기를 서버에서.
  /** 서버 모드에서 만들 때 열린 방의 기록을 미리 읽어 목록에 마지막 말을 세웁니다(다시 켠 뒤 모습). 인사는 청하지 않습니다. */
  readonly previewOnStart?: boolean;
  /** 서버 모드 사진 · 음성(ADR-0146)의 바깥 알림 — 서버 잔액 · 결과 이벤트. */
  readonly mediaHooks?: ChatMediaHooks;
  /** 사진 속 내 모습의 기기 저장(ADR-0150) — 없으면 메모리만(테스트 · 데모). */
  readonly selfStore?: SnapshotSelfStore;
  /** 생년의 기기 저장(ADR-0125) — 없으면 메모리만(테스트 · 데모). */
  readonly birthYearStore?: BirthYearStore;
  /** 추천 답변 설정의 기기 저장(ADR-0156) — 없으면 메모리만(테스트 · 데모). */
  readonly replyIdeasStore?: ReplyIdeasStore;
};
