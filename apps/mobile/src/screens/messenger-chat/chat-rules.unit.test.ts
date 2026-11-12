import { describe, expect, test } from "vitest";

import { askMediaPlan, canSend, canSendReport, clampText, voiceDurationLabel } from "./chat-rules";

// `unit` 계층(MC-U13 ~ U15): 보내기 · 신고 · 고쳐 주세요 · 사진/음성 요청 판정, 음성 길이 표기(spec §5.5).

describe("canSend (MC-U13)", () => {
  test.each([[""], ["  "], ["\n"], [" \t\n "]])("MC-U13. %j 는 보낼 수 없다", (text) => {
    expect(canSend(text)).toBe(false);
  });

  test.each([["ㅎ"], [" a "], ["안녕"], ["😀"]])("MC-U13. %j 는 보낼 수 있다", (text) => {
    expect(canSend(text)).toBe(true);
  });
});

describe("clampText (MC-U13)", () => {
  test("MC-U13. 짧으면 그대로다", () => {
    expect(clampText("안녕", 5)).toBe("안녕");
    expect(clampText("", 5)).toBe("");
  });

  test("MC-U13. 코드 포인트 기준 앞 max개 — 이모지가 반으로 잘리지 않는다", () => {
    expect(clampText("😀😀😀😀😀", 3)).toBe("😀😀😀");
  });

  test("MC-U13. 조합형(풀어쓴) 자모도 코드 포인트 하나씩 센다", () => {
    const decomposed = "한"; // ᄒ ᅡ ᆫ
    expect(clampText(decomposed, 2)).toBe("하");
  });

  test("MC-U13. 정확히 max면 그대로다", () => {
    expect(clampText("abc", 3)).toBe("abc");
  });
});

describe("canSendReport (MC-U13)", () => {
  test("MC-U13. 신고는 사유가 하나 이상이어야 한다", () => {
    expect(canSendReport([])).toBe(false);
    expect(canSendReport(["rude"])).toBe(true);
    expect(canSendReport(["rude", "other"])).toBe(true);
  });
});

describe("askMediaPlan (MC-U14)", () => {
  test("MC-U14. 잔액이 넉넉하면 ask 다", () => {
    expect(askMediaPlan(120, 30)).toEqual({ kind: "ask", price: 30 });
  });

  test("MC-U14. 잔액 = 가격이면 ask 다", () => {
    expect(askMediaPlan(30, 30)).toEqual({ kind: "ask", price: 30 });
  });

  test("MC-U14. 모자라면 top-up 이고 모자란 수를 싣는다", () => {
    expect(askMediaPlan(2, 30)).toEqual({ kind: "top-up", price: 30, shortBy: 28 });
    expect(askMediaPlan(0, 10)).toEqual({ kind: "top-up", price: 10, shortBy: 10 });
  });
});

describe("voiceDurationLabel (MC-U15)", () => {
  test.each([
    [0, "0:00"],
    [4000, "0:04"],
    [4001, "0:05"],
    [59_000, "0:59"],
    [60_000, "1:00"],
    [72_400, "1:13"],
    [600_000, "10:00"],
  ] as const)("MC-U15. %s ms → %s", (ms, label) => {
    expect(voiceDurationLabel(ms)).toBe(label);
  });

  test.each([[-1], [-5000], [Number.NaN]])("MC-U15. %s 는 0:00 이다", (ms) => {
    expect(voiceDurationLabel(ms)).toBe("0:00");
  });
});
