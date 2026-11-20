import { describe, expect, test } from "vitest";
import { fakeRomanceVerdict } from "./companion-llm-fake-romance.ts";

// 가짜 LLM 검사의 수위선(ADR-0152 · ADR-0164 · ADR-0168). 성적인 말은 선 · 연령과 관계없이 입력 · 출력 모두 막는다.
describe("fakeRomanceVerdict", () => {
  const sexual = { category: "sexual", action: "block" } as const;
  const romance = { category: "romance", action: "block" } as const;
  const tracked = { category: "romance", action: "allow" } as const;

  test("FR-1. 출력 검사: hug(성인) · none(미성년자 · 나이 모름)에서도 성적인 말을 막는다", () => {
    expect(
      fakeRomanceVerdict({ layer: "output_sync", ageBand: "adult", romanceLine: "hug" }, "sex"),
    ).toEqual(sexual);
    for (const ageBand of ["minor", "unknown"] as const) {
      expect(fakeRomanceVerdict({ layer: "output_sync", ageBand }, "sex")).toEqual(sexual);
    }
  });

  test("FR-2. 출력 검사: open(성인)에서도 성적인 말은 막고, 키스 · 사랑해는 통과하되 romance로 남긴다", () => {
    const request = { layer: "output_sync", ageBand: "adult", romanceLine: "open" } as const;
    expect(fakeRomanceVerdict(request, "sex")).toEqual(sexual);
    expect(fakeRomanceVerdict(request, "키스")).toEqual(tracked);
    expect(fakeRomanceVerdict(request, "사랑해")).toEqual(tracked);
    expect(fakeRomanceVerdict(request, "안녕")).toBeNull();
  });

  test("FR-3. 입력 검사: 키스는 kiss 선부터, 사랑해는 성인이면 통과하고 romance로 남긴다", () => {
    const at = (romanceLine: "hug" | "kiss" | "close") =>
      ({ layer: "input", ageBand: "adult", romanceLine }) as const;
    expect(fakeRomanceVerdict(at("hug"), "키스")).toEqual(romance);
    expect(fakeRomanceVerdict(at("kiss"), "키스")).toEqual(tracked);
    expect(fakeRomanceVerdict(at("close"), "키스")).toEqual(tracked);
    expect(fakeRomanceVerdict(at("hug"), "사랑해")).toEqual(tracked);
    expect(fakeRomanceVerdict({ layer: "input", ageBand: "unknown" }, "사랑해")).toEqual(romance);
  });
});
