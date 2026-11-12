// 자유 대화 화면 계약입니다(messenger-chat-ui spec §3.2 · §6.1 · §8). 이 단계는 순수 모듈이 쓰는 타입과
// 문구표 타입(`MessengerChatCopy`)을 둡니다. 화면 props · test-id 객체는 UI 스캐폴드가 더했습니다.

import type { KeyboardDockEdges } from "../../lib/keyboard-dock";
import type {
  ChatRelation,
  ChatReportReasonId,
  ChatSource,
  ChatTimers,
} from "./chat-source.contract";
import type { CoinWallet } from "./coin-wallet";
import type { ChatTier } from "./free-turns";
import type { TurnLedger } from "./turn-ledger";
import type { ComposerKeyboard } from "./keyboard-plan";
import type { MyMessageCopy, NewFriendCopy, TurnsCopy } from "./messenger-chat-copy-1-5.contract";
import type { SafetyCopy } from "./safety-copy.contract";
import type { KeyboardHeightStore, KoreanKeyboardProbe } from "./keyboard-ports";
import type { ChatSettingsCopy } from "./chat-settings.contract";

/** 「…」 메뉴 항목(고정 순서: ideas · fix · report). */
export type ChatMoreAction = "ideas" | "fix" | "report";

/** 일~토 일곱 칸입니다. */
export type ChatWeekdayNames = readonly [string, string, string, string, string, string, string];

/** 메신저 채팅(목록 · 방 · 겹침) UI 문구입니다 — `UiCopy.messengerChat`. */
export type MessengerChatCopy = {
  readonly list: {
    readonly title: string;
    readonly coinsLabel: (count: number) => string;
    readonly newBadge: string;
    readonly newFriendLabel: string;
    readonly emptyTitle: string;
    readonly emptyBody: string;
    readonly goToJourney: string;
    readonly mine: (text: string) => string;
    readonly photo: string;
    readonly voice: (duration: string) => string;
    readonly typing: (name: string) => string;
    readonly sendingPhoto: (name: string) => string;
    readonly recordingVoice: (name: string) => string;
    readonly lockedCondition: (episode: number) => string;
    readonly lockedRowLabel: (name: string, condition: string) => string;
    readonly unreadLabel: (count: number) => string;
    /** 낭독 조립: 이름, 미리보기, 시간, 안 읽은 수(없으면 null). */
    readonly rowLabel: (
      name: string,
      preview: string,
      time: string,
      unread: string | null,
    ) => string;
  };
  readonly time: {
    readonly now: string;
    readonly yesterday: string;
    readonly weekdays: ChatWeekdayNames;
    readonly today: (hours: number, minutes: number) => string;
    readonly date: (month: number, day: number) => string;
  };
  readonly room: {
    readonly back: string;
    readonly settings: string;
    readonly typing: (name: string) => string;
    readonly sendingPhoto: (name: string) => string;
    readonly recordingVoice: (name: string) => string;
    readonly photoLabel: (name: string) => string;
    readonly voiceLabel: (name: string, duration: string, ko: string, en: string) => string;
    readonly play: string;
    readonly pause: string;
    /** 위기 안내 카드가 도착했을 때 낭독합니다. */
    readonly crisisArrived: string;
  };
  readonly composer: {
    readonly placeholder: string;
    readonly send: string;
    readonly ideas: string;
    /** 보기 판이 열려 있을 때 전구의 낭독 라벨(접근성 M5). */
    readonly ideasOpen: string;
  };
  readonly toggle: {
    readonly learning: string;
    readonly phone: string;
    readonly selected: (label: string) => string;
  };
  readonly features: {
    readonly snapshot: string;
    readonly snapVoice: string;
    readonly pillLabel: (name: string, price: number) => string;
    readonly more: string;
    /** 「…」 메뉴가 펼쳐져 있을 때의 낭독 라벨(접근성 M5). */
    readonly moreOpen: string;
  };
  readonly more: {
    readonly ideas: string;
    readonly fix: string;
    readonly report: string;
  };
  readonly ideas: {
    readonly typeMyself: string;
    readonly quote: (text: string) => string;
  };
  readonly report: {
    readonly title: string;
    readonly description: string;
    readonly reasons: Readonly<Record<ChatReportReasonId, string>>;
    readonly send: string;
    readonly cancel: string;
    readonly close: string;
    readonly checked: (label: string, on: boolean) => string;
  };
  readonly fix: {
    readonly title: string;
    readonly description: string;
    readonly placeholder: string;
    readonly cancel: string;
    readonly send: string;
  };
  readonly regen: {
    readonly title: string;
    readonly description: string;
    readonly cancel: string;
    readonly confirm: string;
  };
  readonly askMedia: {
    readonly photo: { readonly title: string; readonly description: (name: string) => string };
    readonly voice: { readonly title: string; readonly description: (name: string) => string };
    readonly balance: (count: number) => string;
    readonly cancel: string;
    readonly confirmLabel: (price: number) => string;
    readonly getCoins: string;
  };
  readonly sidebar: {
    readonly title: string;
    readonly close: string;
    readonly myCoins: string;
    readonly getCoins: string;
    readonly viewProfile: string;
    readonly myProfile: string;
    readonly calledBy: (friend: string, me: string) => string;
    readonly storyPoint: string;
    readonly autoIdeas: string;
    readonly autoIdeasDescription: string;
    readonly deleteChat: string;
  };
  readonly storyPoint: {
    readonly title: string;
    readonly description: (name: string) => string;
    readonly episodeTitle: (episode: number, title: string) => string;
    readonly relation: Readonly<Record<ChatRelation, string>>;
    readonly lockedCondition: (episode: number) => string;
    readonly change: string;
    readonly close: string;
  };
  readonly deleteChat: {
    readonly title: string;
    readonly description: (name: string) => string;
    readonly cancel: string;
    readonly confirm: string;
  };
  readonly myMessage: MyMessageCopy;
  readonly turns: TurnsCopy;
  readonly newFriend: NewFriendCopy;
  /** 법 · 안전 UI(ADR-0125). 시각은 `time(hour, minute)`이 언어별로 씁니다. */
  readonly safety: SafetyCopy;
  /** 대화 설정(ADR-0126) — 설정 탭 Chats 화면 · 먼저 보내는 메시지 · 기억 · 교정 방식. */
  readonly chatSettings: ChatSettingsCopy;
};

