import { expect, test } from "vitest";

import type { PersonaCard } from "./chat-send.contract.ts";
import {
  goalIds,
  missionCounterpartBase,
  parseMission,
  requiredGoals,
  validateMission,
} from "./mission-definition.ts";
import { fillTemplate, placeholders } from "./mission-template.ts";
import { cafeMission, waterMission } from "./mission-test-data.ts";

test("MD1. 정의를 읽고 필수 목표 · 목표 id를 파일 순서로 돌려준다", () => {
  expect(validateMission(cafeMission)).toEqual({ ok: true, mission: cafeMission });
  expect(requiredGoals(cafeMission).map((goal) => goal.id)).toEqual(["order", "pay"]);
  expect(goalIds(waterMission)).toEqual(["bag", "pay", "receipt", "ask"]);
});

test("MD2. 틀린 정의는 경로가 붙은 오류 줄로 거부하고, parseMission은 던진다", () => {
  const broken = {
    ...cafeMission,
    turnLimit: 99,
    goals: [{ ...cafeMission.goals[0], id: "주문" }],
  };
  const result = validateMission(broken);
  const errors = result.ok ? [] : result.errors;
  expect(errors.some((line) => line.startsWith("turnLimit:"))).toBe(true);
  expect(errors.some((line) => line.startsWith("goals.0.id:"))).toBe(true);
  expect(() => parseMission(broken)).toThrow(/미션 정의가 올바르지 않습니다/);
  expect(validateMission(null).ok).toBe(false);
});

test("MD3. 목표 id 중복 · 필수 목표 없음은 오류다", () => {
  const duplicate = validateMission({
    ...cafeMission,
    goals: [cafeMission.goals[0], { ...cafeMission.goals[1], id: "order" }],
  });
  expect(duplicate.ok ? [] : duplicate.errors).toContain("goal-ids-unique");
  const optional = validateMission({
    ...cafeMission,
    goals: cafeMission.goals.map((goal) => ({ ...goal, required: false })),
  });
  expect(optional.ok ? [] : optional.errors).toContain("required-goal-missing");
});

test("MD4. 바탕 네 칸 — 단역은 늘 null, 캐스트는 DB 카드를 먼저, 없으면 파일의 base", () => {
  const card: PersonaCard = {
    name: "한도윤",
    age: "23세",
    job: "카페 직원",
    speech: "밝다",
    romance: "flirt back",
    memorySeed: ["오디션"],
    register: "반말",
  };
  expect(missionCounterpartBase(waterMission, card)).toBeNull();
  expect(missionCounterpartBase(cafeMission, card)).toEqual({
    name: "한도윤",
    age: "23세",
    job: "카페 직원",
    speech: "밝다",
  });
  expect(missionCounterpartBase(cafeMission, null)).toEqual(cafeMission.counterpart.base);
  expect(missionCounterpartBase(cafeMission, { name: "도윤" })).toEqual({ name: "도윤" });
});

test("MT1. 틀 채우기 — 값 안의 자리표는 다시 바꾸지 않고, 값이 없는 자리표는 던진다", () => {
  expect(placeholders("{{a}} {{b}} {{a}}")).toEqual(["a", "b"]);
  expect(fillTemplate("[{{a}}] {{b}}", { a: "{{b}}", b: 3 })).toBe("[{{b}}] 3");
  expect(() => fillTemplate("{{a}} {{missing}}", { a: "x" })).toThrow(/missing/);
  expect(fillTemplate("no placeholders", {})).toBe("no placeholders");
});
