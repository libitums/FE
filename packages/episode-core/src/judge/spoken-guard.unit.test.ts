import { describe, expect, test } from "vitest";

import { negationMismatch, judgeSpokenAnswer, judgeSpokenLenient, type SpokenGrade } from "./index";

// `unit` 계층: 발음은 가깝지만 뜻이 반대인 답을 막는 규칙(ADR-0201 개정 ⟨부정어 · 앞 낱말 · 어간⟩).
// 검토 보고의 오정답 사례와 #628 PR 본문의 사례 표를 함께 둡니다.

type Case = readonly [accepted: string, heard: string, grade: SpokenGrade];

describe("SG1 부정어 — 한쪽에만 있으면 오답", () => {
  test.each<Case>([
    ["좋아요", "안 좋아요", "incorrect"],
    ["괜찮아요", "안 괜찮아요", "incorrect"],
    ["갈게요", "안 갈게요", "incorrect"],
    ["좋아요", "안좋아요", "incorrect"],
    ["갈 수 있어요", "갈 수 없어요", "incorrect"],
    ["네, 한국 음식을 좋아해요.", "아니요 한국 음식을 좋아해요", "incorrect"],
    ["네, 한국 음식을 좋아해요.", "한국 음식을 안 좋아해요", "incorrect"],
    ["한국 음식을 좋아해요.", "한국 음식을 싫어해요", "incorrect"],
    ["저는 학생이에요", "저는 학생이 아니에요", "incorrect"],
    ["오늘 날씨가 좋네요.", "오늘 날씨가 안 좋네요", "incorrect"],
    ["오늘 날씨가 좋네요.", "오늘 날씨가 좋지 않네요", "incorrect"],
    ["지금 가요", "지금 못 가요", "incorrect"],
    ["여기 앉으세요", "여기 앉지 마세요", "incorrect"],
    ["알아요", "몰라요", "incorrect"],
    // 붙여 적은 금지형(리뷰 지적)
    ["여기 앉으세요", "여기 앉지마세요", "incorrect"],
    ["가요", "가지마", "incorrect"],
    // 정답의 부정어를 빠뜨려도 뜻이 반대다(양방향, 리뷰 지적)
    ["오늘은 안 가요", "오늘은 가요", "incorrect"],
    ["저는 학생이 아니에요", "저는 학생이에요", "incorrect"],
    ["시간이 없어요", "시간이 있어요", "incorrect"],
  ])("「%s」 ← 「%s」 → %s", (accepted, heard, grade) => {
    expect(judgeSpokenAnswer([accepted], heard).grade).toBe(grade);
  });

  test.each<Case>([
    // 정답에 같은 부정어가 있으면 보통처럼 비교한다
    ["아니요, 괜찮아요.", "아니요 괜찬아요", "perfect"],
    ["안 좋아요", "안 조아요", "perfect"],
    ["맛없어요", "맛업서요", "perfect"],
    ["몰라요", "몰라요", "perfect"],
    // 「안」으로 시작하는 낱말은 부정어가 아니다
    ["안녕하세요", "안녕하세요", "perfect"],
    ["안녕히 가세요", "안녕히 가세요", "perfect"],
  ])("「%s」 ← 「%s」 → %s", (accepted, heard, grade) => {
    expect(judgeSpokenAnswer([accepted], heard).grade).toBe(grade);
  });

  test("negationMismatch — 정답 쪽 부정어는 세지 않는다", () => {
    expect(negationMismatch("좋아요", "안 좋아요")).toBe(true);
    expect(negationMismatch("안 좋아요", "안 좋아요")).toBe(false);
    expect(negationMismatch("있어요", "없어요")).toBe(true);
    expect(negationMismatch("가세요", "가지 마세요")).toBe(true);
    expect(negationMismatch("가지 마세요", "가지 마세요")).toBe(false);
    expect(negationMismatch("안녕하세요", "안녕하세요")).toBe(false);
    expect(negationMismatch("마세요", "마세요")).toBe(false);
    expect(negationMismatch("좋아요", "")).toBe(false);
    expect(negationMismatch("안 좋아요", "좋아요")).toBe(true);
    expect(negationMismatch("가세요", "가지마세요")).toBe(true);
  });
});

describe("SG2 앞에 덧붙은 낱말 — 군말만 공짜", () => {
  test.each<Case>([
    ["사과", "이거 사과", "incorrect"],
    // 긴 정답에서는 덧붙은 짧은 낱말이 허용 오차 안이다 — 거리로 세므로 perfect가 아니라 close
    ["카드로 할게요.", "저 카드로 할게요", "close"],
    ["감사합니다", "네 감사합니다", "close"],
    // 군말은 그대로 공짜
    ["사과", "음 사과", "perfect"],
    ["지금부터요!", "어 지금부터요", "perfect"],
    // 뒤에 덧붙은 낱말은 전과 같다
    ["사과", "사과 주세요", "perfect"],
  ])("「%s」 ← 「%s」 → %s", (accepted, heard, grade) => {
    expect(judgeSpokenAnswer([accepted], heard).grade).toBe(grade);
  });
});

describe("SG3 낱말 첫 음절(어간) — 길이 허용 오차로 넘어가지 않는다", () => {
  test.each<Case>([
    ["안녕히 가세요", "안녕히 계세요", "incorrect"],
    ["안녕히 계세요", "안녕히 가세요", "incorrect"],
    // 첫 음절이 같고 뒤만 조금 다르면 그대로 close
    ["안녕하세요", "안녕하세여", "close"],
    ["안녕하세요", "안영하세요", "close"],
    ["이거 얼마예요?", "이거 얼마에요", "close"],
    ["지하철역이 어디예요?", "지하철역이 어디에요", "close"],
  ])("「%s」 ← 「%s」 → %s", (accepted, heard, grade) => {
    expect(judgeSpokenAnswer([accepted], heard).grade).toBe(grade);
  });
});

describe("SG4 #628 사례 표 — 그대로", () => {
  test.each<Case>([
    ["비밀번호", "비밀 번호", "perfect"],
    ["카드로 할게요.", "카드로 할께요", "perfect"],
    ["카드로 할게요.", "카드루 할게요", "close"],
    ["카드로 할게요.", "현금으로 할게요", "incorrect"],
    ["고기", "거기", "incorrect"],
  ])("「%s」 ← 「%s」 → %s", (accepted, heard, grade) => {
    expect(judgeSpokenAnswer([accepted], heard).grade).toBe(grade);
  });
});

describe("SG5 체험판도 같은 잣대", () => {
  test.each([
    ["안녕하세요! 네, 처음이에요!", "안녕하세요 네 처음이 아니에요"],
    ["좋아요", "안 좋아요"],
    ["안녕히 가세요", "안녕히 계세요"],
    ["지금부터요!", "이제 지금부터요"],
  ])("「%s」 ← 「%s」 → incorrect", (accepted, heard) => {
    expect(judgeSpokenLenient([accepted], [heard]).outcome).toBe("incorrect");
  });

  test("부정어가 든 대안은 건너뛰고 다음 대안을 본다", () => {
    expect(judgeSpokenLenient(["좋아요"], ["안 좋아요", "조아요"]).outcome).toBe("lenient");
  });
});