// --- 화면 props (spec §6.1) ---

export type MessengerListScreenProps = {
  readonly source: ChatSource;
  /** 엽전 지갑입니다 — 잔액 = 앱의 보유 엽전(ADR-0116) − 이번 실행에서 쓴 양(spec §5.2 · §7.2). */
  readonly wallet: CoinWallet;
  readonly onOpenRoom: (roomId: string) => void;
  readonly onGoToJourney: () => void;
  readonly onLayerChange: (open: boolean) => void;
};

export type MessengerChatScreenProps = {
  readonly roomId: string;
  readonly source: ChatSource;
  readonly keyboardProbe: KoreanKeyboardProbe;
  readonly keyboardHeightStore: KeyboardHeightStore;
  readonly edges: KeyboardDockEdges;
  readonly learnerName: string;
  /** 엽전 지갑입니다(spec §5.2 · §7.2). */
  readonly wallet: CoinWallet;
  /** 하루 무료 수 원장입니다(모든 인물 합 — spec §5.3). */
  readonly turns: TurnLedger;
  /** unlimited면 턴 표시 · 관문이 모두 빠집니다. */
  readonly tier: ChatTier;
  /** 지역 시계입니다(남은 시간 · 자정 초기화). */
  readonly now: () => number;
  /** 분 단위 갱신 타이머 주입(기본은 전역 타이머). */
  readonly timers?: ChatTimers;
  readonly onExit: () => void;
  /** 사이드바의 「What {name} remembers」 — 인물 기억 화면을 쌓습니다(ADR-0126). */
  readonly onOpenMemories: (characterId: string, name: string) => void;
};

// --- test-id (spec §9) ---

const room = (suffix: string): string => `messenger-chat-${suffix}`;
const list = (suffix: string): string => `messenger-list-${suffix}`;

export const messengerListTestIds = {
  screen: list("screen"),
  header: list("header"),
  title: list("title"),
  coins: list("coins"),
  list: list("list"),
  row: (id: string): string => list(`row-${id}`),
  rowPreview: (id: string): string => list(`row-${id}-preview`),
  rowTime: (id: string): string => list(`row-${id}-time`),
  rowUnread: (id: string): string => list(`row-${id}-unread`),
  rowNew: (id: string): string => list(`row-${id}-new`),
  empty: list("empty"),
  emptyGoToJourney: list("empty-go"),
} as const;

export const messengerChatTestIds = {
  screen: room("screen"),
  header: room("header"),
  title: room("title"),
  back: room("back"),
  settings: room("settings"),
  log: room("log"),
  incoming: room("incoming"),
  outgoing: room("outgoing"),
  typing: room("typing"),
  photoPending: room("photo-pending"),
  photo: room("photo"),
  voicePending: room("voice-pending"),
  voice: room("voice"),
  voicePlay: room("voice-play"),
  featureRow: room("features"),
  snapshot: room("feature-snapshot"),
  snapVoice: room("feature-voice"),
  more: room("more"),
  moreMenu: room("more-menu"),
  moreItem: (action: ChatMoreAction): string => room(`more-${action}`),
  composer: room("composer"),
  ideasButton: room("ideas-button"),
  field: room("field"),
  display: room("display"),
  input: room("input"),
  send: room("send"),
  toggleRow: room("toggle"),
  toggle: (mode: ComposerKeyboard): string => room(`toggle-${mode}`),
  slot: room("slot"),
  ideasPanel: room("ideas"),
  ideasQuote: room("ideas-quote"),
  ideasTypeMyself: room("ideas-type-myself"),
  idea: (index: number): string => room(`idea-${index}`),
  reportSheet: room("report"),
  reportReason: (id: ChatReportReasonId): string => room(`report-${id}`),
  fixDialog: room("fix"),
  fixField: room("fix-field"),
  fixCancel: room("fix-cancel"),
  fixSend: room("fix-send"),
  regenDialog: room("regen"),
  deleteDialog: room("delete"),
  askDialog: room("ask"),
  askBalance: room("ask-balance"),
  askConfirm: room("ask-confirm"),
  askCancel: room("ask-cancel"),
  sidebar: room("sidebar"),
  sidebarClose: room("sidebar-close"),
  sidebarCoins: room("sidebar-coins"),
  sidebarGetCoins: room("sidebar-get-coins"),
  sidebarProfile: room("sidebar-profile"),
  sidebarMyProfile: room("sidebar-my-profile"),
  sidebarStoryPoint: room("sidebar-story-point"),
  sidebarAutoIdeas: room("sidebar-auto-ideas"),
  sidebarDelete: room("sidebar-delete"),
  storyPointSheet: room("story-point"),
  storyPointOption: (id: string): string => room(`story-point-${id}`),
  notice: room("notice"),
  crisis: room("crisis"),
  crisisCall: room("crisis-call"),
  crisisWeb: room("crisis-web"),
  blocked: room("blocked"),
  blockedChangeYear: room("blocked-change-year"),
  birthYearSheet: room("birth-year-sheet"),
  birthYearOption: (year: number): string => room(`birth-year-${year}`),
  sidebarBirthYear: room("sidebar-birth-year"),
} as const;
