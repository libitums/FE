// 롤플레이 미션(ADR-0160) 문구 — 목록 항목 · 미리보기 · 대화 · 리포트. 다른 구획과 달리 미션 문구는 한 묶음으로 둡니다.
// 이 파일은 모양과 영어 정본이고 번역 초안은 `-es-ja` · `-id-vi` 파일입니다 — 원어민 검수 필요. 엽전은 「Yeopjeon」(ADR-0116 — 화면 문구에 한글을 쓰지 않음).
// 미션은 스위치(`ROLEPLAY_MISSION_READY`) 뒤라 지금 사용자에게 보이지 않습니다.

import { n } from "./ui-copy-en-plural";
import { missionExtraEn, type MissionExtraCopy } from "./ui-copy-roleplay-mission-extra";

export type { MissionExtraCopy };

export type MissionStartErrorKey =
  | "insufficient_credits"
  | "not_available"
  | "age_restricted"
  | "usage_time_limit"
  | "temporarily_blocked"
  | "network";

export type RoleplayMissionCopy = {
  /** 목록 카드의 형태 낱말. */
  readonly form: string;
  readonly goalCount: (count: number) => string;
  readonly best: (score: number) => string;
  readonly withCounterpart: (label: string) => string;
  readonly turnLimit: (count: number) => string;
  readonly previewBody: (label: string) => string;
  readonly goalsTitle: string;
  readonly required: string;
  readonly optional: string;
  readonly priceFree: (left: number) => string;
  readonly priceCoins: (cost: number, balance: number | null) => string;
  readonly start: string;
  readonly starting: string;
  readonly startError: Readonly<Record<MissionStartErrorKey, string>>;
  readonly turnsLeft: (count: number) => string;
  /** 목표 한 줄의 낭독 — 글 · 필수/선택 · 이룸. */
  readonly goalSpoken: (label: string, required: boolean, done: boolean) => string;
  readonly placeholder: string;
  readonly send: string;
  readonly speak: string;
  readonly stop: string;
  readonly listening: string;
  readonly speechUnavailable: string;
  readonly hint: (left: number) => string;
  readonly hintTitle: string;
  readonly hintPenalty: string;
  readonly hintUse: string;
  readonly hintClose: string;
  readonly typing: (label: string) => string;
  readonly unsent: string;
  readonly quit: string;
  readonly quitTitle: string;
  readonly quitBody: string;
  readonly quitConfirm: string;
  readonly quitCancel: string;
  readonly ended: Readonly<Record<"goals" | "turn_limit" | "finish", string>>;
  readonly grading: string;
  readonly report: {
    readonly success: string;
    readonly fail: string;
    readonly score: (score: number) => string;
    readonly best: (score: number) => string;
    readonly task: string;
    readonly expressions: string;
    readonly accuracy: string;
    readonly hints: string;
    readonly hintsUsed: (count: number) => string;
    readonly used: string;
    readonly notUsed: string;
    readonly done: string;
    readonly notDone: string;
    readonly corrections: string;
    readonly retry: string;
    readonly summary: string;
    readonly playAgain: string;
    readonly backToList: string;
    readonly failedTitle: string;
    readonly failedBody: string;
    readonly refunded: string;
    readonly retryGrading: string;
  };
  /** 2026-11-23 서버 계약 뒤 더한 칸 — 계속하기 / 끝내기 · 성공 뒤 그만두기 · 음성 · 리포트 새 구역(`ui-copy-roleplay-mission-extra.ts`). */
  readonly extra: MissionExtraCopy;
};

export const roleplayMissionEn: RoleplayMissionCopy = {
  form: "Mission",
  goalCount: (count) => n(count, "goal", "goals"),
  best: (score) => `Best ${String(score)}`,
  withCounterpart: (label) => `with ${label}`,
  turnLimit: (count) => n(count, "turn", "turns"),
  previewBody: (label) =>
    `Talk with the ${label} in your own words and finish the goals before you run out of turns.`,
  goalsTitle: "Goals",
  required: "Required",
  optional: "Optional",
  priceFree: (left) => `Free today · ${String(left)} left`,
  priceCoins: (cost, balance) =>
    balance === null
      ? `${String(cost)} Yeopjeon`
      : `${String(cost)} Yeopjeon · You have ${String(balance)}`,
  start: "Start mission",
  starting: "Starting…",
  startError: {
    insufficient_credits: "You don't have enough Yeopjeon for this mission.",
    not_available: "This mission isn't open yet. Finish the episode first.",
    age_restricted: "This mission isn't available for your account.",
    usage_time_limit: "You've reached today's time limit. Try again tomorrow.",
    temporarily_blocked: "Chatting is paused for a while. Try again later.",
    network: "Couldn't start the mission. Check your connection and try again.",
  },
  turnsLeft: (count) => `${n(count, "turn", "turns")} left`,
  goalSpoken: (label, required, done) =>
    `${label}, ${required ? "required" : "optional"}, ${done ? "done" : "not done"}`,
  placeholder: "Reply in Korean",
  send: "Send",
  speak: "Speak",
  stop: "Stop",
  listening: "Listening…",
  speechUnavailable: "Speaking isn't available right now. You can type instead.",
  hint: (left) => `Hint · ${String(left)} left`,
  hintTitle: "Try saying",
  hintPenalty: "Each hint takes 5 points.",
  hintUse: "Use this",
  hintClose: "Close hint",
  typing: (label) => `${label} is typing`,
  unsent: "Not sent. Send it again.",
  quit: "Quit mission",
  quitTitle: "Quit this mission?",
  quitBody: "You won't get a report, and this play still counts.",
  quitConfirm: "Quit",
  quitCancel: "Keep going",
  ended: { goals: "Mission complete!", turn_limit: "Out of turns", finish: "Mission complete!" },
  grading: "Scoring your conversation…",
  report: {
    success: "Mission complete",
    fail: "Mission failed",
    score: (score) => `${String(score)} points`,
    best: (score) => `Your best: ${String(score)}`,
    task: "Goals",
    expressions: "Target expressions",
    accuracy: "Accuracy",
    hints: "Hints",
    hintsUsed: (count) => n(count, "hint", "hints"),
    used: "Used",
    notUsed: "Not used",
    done: "Done",
    notDone: "Not done",
    corrections: "Corrected sentences",
    retry: "Try these next time",
    summary: "Feedback",
    playAgain: "Play again",
    backToList: "Back to list",
    failedTitle: "We couldn't score this",
    failedBody: "Something went wrong while scoring. Your conversation is saved.",
    refunded: "We gave back what you paid for this play.",
    retryGrading: "Try again",
  },
  extra: missionExtraEn,
};
