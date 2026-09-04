import assert from "node:assert/strict";
import test from "node:test";

import { evaluatePerformanceReportPolicy } from "./policy.mjs";

const validReport = `# 앱 초기 로드 — iPhone 시뮬레이터 — 01

## 실행 조건

- 측정 일시: 2026-09-04T09:00:00+09:00
- 상태: 측정 — 수집 완료
- 대상 commit: \`0123456789abcdef0123456789abcdef01234567\`
- 기기: iPhone 시뮬레이터
- OS: iOS 26.5
- Lynx SDK: 4.0.1
- 빌드: Debug

## 시나리오

- 단계: 앱을 실행한다.

## 분석 결과

Rendering 100 ms

## 해석

단일 실행이므로 회귀 여부는 말할 수 없다.

## 결론과 후속

- 결론: 수집 경로가 동작한다.
`;

function evaluate({
  changedFiles,
  changedHeadFiles = changedFiles,
  trackedFiles = changedFiles,
  reports = {},
}) {
  return evaluatePerformanceReportPolicy({
    changedFiles,
    changedHeadFiles,
    trackedFiles,
    readFile: (path) => reports[path],
  });
}

test("changedHeadFiles를 생략하면 명시적인 계약 오류를 반환한다", () => {
  assert.throws(
    () =>
      evaluatePerformanceReportPolicy({
        changedFiles: ["docs/performance/reports/deleted-01.md"],
        trackedFiles: [],
        readFile: () => {
          throw new Error("deleted report must not be read");
        },
      }),
    /changedHeadFiles.*필수/,
  );
});

test("runtime change가 없으면 명시적으로 적용 대상 아님을 반환한다", () => {
  const result = evaluate({ changedFiles: ["docs/README.md"] });

  assert.equal(result.ok, true);
  assert.equal(result.applicable, false);
  assert.match(result.message, /적용 대상 아님/);
});

