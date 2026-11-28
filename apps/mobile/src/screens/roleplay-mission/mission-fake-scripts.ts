// 가짜 출처가 돌리는 미션 대본들 — 6화 「커피 주문」(계약 fixture · `FAKE_CAFE_SCRIPT`)과 1화 「편의점에서 계산하기」(`mission-fake-store.json`,
// 서버 미션 파일 `missions/u01-water.json`의 장면 사실을 따름). 한국어 대사는 학습 내용이라 편의점 몫은 데이터 파일에 둡니다
// (한글 리터럴 허용 목록 `devtools/ui-copy-literals/policy.mjs`에 새 선언을 더하지 않으려고).

import { FAKE_CAFE_SCRIPT, fakeHeard } from "./mission-fake-rules";
import { missionHintExamples, missionReportFixture, missionStartFixture } from "./mission-fixture";
import storeJson from "./mission-fake-store.json";
import type { MissionAutoSendReason, MissionTranscript } from "./mission-voice.contract";
import type {
  MissionHintResponse,
  MissionReport,
  MissionStartResponse,
} from "./roleplay-mission.contract";

type FakeLine = { readonly ko: string; readonly en: string };
type FakeSentence = { readonly ko: string; readonly meaning: string };

export type FakeFix = {
  readonly kind: "correction" | "better";
  readonly from: string;
  readonly to: string;
  readonly reason: string;
};

export type FakeMissionScript = {
  /** 시작 응답 — 판 id · 값은 출처가 붙입니다. */
  readonly start: Omit<MissionStartResponse, "conversationId" | "charge">;
  readonly goalWords: Readonly<Record<string, readonly string[]>>;
  readonly expressionWords: Readonly<Record<string, string>>;
  readonly replies: Readonly<Record<string, FakeLine>>;
  readonly nudge: FakeLine;
  readonly closing: FakeLine;
  readonly timeUp: FakeLine;
  readonly fixes: readonly FakeFix[];
  readonly focusReason: string;
  readonly hintExamples: Readonly<
    Record<string, Omit<MissionHintResponse, "hintsLeft" | "goalId">>
  >;
  /** 마이크를 누를 때마다 차례로 받아 적는 결과(끝나면 처음부터). */
  readonly heard: readonly MissionTranscript[];
  readonly report: {
    readonly base: MissionReport;
    readonly expressions: readonly { id: string; ko: string; meaning: string }[];
    /** 쓰지 않은 목표 표현마다 「다시 해 볼 표현」. */
    readonly retryFor: Readonly<Record<string, FakeSentence>>;
    readonly headline: { readonly success: string; readonly fail: string };
    readonly summary: { readonly success: string; readonly fail: string };
    /** 「잘한 점」의 인용으로 쓸 목표 — 이 목표를 이룬 발화. */
    readonly strengthGoal: string;
    readonly strengthNote: string;
    readonly nextStep: string;
  };
};

export const FAKE_CAFE: FakeMissionScript = {
  start: missionStartFixture,
  goalWords: FAKE_CAFE_SCRIPT.goalWords,
  expressionWords: FAKE_CAFE_SCRIPT.expressionWords,
  replies: FAKE_CAFE_SCRIPT.replies,
  nudge: FAKE_CAFE_SCRIPT.nudge,
  closing: FAKE_CAFE_SCRIPT.closing,
  timeUp: FAKE_CAFE_SCRIPT.timeUp,
  fixes: FAKE_CAFE_SCRIPT.fixes,
  focusReason: FAKE_CAFE_SCRIPT.focusReason,
  hintExamples: missionHintExamples,
  heard: FAKE_CAFE_SCRIPT.heard.map((line) => fakeHeard(line.text, line.autoSend, line.reason)),
  report: {
    base: missionReportFixture,
    expressions: missionReportFixture.expressions,
    retryFor: {
      "patt:fbe5e354": missionReportFixture.retry[0] ?? FAKE_CAFE_SCRIPT.orderRetry,
      "patt:83586289": FAKE_CAFE_SCRIPT.orderRetry,
    },
    headline: {
      success: missionReportFixture.headline ?? "",
      fail: "You got started — the order isn't finished yet.",
    },
    summary: {
      success: missionReportFixture.summary,
      fail: "You got part of the way. Try paying before the time runs out.",
    },
    strengthGoal: "order",
    strengthNote: missionReportFixture.strengths?.[0]?.note ?? "",
    nextStep: missionReportFixture.nextStep ?? "",
  },
};

type StoreHeard =
  | { readonly text: string; readonly autoSend: boolean; readonly reason: string }
  | { readonly error: string };

const storeHeard = (entry: StoreHeard): MissionTranscript =>
  "error" in entry
    ? { kind: "failed", error: entry.error }
    : fakeHeard(entry.text, entry.autoSend, entry.reason as MissionAutoSendReason);

/** 1화 편의점 — 봉투 · 결제(필수), 영수증 · 다른 물건(선택). 받아 적기는 성공 · 확인 · 실패 갈래를 차례로 돕니다(QA 문서). */
export const FAKE_STORE: FakeMissionScript = {
  start: {
    missionId: storeJson.missionId,
    missionVersion: 1,
    title: storeJson.title,
    scene: storeJson.scene,
    counterpart: storeJson.counterpart,
    opening: { ...storeJson.opening, translation: null },
    goals: storeJson.goals.map((goal) => ({ ...goal, done: false })),
    turnLimit: storeJson.turnLimit,
    turnsLeft: storeJson.turnLimit,
    hintsLeft: 3,
  },
  goalWords: storeJson.goalWords,
  expressionWords: storeJson.expressionWords,
  replies: storeJson.replies,
  nudge: storeJson.nudge,
  closing: storeJson.closing,
  timeUp: storeJson.timeUp,
  fixes: storeJson.fixes.map((fix) => ({
    ...fix,
    kind: fix.kind === "better" ? "better" : "correction",
  })),
  focusReason: storeJson.focusReason,
  hintExamples: storeJson.hintExamples,
  heard: (storeJson.heard as readonly StoreHeard[]).map(storeHeard),
  report: {
    base: { ...missionReportFixture, missionId: storeJson.missionId, retry: [] },
    expressions: storeJson.report.expressions,
    retryFor: storeJson.report.retryFor,
    headline: storeJson.report.headline,
    summary: storeJson.report.summary,
    strengthGoal: storeJson.report.strengthGoal,
    strengthNote: storeJson.report.strengthNote,
    nextStep: storeJson.report.nextStep,
  },
};

export const FAKE_MISSION_SCRIPTS: readonly FakeMissionScript[] = [FAKE_CAFE, FAKE_STORE];

export const fakeScriptFor = (missionId: string): FakeMissionScript | undefined =>
  FAKE_MISSION_SCRIPTS.find((script) => script.start.missionId === missionId);
