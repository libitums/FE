import { describe, expect, test } from "vitest";
import { fakeRomanceVerdict } from "./companion-llm-fake-romance.ts";

// 가짜 LLM 검사의 수위선(ADR-0152 · ADR-0164). 성적인 말은 수위 · 연령과 관계없이 입력 · 출력 모두 막는다.
describe("fakeRomanceVerdict", () => {
  const sexual = { category: "sexual", action: "block" } as const;

  test("FR-1. 출력 검사: standard(성인 · 미성년자 · 나이 모름)에서도 성적인 말을 막는다", () => {
    for (const ageBand of ["adult", "minor", "unknown"] as const) {
      expect(
        fakeRomanceVerdict({ layer: "output_sync", ageBand, romanceTier: "standard" }, "sex"),
      ).toEqual(sexual);
    }
  });

  test("FR-2. 출력 검사: open(성인)에서도 성적인 말은 막고, 키스 · 사랑해는 통과한다", () => {
    const request = { layer: "output_sync", ageBand: "adult", romanceTier: "open" } as const;
    expect(fakeRomanceVerdict(request, "sex")).toEqual(sexual);
    expect(fakeRomanceVerdict(request, "키스")).toBeNull();
    expect(fakeRomanceVerdict(request, "사랑해")).toBeNull();
  });
});
