// 미션 채점 · 힌트의 LLM 호출 모양(ADR-0160). `CompanionLlm`의 선택 메서드(`gradeMission` · `missionHint`)가 이것을 씁니다.
// 결과 모양은 코어의 구조화 출력 스키마(`mission-grader.ts`의 `graderSchema` · `mission-hint.ts`의 `hintSchema`)와 같습니다 —
// 계약 파일이 코어를 import하지 않게 타입만 따로 둡니다(같은지는 `companion-llm-mission.ts`가 컴파일로 확인).

/** 시스템 프롬프트는 고정(`graderSystem` · `hintSystem`)이라 user 글만 받는다. */
export type MissionLlmRequest = { readonly user: string; readonly signal: AbortSignal };

export type MissionGraderDraft = {
  goals: { id: string; done: boolean; evidence: string | null }[];
  accuracy: number;
  expressions: { id: string; used: boolean }[];
  retry: { ko: string; meaning: string }[];
  summary: string;
};

export type MissionHintDraft = { ko: string; roman: string; meaning: string };
