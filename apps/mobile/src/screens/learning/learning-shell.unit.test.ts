import { describe, expect, it } from "vitest";

import {
  layoutHeightFrom,
  learningProgressFillClassName,
  learningSessionHeader,
  learningShellArrangement,
  learningShellFlow,
  learningShellMergeBelow,
  learningTimingFlag,
  learningWorkspaceMode,
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

// 작업 영역 스크롤의 세 모드는 입력 둘의 표 하나로 정해집니다.
describe("learningWorkspaceMode", () => {
  it("[WM1] 스크롤이 꺼졌고 액션 행이 없으면 fixed다", () => {
    expect(learningWorkspaceMode({ scrolls: false, actionsShown: false })).toBe("fixed");
  });

  it("[WM2] 스크롤이 꺼졌으면 액션 행이 있어도 fixed다", () => {
    expect(learningWorkspaceMode({ scrolls: false, actionsShown: true })).toBe("fixed");
  });

  it("[WM3] 스크롤하고 액션 행이 없으면 아래 fog를 세운다", () => {
    expect(learningWorkspaceMode({ scrolls: true, actionsShown: false })).toBe(
      "scroll-with-rest-fog",
    );
  });

  it("[WM4] 스크롤하고 액션 행이 있으면 기존 fog에 맡기고 scroll이다", () => {
    expect(learningWorkspaceMode({ scrolls: true, actionsShown: true })).toBe("scroll");
  });
});

// 몸통이 흐르는 방식의 판정입니다 — 다섯 규칙 가운데 위에서부터 먼저 맞는 하나입니다.
// 입력값 78(Pixel 8 글꼴 2.2)과 117(글꼴 2.0)은 기기에서 읽은 작업 영역 스크롤의 높이입니다.
describe("learningShellFlow", () => {
  it("[FL1] 작업 영역 스크롤의 높이가 0이면 합친다", () => {
    expect(
      learningShellFlow({
        current: "split",
        workspaceMode: "scroll-with-rest-fog",
        viewportHeight: 0,
      }),
    ).toBe("merged");
  });

  it("[FL2] 문턱 바로 아래(95.9)는 합친다 — 상수에서 계산한 값으로도 본다", () => {
    expect(
      learningShellFlow({
        current: "split",
        workspaceMode: "scroll-with-rest-fog",
        viewportHeight: 95.9,
      }),
    ).toBe("merged");
    expect(
      learningShellFlow({
        current: "split",
        workspaceMode: "scroll-with-rest-fog",
        viewportHeight: learningShellMergeBelow - 0.1,
      }),
    ).toBe("merged");
  });

  it("[FL3] 문턱 96은 합치지 않는다(경계는 split)", () => {
    expect(
      learningShellFlow({
        current: "split",
        workspaceMode: "scroll-with-rest-fog",
        viewportHeight: 96,
      }),
    ).toBe("split");
    expect(
      learningShellFlow({
        current: "split",
        workspaceMode: "scroll-with-rest-fog",
        viewportHeight: learningShellMergeBelow,
      }),
    ).toBe("split");
  });

  it("[FL4] 액션 행이 서 있는 모드(scroll)도 78이면 합친다", () => {
    expect(
      learningShellFlow({ current: "split", workspaceMode: "scroll", viewportHeight: 78 }),
    ).toBe("merged");
  });

  it("[FL5] 글꼴 2.0의 117은 합치지 않는다", () => {
    expect(
      learningShellFlow({
        current: "split",
        workspaceMode: "scroll-with-rest-fog",
        viewportHeight: 117,
      }),
    ).toBe("split");
  });

  it("[FL6] 이미 merged면 높이가 800이어도 merged다(걸쇠)", () => {
    expect(
      learningShellFlow({
        current: "merged",
        workspaceMode: "scroll-with-rest-fog",
        viewportHeight: 800,
      }),
    ).toBe("merged");
  });

  it("[FL7] 걸쇠는 쓰기 제외(규칙 2)보다 먼저다 — merged · fixed · 800은 merged", () => {
    expect(
      learningShellFlow({ current: "merged", workspaceMode: "fixed", viewportHeight: 800 }),
    ).toBe("merged");
  });

  it("[FL8] 쓰기(fixed)는 높이가 0이어도 합치지 않는다", () => {
    expect(learningShellFlow({ current: "split", workspaceMode: "fixed", viewportHeight: 0 })).toBe(
      "split",
    );
  });

  it("[FL9] 못 잰 값(NaN · 음수 · 무한대)으로는 합치지 않는다", () => {
    for (const viewportHeight of [Number.NaN, -1, Number.POSITIVE_INFINITY]) {
      expect(
        learningShellFlow({
          current: "split",
          workspaceMode: "scroll-with-rest-fog",
          viewportHeight,
        }),
      ).toBe("split");
    }
  });

  it("문턱 상수는 96이다", () => {
    expect(learningShellMergeBelow).toBe(96);
  });
});

describe("layoutHeightFrom", () => {
  it("[LH1] detail.height를 읽는다", () => {
    expect(layoutHeightFrom({ detail: { height: 77 } })).toBe(77);
  });

  it("[LH2] 0은 undefined가 아니라 0이다", () => {
    expect(layoutHeightFrom({ detail: { height: 0 } })).toBe(0);
  });

  it("[LH3] detail이 없으면 params.height를 읽는다", () => {
    expect(layoutHeightFrom({ params: { height: 77 } })).toBe(77);
  });

  it("[LH4] 둘 다 있으면 detail이 먼저다", () => {
    expect(layoutHeightFrom({ detail: { height: 10 }, params: { height: 99 } })).toBe(10);
  });

  it("[LH5] 숫자가 아니거나 유한하지 않거나 음수인 높이는 undefined다", () => {
    expect(layoutHeightFrom({ detail: { height: "77" } })).toBeUndefined();
    expect(layoutHeightFrom({ detail: { height: Number.NaN } })).toBeUndefined();
    expect(layoutHeightFrom({ detail: { height: -5 } })).toBeUndefined();
  });

  it("[LH6] 이벤트가 아닌 값은 던지지 않고 undefined다", () => {
    for (const event of [null, undefined, 7, "x", {}, { detail: null }]) {
      expect(() => layoutHeightFrom(event)).not.toThrow();
      expect(layoutHeightFrom(event)).toBeUndefined();
    }
  });

  it("[LH7] detail에 높이가 없으면 params.height로 내려간다", () => {
    expect(layoutHeightFrom({ detail: {}, params: { height: 40 } })).toBe(40);
  });

  it("[LH8] 무한대는 undefined다", () => {
    expect(layoutHeightFrom({ detail: { height: Number.POSITIVE_INFINITY } })).toBeUndefined();
  });
});

describe("learningShellArrangement", () => {
  it("[AR1] scrollCard면 흐름과 상관없이 card-scroll이다", () => {
    expect(learningShellArrangement({ scrollCard: true, flow: "split" })).toBe("card-scroll");
    expect(learningShellArrangement({ scrollCard: true, flow: "merged" })).toBe("card-scroll");
  });

  it("[AR2] scrollCard가 아니고 merged면 merged다", () => {
    expect(learningShellArrangement({ scrollCard: false, flow: "merged" })).toBe("merged");
  });

  it("[AR3] scrollCard가 아니고 split이면 split이다", () => {
    expect(learningShellArrangement({ scrollCard: false, flow: "split" })).toBe("split");
  });
});
