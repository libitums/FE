import { describe, expect, it } from "vitest";

import { learningSessionHeader, learningTimingFlag } from "./learning-shell.contract";

// `unit` 계층: 순수 함수의 입출력만 봅니다 (ADR-0006 D4).
describe("learningSessionHeader", () => {
  it("첫 문항은 순번 1이고 아직 채움이 없다", () => {
    expect(learningSessionHeader("listening", 0, 4)).toEqual({
      progressLabel: "Lesson 1 / 4",
      formLabel: "Listening",
      fillPercent: 0,
      accessibilityLabel: "Listening, 문항 4개 중 1번째",
    });
  });

  // 지금 푸는 문항은 아직 안 끝났으므로 순번이 곧 끝낸 수입니다. 마지막 문항에서도
  // 100%가 아닙니다 — 100%는 활동을 마쳤을 때만 나옵니다.
  it("마지막 문항에서도 100%가 아니다", () => {
    const header = learningSessionHeader("word-choice", 3, 4);

    expect(header.progressLabel).toBe("Lesson 4 / 4");
    expect(header.fillPercent).toBe(75);
  });

  // 백분율 낱말을 내지 않습니다 — 막대가 같은 것을 말하므로 숫자가 둘이면 「어느 것을
  // 보나」가 생깁니다. 걷힌 자리를 누가 되살리면 여기서 빨개집니다.
  it("백분율 낱말을 내지 않는다", () => {
    expect(Object.keys(learningSessionHeader("listening", 1, 3))).toEqual([
      "progressLabel",
      "formLabel",
      "fillPercent",
      "accessibilityLabel",
    ]);
  });

  it("학습형마다 이름이 갈린다", () => {
    expect(learningSessionHeader("sentence-order", 0, 1).formLabel).toBe("Word order");
    expect(learningSessionHeader("culture", 0, 1).formLabel).toBe("Culture");
  });

  it("문항 수가 0이면 던진다", () => {
    expect(() => learningSessionHeader("listening", 0, 0)).toThrow(/1 이상의 정수/);
  });

  it("순번이 문항 수를 넘으면 던진다", () => {
    expect(() => learningSessionHeader("listening", 4, 4)).toThrow(/문항 수를 넘습니다/);
  });

  it("순번이 음수면 던진다", () => {
    expect(() => learningSessionHeader("listening", -1, 4)).toThrow(/0 이상의 정수/);
  });
});

describe("learningTimingFlag", () => {
  // 네이티브 수집기가 **접두사로 갈라** 읽으므로 형태가 계약입니다 — 접두사가 어긋나면
  // 시간은 재지만 메모리 스냅샷이 안 뜨고, 그 실패는 캡처를 읽기 전까지 조용합니다
  // (ADR-0019 D3).
  it("navigation 접두사와 학습형으로 이뤄진다", () => {
    expect(learningTimingFlag("listening")).toBe("libitum:navigation:learning-listening");
    expect(learningTimingFlag("culture")).toBe("libitum:navigation:learning-culture");
  });

  // 학습형마다 값이 갈려야 합니다 — Lynx가 같은 값의 첫 등장만 재므로, 겹치면 한
  // 실행에서 학습 화면 하나만 측정되고 어느 것이었는지도 안 남습니다.
  it("학습형 넷이 서로 다른 값을 낸다", () => {
    const forms = ["listening", "sentence-order", "word-choice", "culture"] as const;
    const flags = forms.map(learningTimingFlag);

    expect(new Set(flags).size).toBe(forms.length);
  });
});
