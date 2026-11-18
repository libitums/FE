// 지표 계산: 손으로 검산한 작은 예로 고정합니다(계산 과정은 각 테스트의 주석).

import assert from "node:assert/strict";
import test from "node:test";

import { correlate, describe, histogram, pearson, quantile, ranks, spearman } from "./stats.mjs";
import {
  cer,
  charsNoSpace,
  editDistance,
  errorRates,
  normalize,
  towardReference,
  words,
} from "./text.mjs";

const close = (actual, expected, eps = 1e-6) =>
  assert.ok(Math.abs(actual - expected) < eps, `${actual} ≉ ${expected}`);

test("정규화: NFC · 부호 제거 · 공백 하나", () => {
  assert.equal(normalize("  안녕하세요,  반가워요!! "), "안녕하세요 반가워요");
  assert.equal(normalize("Hello, World."), "hello world");
  // 자모로 풀어 쓴 글(NFD)도 음절 하나로 셉니다.
  assert.deepEqual(charsNoSpace("한".normalize("NFD")), ["한"]);
  assert.equal(normalize("(SN) 안녕", { strip: ["\\([A-Z]+\\)"] }), "안녕");
});

test("편집 거리: kitten→sitting = 3, 빈 배열", () => {
  assert.equal(editDistance([..."kitten"], [..."sitting"]), 3);
  assert.equal(editDistance([], [..."abc"]), 3);
  assert.equal(editDistance([..."abc"], []), 3);
});

test("CER · WER: 낱말 하나에서 조사 하나가 빠진 경우", () => {
  // 정답 「나는 학교에 간다」 / 결과 「나는 학교 간다」
  //  띄어쓰기 뺌: 나는학교에간다(7) vs 나는학교간다 → 삭제 1 → 1/7
  //  띄어쓰기 포함: 9글자 중 「에」 삭제 1 → 1/9
  //  어절: [나는, 학교에, 간다] vs [나는, 학교, 간다] → 치환 1 → 1/3
  const r = errorRates([{ ref: "나는 학교에 간다", hyp: "나는 학교 간다" }]);
  close(r.cerNoSpace, 1 / 7);
  close(r.cerWithSpace, 1 / 9);
  close(r.wer, 1 / 3);
});

test("CER: 띄어쓰기만 다르면 띄어쓰기 뺀 CER은 0", () => {
  // 「학교에 간다」 vs 「학교에간다」: 뺌 0, 포함 1/6(공백 삭제), 어절 2개 → 1개 = 편집 2 → 1
  const r = errorRates([{ ref: "학교에 간다", hyp: "학교에간다" }]);
  assert.equal(r.cerNoSpace, 0);
  close(r.cerWithSpace, 1 / 6);
  assert.equal(r.wer, 1);
});

test("CER: 말뭉치 단위는 편집 합 ÷ 길이 합", () => {
  // (1 편집 / 2글자) + (0 / 「오늘날씨가좋아요」 8글자) → 1/10 (발화 평균이면 0.25)
  const r = errorRates([
    { ref: "사과", hyp: "사가" },
    { ref: "오늘 날씨가 좋아요", hyp: "오늘 날씨가 좋아요" },
  ]);
  close(r.cerNoSpace, 1 / 10);
  assert.equal(r.n, 2);
  assert.equal(cer("", "아"), null);
  assert.deepEqual(words(""), []);
});

test("기준 문장 쪽으로 받아 적은 비율", () => {
  const reference = "사과를 먹어요";
  const human = "사가를 머거요"; // 실제로 한 말(틀린 발음)
  const r = towardReference([
    { reference, human, hyp: "사과를 먹어요" }, // 똑같이 기준 쪽 → strict · loose
    { reference, human, hyp: "사가를 머거요" }, // 들린 대로 → 둘 다 아님
    { reference, human, hyp: "사과를 머거요" }, // 기준과 2/6, 사람과 1/6 차이 → 사람 쪽이 가까워 loose 아님
    { reference: "안녕하세요", human: "안녕하세요", hyp: "안녕하세요" }, // 사람=기준 → 대상 아님
  ]);
  assert.equal(r.eligible, 3);
  close(r.strict, 1 / 3);
  close(r.loose, 1 / 3);
  assert.deepEqual(towardReference([]), { eligible: 0, strict: null, loose: null });
});

test("피어슨: [1,2,3]~[2,4,7] = 5/√(2·114/9) ≈ 0.993399", () => {
  close(pearson([1, 2, 3], [2, 4, 7]), 5 / Math.sqrt((2 * 114) / 9));
  close(pearson([1, 2, 3], [2, 4, 7]), 0.993399, 1e-6);
  close(pearson([1, 2, 3, 4], [4, 3, 2, 1]), -1);
  assert.equal(pearson([1, 2], [1, 2]), null); // 짝 셋 미만
  assert.equal(pearson([1, 1, 1], [1, 2, 3]), null); // 분산 0
  close(pearson([1, 2, null, 3], [2, 4, 99, 7]), 0.993399, 1e-6); // 빈 값은 짝째로 뺌
});

test("스피어만: 같은 값은 평균 순위 — [1..5]~[5,6,7,8,7] = 8/√95", () => {
  assert.deepEqual(ranks([5, 6, 7, 8, 7]), [1, 2, 3.5, 5, 3.5]);
  close(spearman([1, 2, 3, 4, 5], [5, 6, 7, 8, 7]), 8 / Math.sqrt(95));
  close(spearman([1, 2, 3, 4], [1, 4, 9, 16]), 1); // 단조면 1
});

test("상관 묶음과 신뢰구간", () => {
  const c = correlate([1, 2, 3, 4, 5], [2, 4, 5, 4, 5]);
  assert.equal(c.n, 5);
  assert.ok(c.ci[0] < c.pearson && c.pearson < c.ci[1]);
  assert.equal(correlate([1, 2, 3], [1, 2, 4]).ci, null); // n<4
});

test("분위수(선형 보간): [10,20,30,40] p50=25, p95=38.5", () => {
  assert.equal(quantile([40, 10, 30, 20], 0.5), 25);
  close(quantile([10, 20, 30, 40], 0.95), 38.5); // 위치 3×0.95=2.85 → 30+0.85×10
  assert.equal(quantile([], 0.5), null);
  assert.equal(quantile([7], 0.95), 7);
});

test("분포: 평균 · 표준편차 · 도수", () => {
  const d = describe([2, 4, 4, 4, 5, 5, 7, 9]);
  assert.equal(d.mean, 5);
  close(d.sd, Math.sqrt(32 / 7));
  const h = histogram([0, 10, 55, 100, 100], 0, 100, 10);
  assert.equal(h[0].count, 1);
  assert.equal(h[1].count, 1);
  assert.equal(h[5].count, 1);
  assert.equal(h[9].count, 2); // 끝값 100은 마지막 칸
});
