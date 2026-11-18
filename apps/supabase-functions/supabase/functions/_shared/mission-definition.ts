// 롤플레이 미션(ADR-0160)의 정의를 읽습니다. 순수 함수입니다 — DB · 네트워크에 닿지 않습니다.
//
// 정본은 `missions/*.json`이고 서버 표 `companion.missions.definition`에 그대로 올라갑니다. 모양 검사는 계약 패키지의
// `missionDefinitionSchema`(목표 id 중복 · 필수 목표 · 표현 id 중복 포함)가 하고, 여기는 오류를 읽기 좋은 줄로 바꾸고
// 캐스트의 바탕 네 칸을 고릅니다.

import type { PersonaCard } from "./chat-send.contract.ts";
import {
  missionDefinitionSchema,
  type MissionCounterpartBase,
  type MissionDefinition,
  type MissionGoal,
} from "./companion-contract/index.ts";

export type {
  MissionCounterpartBase,
  MissionDefinition,
  MissionGoal,
  MissionTargetExpression,
} from "./companion-contract/index.ts";

export type MissionValidation =
  | { readonly ok: true; readonly mission: MissionDefinition }
  | { readonly ok: false; readonly errors: readonly string[] };

/** 미션 파일 · `definition jsonb` 하나를 검사합니다. 오류는 `경로: 까닭` 줄들입니다(예: `turnLimit: Too big…`). */
export function validateMission(raw: unknown): MissionValidation {
  const parsed = missionDefinitionSchema.safeParse(raw);
  if (parsed.success) return { ok: true, mission: parsed.data };
  return {
    ok: false,
    errors: parsed.error.issues.map((issue) => {
      const path = issue.path.map(String).join(".");
      return path === "" ? issue.message : `${path}: ${issue.message}`;
    }),
  };
}

/** 검사를 지나지 않으면 던집니다 — 저장소 파일 · 번들 생성처럼 틀리면 멈춰야 하는 곳에서 씁니다. */
export function parseMission(raw: unknown): MissionDefinition {
  const result = validateMission(raw);
  if (!result.ok) throw new Error(`미션 정의가 올바르지 않습니다:\n${result.errors.join("\n")}`);
  return result.mission;
}

export const requiredGoals = (mission: MissionDefinition): readonly MissionGoal[] =>
  mission.goals.filter((goal) => goal.required);

export const goalIds = (mission: MissionDefinition): readonly string[] =>
  mission.goals.map((goal) => goal.id);

/**
 * 캐스트 상대역의 바탕 네 칸(이름 · 나이 · 직업 · 말버릇, ADR-0160 D4). 단역(`characterId` 없음)이면 늘 null.
 * DB의 페르소나 카드(`card`)가 있으면 그것을, 없으면 미션 파일의 `counterpart.base`를 씁니다. 카드의 다른 칸(말씨 · 예시 대사 ·
 * 로맨스 태도 · 기억 씨앗 · 화제)은 본편 시점과 어긋나서 읽지 않습니다.
 */
export function missionCounterpartBase(
  mission: MissionDefinition,
  card: PersonaCard | null,
): MissionCounterpartBase | null {
  if (mission.counterpart.characterId === undefined) return null;
  if (card !== null) {
    return {
      name: card.name,
      ...(card.age ? { age: card.age } : {}),
      ...(card.job ? { job: card.job } : {}),
      ...(card.speech ? { speech: card.speech } : {}),
    };
  }
  return mission.counterpart.base ?? null;
}