test("앱 런타임 변경에는 README가 아닌 성능 보고서가 필요하다", () => {
  const result = evaluate({
    changedFiles: ["apps/mobile/src/app/App.tsx", "docs/performance/reports/README.md"],
    reports: { "docs/performance/reports/README.md": validReport },
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /성능 보고서/);
});

test("테스트 파일만 바뀐 경우 보고서를 요구하지 않는다", () => {
  const result = evaluate({
    changedFiles: [
      "apps/mobile/src/app/App.integration.test.tsx",
      "apps/ios/HostTests/ViewControllerTests.swift",
    ],
  });

  assert.equal(result.ok, true);
  assert.equal(result.applicable, false);
});

test("필수 메타데이터와 섹션을 갖춘 정제 보고서를 허용한다", () => {
  const reportPath = "docs/performance/reports/app-launch-iphone-simulator-01.md";
  const result = evaluate({
    changedFiles: ["apps/ios/Host/ViewController.swift", reportPath],
    reports: { [reportPath]: validReport },
  });

  assert.deepEqual(result.errors, []);
  assert.equal(result.ok, true);
  assert.equal(result.applicable, true);
});

test("iOS 의존성 변경도 관찰 가능한 런타임 변경으로 분류한다", () => {
  const result = evaluate({ changedFiles: ["apps/ios/Podfile.lock"] });

  assert.equal(result.ok, false);
  assert.equal(result.applicable, true);
  assert.match(result.errors.join("\n"), /성능 보고서/);
});

test("보고서 파일명과 첫 H1의 날짜, 필수 메타데이터 누락을 거부한다", () => {
  const reportPath = "docs/performance/reports/app-launch-2026-09-04-iphone-01.md";
  const result = evaluate({
    changedFiles: ["apps/mobile/src/app/App.tsx", reportPath],
    reports: {
      [reportPath]: `# 앱 초기 로드 2026-09-04\n\n## 분석 결과\n\n없음`,
    },
  });

  const errors = result.errors.join("\n");
  assert.match(errors, /파일명.*날짜/);
  assert.match(errors, /제목.*날짜/);
  assert.match(errors, /상태/);
  assert.match(errors, /대상 commit/);
  assert.match(errors, /기기/);
  assert.match(errors, /OS/);
  assert.match(errors, /Lynx SDK/);
  assert.match(errors, /빌드/);
  assert.match(errors, /시나리오/);
  assert.match(errors, /해석 또는 제한 사항/);
  assert.match(errors, /결론과 후속/);
});

test("해석 섹션에 측정 한계가 없으면 거부한다", () => {
  const reportPath = "docs/performance/reports/app-launch-iphone-simulator-01.md";
  const result = evaluate({
    changedFiles: ["apps/mobile/src/app/App.tsx", reportPath],
    reports: {
      [reportPath]: validReport.replace(
        "단일 실행이므로 회귀 여부는 말할 수 없다.",
        "렌더링이 빠르다.",
      ),
    },
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /측정 한계/);
});

test("원본 캡처와 로컬 절대 경로를 거부한다", () => {
  const reportPath = "docs/performance/reports/app-launch-iphone-simulator-01.md";
  const result = evaluate({
    changedFiles: ["apps/mobile/src/app/App.tsx", reportPath],
    trackedFiles: [reportPath, "docs/performance/reports/raw.ndjson"],
    reports: {
      [reportPath]: `${validReport}\n원본: \`/var/mobile/capture.ndjson\``,
    },
  });

  const errors = result.errors.join("\n");
  assert.match(errors, /원본 JSON\/NDJSON/);
  assert.match(errors, /로컬 절대 경로/);
});

test("미측정 보고서를 baseline이나 통과로 표현하지 못하게 한다", () => {
  const reportPath = "docs/performance/reports/app-launch-iphone-simulator-01.md";
  const result = evaluate({
    changedFiles: ["apps/mobile/src/app/App.tsx", reportPath],
    reports: {
      [reportPath]: validReport
        .replace("상태: 측정 — 수집 완료", "상태: 미측정 — 장비 없음")
        .replace("단일 실행이므로 회귀 여부는 말할 수 없다.", "baseline 대비 성능 통과다."),
    },
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /미측정.*baseline.*통과/);
});

test("미측정이 baseline이나 성능 통과가 아니라고 명시한 문장은 허용한다", () => {
  const reportPath = "docs/performance/reports/app-launch-iphone-simulator-01.md";
  const result = evaluate({
    changedFiles: ["apps/mobile/src/app/App.tsx", reportPath],
    reports: {
      [reportPath]: validReport
        .replace("상태: 측정 — 수집 완료", "상태: 미측정 — 장비 없음")
        .replace(
          "단일 실행이므로 회귀 여부는 말할 수 없다.",
          "이 문서는 baseline이나 성능 통과 증거가 아니다. 기능 baseline은 남겼지만 성능 baseline은 남기지 못했다.",
        ),
    },
  });

  assert.equal(result.ok, true);
});

test("실행 조건 밖의 metadata와 빈 placeholder 값을 거부한다", () => {
  const reportPath = "docs/performance/reports/empty-contract-01.md";
  const emptyContract = `# 빈 계약 — 시뮬레이터 — 01

## 실행 조건

<실행 조건을 작성하세요>

## 시나리오

- 상태:
- 대상 commit: <전체 SHA>
- 기기: TODO
- OS: TBD
- Lynx SDK: 미정
- 빌드: 작성 필요

## 분석 결과

결과

## 해석

측정 한계가 있다.

## 결론과 후속

결론
`;
  const result = evaluate({
    changedFiles: ["apps/mobile/src/app/App.tsx", reportPath],
    reports: { [reportPath]: emptyContract },
  });

  assert.equal(result.ok, false);
  for (const field of ["상태", "대상 commit", "기기", "OS", "Lynx SDK", "빌드"]) {
    assert.match(result.errors.join("\n"), new RegExp(field));
  }
});

test("필수 section의 빈 본문과 placeholder 본문을 거부한다", () => {
  const reportPath = "docs/performance/reports/empty-sections-01.md";
  const result = evaluate({
    changedFiles: ["apps/mobile/src/app/App.tsx", reportPath],
    reports: {
      [reportPath]: validReport
        .replace("- 단계: 앱을 실행한다.", "<시나리오를 작성하세요>")
        .replace("Rendering 100 ms", "TODO")
        .replace("- 결론: 수집 경로가 동작한다.", ""),
    },
  });

  assert.equal(result.ok, false);
  const errors = result.errors.join("\n");
  assert.match(errors, /시나리오.*본문/);
  assert.match(errors, /분석 결과.*본문/);
  assert.match(errors, /결론과 후속.*본문/);
});

test("slash 날짜를 첫 H1에서 거부한다", () => {
  const reportPath = "docs/performance/reports/app-launch-01.md";
  const result = evaluate({
    changedFiles: ["apps/mobile/src/app/App.tsx", reportPath],
    reports: { [reportPath]: validReport.replace(/^# .+$/m, "# 앱 초기 로드 2026/09/04") },
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /제목.*날짜/);
});

test("강조된 미측정 상태와 mixed clause의 긍정 claim을 거부한다", () => {
  const reportPath = "docs/performance/reports/unmeasured-01.md";
  const result = evaluate({
    changedFiles: ["apps/mobile/src/app/App.tsx", reportPath],
    reports: {
      [reportPath]: validReport
        .replace("상태: 측정 — 수집 완료", "상태: **미측정** — 장비 없음")
        .replace(
          "단일 실행이므로 회귀 여부는 말할 수 없다.",
          "측정 한계가 있어 baseline은 아니지만 이번 smoke는 성능 통과다.",
        ),
    },
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /미측정.*baseline.*통과/);
});

test("iOS와 mobile의 test directory helper는 runtime 변경이 아니다", () => {
  const result = evaluate({
    changedFiles: [
      "apps/ios/HostTests/TestSupport.swift",
      "apps/ios/HostUITests/Fixture.swift",
      "apps/mobile/src/test/render-helper.ts",
    ],
  });

  assert.equal(result.ok, true);
  assert.equal(result.applicable, false);
});

test("file URI와 home-relative 로컬 경로를 거부한다", () => {
  const reportPath = "docs/performance/reports/local-path-01.md";
  for (const localPath of ["file:///Users/example/capture.ndjson", "~/capture.ndjson"]) {
    const result = evaluate({
      changedFiles: [reportPath],
      reports: { [reportPath]: `${validReport}\n원본 위치: ${localPath}` },
    });

    assert.equal(result.ok, false);
    assert.match(result.errors.join("\n"), /로컬 절대 경로/);
  }
});

test("삭제된 보고서는 head에서 읽지 않는다", () => {
  const deletedReport = "docs/performance/reports/deleted-01.md";
  const result = evaluatePerformanceReportPolicy({
    changedFiles: ["apps/mobile/src/app/App.tsx", deletedReport],
    changedHeadFiles: ["apps/mobile/src/app/App.tsx"],
    trackedFiles: [],
    readFile: () => {
      throw new Error("deleted report must not be read");
    },
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /성능 보고서/);
});
