import { describe, expect, test } from "vitest";

import {
  judgeRoleplayReply,
  judgeSpokenAnswer,
  SPOKEN_EXACT_MAX_UNITS,
  SPOKEN_FLOOR_MIN_UNITS,
  SPOKEN_ONE_SLIP_MAX_UNITS,
  spokenAllowedDistance,
  spokenTrackOf,
  type SpokenGrade,
} from "./index";

// `unit` 계층: 앱의 말하기 문항 · 롤플레이 판정(ADR-0201). 인식 결과 한 줄 → perfect / close / incorrect.

describe("SA1 허용 오차 — 정답 길이(발음형 자모 수)로 정한다", () => {
  test.each([
    [1, 0],
    [5, 0],
    [6, 1],
    [11, 1],
    [12, 3],
    [19, 4],
    [24, 6],
  ])("자모 %i개 → %i개까지", (length, allowed) => {
    expect(spokenAllowedDistance(length)).toBe(allowed);
  });

  test("경계값", () => {
    expect(SPOKEN_EXACT_MAX_UNITS).toBe(5);
    expect(SPOKEN_ONE_SLIP_MAX_UNITS).toBe(11);
    expect(SPOKEN_FLOOR_MIN_UNITS).toBe(3);
  });
});

describe("SA2 낱말 경계", () => {
  test("띄어쓰기는 경계로만 남고, 군말 낱말은 빠진다", () => {
    expect(spokenTrackOf("음 비밀 번호")).toEqual({
      units: ["ㅂ", "ㅣ", "ㅁ", "ㅣ", "ㄹ", "ㅂ", "ㅓ", "ㄴ", "ㅎ", "ㅗ"],
      wordStarts: [0, 5],
    });
    expect(spokenTrackOf("")).toEqual({ units: [], wordStarts: [] });
  });
});

type Case = readonly [accepted: string, heard: string, grade: SpokenGrade];

const NO_WILDCARD: readonly Case[] = [
  // 낱말 그대로 · 부호만 다름
  ["카드로 할게요.", "카드로 할게요", "perfect"],
  ["카드", "카드 주세요", "perfect"],
  // 발음형이 같음 — 띄어쓰기 · 연음 · 된소리 · ㅐ/ㅔ · 군말
  ["비밀번호", "비밀 번호", "perfect"],
  ["안녕하세요", "안녕 하세요", "perfect"],
  ["카드로 할게요.", "카드로 할께요", "perfect"],
  ["괜찮아요.", "괜찬아요", "perfect"],
  ["먹어요", "머거요", "perfect"],
  ["네", "내", "perfect"],
  ["지금부터요!", "음 지금부터요", "perfect"],
  // 허용 오차 안
  ["안녕하세요", "안영하세요", "close"],
  ["처음이에요", "처음이예요", "close"],
  ["카드로 할게요.", "카드루 할게요", "close"],
  // 짧은 정답은 자모 하나도 안 된다
  ["고기", "거기", "incorrect"],
  ["카드", "카트", "incorrect"],
  ["네", "예", "incorrect"],
  // 낱말을 반만 떼어 맞추지 않는다 — 「현금으로」의 「금으로」 ≠ 「카드로」
  ["카드로 할게요.", "현금으로 할게요", "incorrect"],
  // 붙은 어미는 덧붙은 낱말이 아니다(전과 같이 오답)
  ["카드", "카드요", "incorrect"],
  ["카드", "", "incorrect"],
];

describe("SA3 이름 · 나라 없는 정답", () => {
  test.each(NO_WILDCARD)("「%s」 ← 「%s」 → %s", (accepted, heard, grade) => {
    const judgement = judgeSpokenAnswer([accepted], heard);
    expect(judgement.grade).toBe(grade);
    expect(judgement.result).toBe(grade === "incorrect" ? "incorrect" : "correct");
    expect(judgeRoleplayReply([accepted], heard, [])).toBe(judgement.result);
  });

  test("perfect의 similarity는 1, close는 그 값", () => {
    expect(judgeSpokenAnswer(["비밀번호"], "비밀 번호").similarity).toBe(1);
    expect(judgeSpokenAnswer(["처음이에요"], "처음이예요").similarity).toBe(0.857);
  });
});

describe("SA4 정답이 여럿", () => {
  test("등급이 높은 정답이 이긴다 — expected는 그 정답", () => {
    expect(judgeSpokenAnswer(["아니요, 괜찮아요.", "괜찮아요."], "괜찬아요")).toEqual({
      result: "correct",
      grade: "perfect",
      expected: "괜찮아요.",
      similarity: 1,
    });
  });

  test("둘 다 close면 더 가까운 정답이 모범 정답", () => {
    const judgement = judgeSpokenAnswer(["감사합니다", "고맙습니다"], "고맙슴미다");
    expect(judgement).toMatchObject({ grade: "close", expected: "고맙습니다" });
  });

  test("오답이면 가장 가까운 정답 · 같으면 첫 정답", () => {
    expect(judgeSpokenAnswer(["고기", "사과"], "거기").expected).toBe("고기");
    expect(judgeSpokenAnswer(["고기", "사과"], "").expected).toBe("고기");
  });
});

describe("SA5 이름 · 나라(와일드카드)", () => {
  const ORIGIN = "저는 미국에서 왔어요. 여기서 며칠 묵어요?";
  const PLACES = ["Mary Jane", "미국"];

  test("와일드카드 낱말은 빼고 본다 — 다른 나라 · 다르게 적은 이름도 맞다", () => {
    expect(
      judgeSpokenAnswer([ORIGIN], "저는 캐나다에서 왔어요 여기서 며칠 묵어요", PLACES).grade,
    ).toBe("perfect");
    expect(judgeSpokenAnswer(["Emma로 예약했어요."], "엠마로 예약해써요", ["Emma"]).grade).toBe(
      "perfect",
    );
  });

  test("와일드카드가 끊은 조각도 마디다 — 조각 하나를 빠뜨리면 하한이 막는다", () => {
    expect(judgeSpokenAnswer([ORIGIN], "저는 미국에서 여기서 며칠 묵어요", PLACES).grade).toBe(
      "incorrect",
    );
    expect(judgeSpokenAnswer(["Emma로 예약했어요."], "엠마로 왔어요", ["Emma"]).grade).toBe(
      "incorrect",
    );
  });

  test("마디 순서가 바뀌어도 맞다(체험판 규칙과 같다) — 등급은 close", () => {
    expect(judgeSpokenAnswer([ORIGIN], "여기서 며칠 묵어요 저는 왔어요", PLACES).grade).toBe(
      "close",
    );
  });

  test("정답이 이름뿐이면 무언가 말해야 맞다", () => {
    expect(judgeSpokenAnswer(["{name}"], "마이클", ["{name}"]).grade).toBe("perfect");
    expect(judgeSpokenAnswer(["{name}"], "", ["{name}"]).grade).toBe("incorrect");
  });
});
