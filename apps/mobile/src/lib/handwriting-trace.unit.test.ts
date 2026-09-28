import { expect, test } from "vitest";

import { handwritingTraceOutcome } from "./handwriting-trace";

// 이 파일이 보는 것은 콜백 페이로드 파서 하나뿐입니다 — `isHandwritingTraceAvailable`과
// `compareHandwritingTrace`는 전역 `NativeModules`를 읽으므로 순수 함수가 아니고, 그
// 경계는 integration 계층이 집니다. 형제 접점(`handwriting-recognition`)과 같은 가름입니다.
//
// 파서는 던지지 않습니다. 모양이 어긋난 값이 오면 예외가 아니라 `malformed`가 답입니다.
//
// ⚠ **수가 문자열로 건너옵니다.** Swift 쪽 페이로드가 전부 문자열인 규약이라, 이 파서가
// 수로 되돌리는 **유일한 자리**입니다. 아래 케이스의 절반이 그 변환의 사각을 봅니다.

const compared = {
  status: "compared",
  coverage: "0.7200",
  stay: "0.9100",
  drawnArea: "1234",
  guideArea: "5678",
  font: "AppleSDGothicNeo-Regular",
  guideBox: "55,52,189,195",
};

// TR1 — 정상 경로이자 기준선입니다. 아래 malformed 케이스들이 이 경로와 갈리는 지점을 봅니다.
test("compared면 비와 넓이가 수로 풀린다", () => {
  expect(handwritingTraceOutcome(compared)).toEqual({
    status: "compared",
    coverage: 0.72,
    stay: 0.91,
    drawnArea: 1234,
    guideArea: 5678,
    font: "AppleSDGothicNeo-Regular",
    guideBox: "55,52,189,195",
  });
});

// TR2 — ⭐ **0은 유효한 값입니다.** 「안내를 하나도 못 덮었다」는 관측이지 실패가
// 아닙니다. 이것이 malformed로 떨어지면 점수 0인 손글씨가 기록에서 사라집니다.
test("비가 0이어도 compared로 남는다", () => {
  const outcome = handwritingTraceOutcome({ ...compared, coverage: "0.0000", stay: "0.0000" });

  expect(outcome).toMatchObject({ status: "compared", coverage: 0, stay: 0 });
});

// TR3 — ⭐ 이 파서의 가장 미끄러운 자리입니다. `Number("")`는 `0`이라, 빈 문자열을 막지
// 않으면 **사유가 「0.0으로 채점됐다」로 둔갑합니다.** 호스트는 `compared`가 아닌 답에서
// 이 자리를 빈 문자열로 채우므로 실제로 일어날 수 있는 모양입니다.
test("비가 빈 문자열이면 0이 아니라 malformed다", () => {
  expect(handwritingTraceOutcome({ ...compared, coverage: "" })).toEqual({ status: "malformed" });
  expect(handwritingTraceOutcome({ ...compared, stay: "" })).toEqual({ status: "malformed" });
});

// TR4 — 수가 아닌 문자열도 같은 자리로 갑니다. `Number("abc")`는 `NaN`이고, NaN이 비로
// 흘러 들어가면 비교가 전부 false가 되어 **조용히 「통과 못 함」이 됩니다.**
test("비가 수로 안 풀리면 malformed다", () => {
  expect(handwritingTraceOutcome({ ...compared, coverage: "abc" })).toEqual({
    status: "malformed",
  });
});

// TR5 — 넓이를 버리지 않는 이유가 여기 있습니다. 비가 이상할 때 분모를 봐야 「안내가 안
// 그려졌나」와 「획이 너무 얇았나」가 갈립니다.
test("넓이가 빠지면 malformed다", () => {
  expect(handwritingTraceOutcome({ ...compared, guideArea: "" })).toEqual({ status: "malformed" });
});

// TR6 — 실제로 선 글꼴 이름은 기록값입니다. 요청한 글꼴이 기기에 없으면 조용히 다른
// 모양으로 재게 되고, 그 사실이 이 문자열 하나에 실립니다.
test("글꼴 이름이 문자열이 아니면 malformed다", () => {
  expect(handwritingTraceOutcome({ ...compared, font: 3 })).toEqual({ status: "malformed" });
});

// TR7 — 안내 상자도 같은 무게입니다. 화면과 호스트가 다른 자리를 보고 있을 때 그것을
// 가르는 유일한 수입니다.
test("안내 상자가 문자열이 아니면 malformed다", () => {
  expect(handwritingTraceOutcome({ ...compared, guideBox: null })).toEqual({ status: "malformed" });
});

// TR8 — 사유 넷은 그대로 남습니다. **각각 다음에 할 일이 다릅니다**: 획이 없었나 ·
// 안내가 안 그려졌나 · 인자가 어긋났나 · 그리다 실패했나.
for (const status of ["empty-strokes", "empty-glyph", "invalid-arguments", "failed"] as const) {
  test(`${status}는 그대로 남는다`, () => {
    expect(handwritingTraceOutcome({ status })).toEqual({ status });
  });
}

// TR9 — 모르는 이름은 접지 않고 malformed로 보냅니다. 새 사유가 호스트에 생겼는데 이
// 파서가 모르면, 그 사실이 조용히 기존 사유로 둔갑하지 않아야 합니다.
test("모르는 status는 malformed다", () => {
  expect(handwritingTraceOutcome({ status: "잘됨" })).toEqual({ status: "malformed" });
});

// TR10 — 객체가 아닌 값들입니다. 브리지가 무엇을 올려도 던지지 않습니다.
for (const payload of [null, undefined, 3, "compared", [], [{ status: "compared" }]]) {
  test(`객체가 아니면 malformed다 — ${JSON.stringify(payload) ?? "undefined"}`, () => {
    expect(handwritingTraceOutcome(payload)).toEqual({ status: "malformed" });
  });
}
