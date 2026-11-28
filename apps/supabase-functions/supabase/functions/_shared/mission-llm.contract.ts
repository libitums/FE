// 미션 채점 · 힌트의 LLM 호출 모양(ADR-0193). `CompanionLlm`의 미션 칸(`MissionLlmMembers`)이 이것을 씁니다.
// 결과 모양은 코어의 구조화 출력 스키마(`mission-grader.ts`의 `graderSchema` · `mission-hint.ts`의 `hintSchema`)와 같습니다 —
// 계약 파일이 코어를 import하지 않게 타입만 따로 둡니다(같은지는 `companion-llm-mission.ts`가 컴파일로 확인).
// `CompanionLlm`의 미션 칸(미션 계층만 있다): `gradeMission` · `missionHint` · `judgeMission`(턴마다 목표 판정) · `graderModel`(채점 모델 이름 — 결과 행의 grader_model) ·
// `missionTurn`(미션 턴용 계층 — 답 · 교정만 미션 모델, 검사 · 번역은 컴패니언 설정).

/** 시스템 프롬프트는 고정(`graderSystem` · `hintSystem`)이라 user 글만 받는다. */
export type MissionLlmRequest = { readonly user: string; readonly signal: AbortSignal };

export type MissionGraderDraft = {
  goals: {
    id: string;
    evidence: string | null;
    done: boolean;
    tip: { ko: string; meaning: string } | null;
  }[];
  registerNotes: string;
  registerTurns: number;
  registerMismatchTurns: number;
  accuracyNotes: string;
  accuracy: number;
  expressions: { id: string; evidence: string | null; used: boolean }[];
  focus: { refs: number[]; reason: string }[];
  strengths: { quote: string; note: string }[];
  retry: { ko: string; meaning: string }[];
  headline: string;
  summary: string;
  nextStep: string;
};

export type MissionHintDraft = { goalId: string; ko: string; roman: string; meaning: string };

/** 목표 판정(`mission-judge.ts`의 `judgeSchema`와 같은 모양). */
export type MissionJudgeDraft = { goals: { id: string; quote: string }[]; off_task: boolean };

/** `CompanionLlm`의 미션 칸 — 위 머리말. `missionTurn`은 같은 계층 타입(`this`)이라 계약 파일끼리 서로 import하지 않는다. */
export interface MissionLlmMembers {
  gradeMission?(request: MissionLlmRequest): Promise<MissionGraderDraft>;
  missionHint?(request: MissionLlmRequest): Promise<MissionHintDraft>;
  judgeMission?(request: MissionLlmRequest): Promise<MissionJudgeDraft>;
  readonly graderModel?: string;
  readonly missionTurn?: this;
}

/** 미션의 LLM 사용량 단계 · 로그 이름(`LlmStep` · `ChatSendLogEntry.event`에 더한다). */
export type MissionLlmStep = "mission_grade" | "mission_hint" | "mission_judge";
export type MissionLogEvent = "mission_start" | "mission_hint" | "mission_finish";
