import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

import { learnerProfilePort } from "../lib/learner-profile-data";
import type { LearnerProfileRecord } from "../lib/learner-profile.contract";
import { noLearnerProfilePort } from "../lib/learner-profile";
import { noLearnerProfile } from "./catalog-cover-wiring";
import { learnerFillOf } from "./learner-profile-fill";

// `unit` 계층: 치환용 프로필 만들기의 입출력만 봅니다. 에피소드 전 가드(PG-4 ~ PG-8)는 2026-10-20 걷었습니다.

describe("learnerFillOf", () => {
  const emma: LearnerProfileRecord = { name: "Emma", countryCode: "US" };

  test("PG-1. 기록이 없으면 noLearnerProfile 그 참조다", () => {
    expect(learnerFillOf(null, learnerProfilePort)).toBe(noLearnerProfile);
    expect(learnerFillOf(null, noLearnerProfilePort)).toBe(noLearnerProfile);
  });

  test("PG-2. 기록이 있으면 이름과 나라의 세 표기가 선다", () => {
    expect(learnerFillOf(emma, learnerProfilePort)).toEqual({
      name: "Emma",
      country: { ko: "미국", roman: "miguk", en: "the United States" },
    });
    expect(learnerFillOf({ name: "Liam", countryCode: "DE" }, learnerProfilePort)).toEqual({
      name: "Liam",
      country: { ko: "독일", roman: "dogil", en: "Germany" },
    });
  });

  test("PG-3. 표에 없는 코드는 나라 키가 빠진다", () => {
    const fill = learnerFillOf({ name: "Emma", countryCode: "ZZ" }, learnerProfilePort);

    expect(fill).toEqual({ name: "Emma" });
    expect(Object.keys(fill)).toEqual(["name"]);
  });

  test("PG-3. 빈 포트(자산이 아직 닫히지 않음)에서도 나라 키가 빠진다", () => {
    const fill = learnerFillOf(emma, noLearnerProfilePort);

    expect(fill).toEqual({ name: "Emma" });
    expect(Object.keys(fill)).toEqual(["name"]);
  });
});

describe("소스 검사", () => {
  test("PG-9. 치환기 · 나라 표를 값으로 import하지 않는다(타입만)", () => {
    const source = readFileSync(resolve(process.cwd(), "src/app/learner-profile-fill.ts"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    const violations: string[] = [];

    for (const match of source.matchAll(/import\s+(type\s+)?([^;]*?)\s+from\s+"([^"]+)"/g)) {
      const guarded = /\/lib\/(placeholder-fill|learner-profile-data)$/.test(match[3] ?? "");
      if (guarded && match[1] === undefined) violations.push(match[3] ?? "");
    }

    expect(source).toContain("learnerFillOf");
    expect(violations).toEqual([]);
  });
});
