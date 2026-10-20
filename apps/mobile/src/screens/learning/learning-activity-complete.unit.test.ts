import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

import {
  activityCompleteClassName,
  activityCompleteMotionOf,
  activityCompleteSummaryOf,
} from "./learning-activity-complete";

// `unit` 계층: 완료 카드의 모션 종류 · 클래스 · 숫자 파생의 입출력만 봅니다.

describe("activityCompleteMotionOf (AC-M)", () => {
  test("AC-M1. 표준이면 링이 차오르고, 줄이기면 처음부터 끝 모습이다", () => {
    expect(activityCompleteMotionOf("standard")).toBe("ring");
    expect(activityCompleteMotionOf("reduced")).toBe("still");
  });
});

describe("activityCompleteClassName (AC-C)", () => {
  test("AC-C1. 링 모션이면 부분 클래스 뒤에 모션 변형이 붙는다", () => {
    expect(activityCompleteClassName("ring-right", "ring")).toBe(
      "learning-activity-complete-ring-right learning-activity-complete-ring-right-motion-ring",
    );
    expect(activityCompleteClassName("rise", "ring")).toBe(
      "learning-activity-complete-rise learning-activity-complete-rise-motion-ring",
    );
  });

  test("AC-C2. 멈춘 모습이면 부분 클래스만이다 — 모션 클래스가 하나도 없다", () => {
    for (const part of ["ring-right", "ring-left", "fill", "check", "rise"] as const) {
      expect(activityCompleteClassName(part, "still")).toBe(`learning-activity-complete-${part}`);
    }
  });
});

describe("activityCompleteSummaryOf (AC-S)", () => {
  test("AC-S1. 레슨 밖(튜토리얼)이면 그 활동의 문항 수만 있고 활동 수 · 레슨 순번은 없다", () => {
    expect(activityCompleteSummaryOf(3, undefined)).toEqual({
      questionCount: 3,
      activityCount: null,
      lessonOrdinal: null,
    });
  });

  test("AC-S2. 레슨 안이면 문항 수는 레슨 전체이고 활동 수 · 순번은 레슨이 준 값이다", () => {
    expect(
      activityCompleteSummaryOf(2, {
        offset: 9,
        total: 11,
        last: true,
        activityCount: 3,
        ordinal: 3,
      }),
    ).toEqual({ questionCount: 11, activityCount: 3, lessonOrdinal: 3 });
  });

  test("AC-S3. 레슨이 활동 수 · 순번을 모르면 지어내지 않는다", () => {
    expect(activityCompleteSummaryOf(2, { offset: 0, total: 2, last: true })).toEqual({
      questionCount: 2,
      activityCount: null,
      lessonOrdinal: null,
    });
  });
});

describe("완료 카드를 띄우는 화면의 장면 결선 (ACW1)", () => {
  const screens = resolve(process.cwd(), "src/screens");
  const collect = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = resolve(dir, entry.name);
      if (entry.isDirectory()) return collect(path);
      return entry.name.endsWith(".tsx") && !entry.name.includes(".test.") ? [path] : [];
    });

  test("ACW1. 완료 카드를 그리는 화면은 모두 셸에 complete를 넘긴다", () => {
    const users = collect(screens).filter((path) =>
      readFileSync(path, "utf8").includes("<LearningActivityComplete"),
    );
    expect(users.length).toBeGreaterThanOrEqual(1);
    for (const path of users) {
      expect(readFileSync(path, "utf8"), path).toContain("complete={");
    }
  });
});
