import { describe, expect, it } from "vitest";

import {
  learningProgressFillClassName,
  learningSessionHeader,
  learningTimingFlag,
} from "./learning-shell.contract";
import { uiCopyEn } from "../../lib/ui-copy-en";

// `unit` 계층: 순수 함수의 입출력만 봅니다 (ADR-0006 D4).
describe("learningSessionHeader", () => {
  it("첫 문항의 순번과 막대는 모두 1/4이다", () => {
    expect(learningSessionHeader("listening", 0, 4, uiCopyEn)).toEqual({
      progressLabel: "Lesson 1 / 4",
      formLabel: "Listening",
      fillPercent: 25,
      accessibilityLabel: "Listening, question 1 of 4",
    });
  });

  // 완료 화면은 문항이 아니므로 마지막 문항에서 이미 100%여야 합니다.
  it("마지막 문항은 완료 화면으로 넘어가기 전에 100%다", () => {
    const header = learningSessionHeader("word-choice", 3, 4, uiCopyEn);

    expect(header.progressLabel).toBe("Lesson 4 / 4");
    expect(header.fillPercent).toBe(100);
  });

  it("한 문항짜리 활동은 추가 end 단계 없이 1/1이다", () => {
    const header = learningSessionHeader("sentence-order", 0, 1, uiCopyEn);
    expect(header.progressLabel).toBe("Lesson 1 / 1");
    expect(header.fillPercent).toBe(100);
  });

  it("세 문항의 진행은 실제 문항 수만 분모로 쓴다", () => {
    const percentages = [0, 1, 2].map(
      (index) => learningSessionHeader("listening", index, 3, uiCopyEn).fillPercent,
    );
    expect(percentages[0]).toBeCloseTo(100 / 3);
    expect(percentages[1]).toBeCloseTo(200 / 3);
    expect(percentages[2]).toBe(100);
  });

  // 백분율 낱말을 내지 않습니다 — 막대가 같은 것을 말하므로 숫자가 둘이면 「어느 것을
  // 보나」가 생깁니다. 걷힌 자리를 누가 되살리면 여기서 빨개집니다.
  it("백분율 낱말을 내지 않는다", () => {
    expect(Object.keys(learningSessionHeader("listening", 1, 3, uiCopyEn))).toEqual([
      "progressLabel",
      "formLabel",
      "fillPercent",
      "accessibilityLabel",
    ]);
  });

  it("학습형마다 이름이 갈린다", () => {
    expect(learningSessionHeader("sentence-order", 0, 1, uiCopyEn).formLabel).toBe("Word order");
    expect(learningSessionHeader("culture", 0, 1, uiCopyEn).formLabel).toBe("Culture");
  });

  // 문항 0개는 오류가 아니라 실재하는 상태입니다 — 낱말 고르기는 오늘 다섯 스텝이 전부
  // 빈 배열이고 그 화면은 마운트가 곧 완료입니다. 던지면 그 화면이 껍데기로 옮겨오는
  // 순간 앱이 죽습니다.
  it("문항이 0개면 던지지 않고 순번을 내지 않는다", () => {
    const header = learningSessionHeader("word-choice", 0, 0, uiCopyEn);

    expect(header.progressLabel).toBeUndefined();
    expect(header.fillPercent).toBe(0);
    expect(header.accessibilityLabel).toBe("Word choice, no questions");
  });

  it("문항 수가 음수면 던진다", () => {
    expect(() => learningSessionHeader("listening", 0, -1, uiCopyEn)).toThrow(/0 이상의 정수/);
  });

  it("순번이 문항 수를 넘으면 던진다", () => {
    expect(() => learningSessionHeader("listening", 4, 4, uiCopyEn)).toThrow(/문항 수를 넘습니다/);
  });

  it("순번이 음수면 던진다", () => {
    expect(() => learningSessionHeader("listening", -1, 4, uiCopyEn)).toThrow(/0 이상의 정수/);
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

describe("learningProgressFillClassName", () => {
  it("LPF1. standard는 기본 클래스만 낸다", () => {
    expect(learningProgressFillClassName("standard")).toBe("learning-shell-progress-fill");
  });

  it("LPF2. reduced는 reduced 변형 클래스를 더한다", () => {
    expect(learningProgressFillClassName("reduced")).toBe(
      "learning-shell-progress-fill learning-shell-progress-fill-motion-reduced",
    );
  });
});
