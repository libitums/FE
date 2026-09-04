const REPORT_DIRECTORY = "docs/performance/reports/";
const REPORT_README = `${REPORT_DIRECTORY}README.md`;

const TEST_FILE_PATTERN =
  /(?:^|\/)(?:__tests__\/|[^/]+\.(?:unit|ui|integration|e2e)?\.?test\.[^/]+$|[^/]+Tests?\.[^/]+$)/i;
const TEST_DIRECTORY_PATTERN = /(?:^|\/)(?:__tests__|tests?|e2e|[^/]+(?:Tests|UITests))(?:\/|$)/;
const DATE_PATTERN =
  /(?:19|20)\d{2}(?:[-_./]\d{1,2}){1,2}|(?:19|20)\d{6}|(?:19|20)\d{2}년\s*\d{1,2}월/;
const ABSOLUTE_LOCAL_PATH_PATTERN =
  /(?:file:\/\/\/[^\s`'"\])]+|(?:^|[\s`'"(=])(?:~\/[^\s`'"\])]+|\/(?!\/)[^\s`'"\]/]+(?:\/[^\s`'"\])]+)+|[A-Za-z]:\\[^\s`'"\])]+(?:\\[^\s`'"\])]+)+))/im;

const REQUIRED_REPORT_FIELDS = ["상태", "대상 commit", "기기", "OS", "Lynx SDK", "빌드"];

const REQUIRED_REPORT_SECTIONS = [
  ["실행 조건", /^##\s+실행 조건\s*$/m],
  ["시나리오", /^##\s+시나리오\s*$/m],
  ["분석 결과", /^##\s+분석 결과\s*$/m],
  ["결론과 후속", /^##\s+결론과 후속\s*$/m],
];

function findSectionBody(content, headingPattern) {
  const reportLines = content.split("\n");
  const start = reportLines.findIndex((line) => headingPattern.test(line));
  if (start === -1) {
    return undefined;
  }
  const nextHeading = reportLines.findIndex((line, index) => index > start && /^##\s+/.test(line));
  const end = nextHeading === -1 ? reportLines.length : nextHeading;
  return reportLines
    .slice(start + 1, end)
    .join("\n")
    .trim();
}

function normalizeMarkdown(value) {
  return value
    .replace(/<!--[^]*?-->/g, "")
    .replace(/^```.*$/gm, "")
    .replace(/[*_~`]/g, "")
    .trim();
}

function isPlaceholder(value) {
  const normalized = normalizeMarkdown(value);
  return (
    normalized === "" ||
    /<[^>]+>/.test(normalized) ||
    /^(?:todo|tbd)\b/i.test(normalized) ||
    /^(?:n\/a|미정|없음|작성(?:\s*필요)?|입력(?:\s*필요)?)(?:\s|—|-|$)/i.test(normalized) ||
    /^-+$/.test(normalized)
  );
}

function metadataValue(section, label) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return section.match(new RegExp(`^-\\s*${escapedLabel}\\s*:\\s*(.*)$`, "m"))?.[1];
}

function hasAffirmativeClaim(content, pattern, allowedContext) {
  return content
    .replace(/(?:하지만|지만|그러나|다만|반면)/g, "$&\n")
    .split(/\n|;|(?<=[.!?])\s+/)
    .map((clause) => normalizeMarkdown(clause))
    .filter((clause) => pattern.test(clause))
    .filter((clause) => !allowedContext?.test(clause))
    .some(
      (clause) =>
        !/(?:아니|않|없(?:다|음|어|고)?|못(?:했|한|하)|금지|말할 수|계산할 수|안 된다|\b(?:not|no)\b)/i.test(
          clause,
        ),
    );
}

export function isUserFacingRuntimeChange(path) {
  if (TEST_DIRECTORY_PATTERN.test(path) || TEST_FILE_PATTERN.test(path)) {
    return false;
  }

  return path.startsWith("apps/mobile/src/") || path.startsWith("apps/ios/");
}

export function isPerformanceReport(path) {
  return (
    path.startsWith(REPORT_DIRECTORY) &&
    !path.slice(REPORT_DIRECTORY.length).includes("/") &&
    path.endsWith(".md") &&
    path !== REPORT_README
  );
}

function validateReport(path, content) {
  const errors = [];
  const filename = path.slice(REPORT_DIRECTORY.length);
  const firstHeading = content.match(/^#\s+(.+)$/m)?.[1] ?? "";

  if (DATE_PATTERN.test(filename)) {
    errors.push(`${path}: 파일명에 날짜를 넣을 수 없습니다.`);
  }
  if (!firstHeading) {
    errors.push(`${path}: 첫 H1 제목이 필요합니다.`);
  } else if (DATE_PATTERN.test(firstHeading)) {
    errors.push(`${path}: 첫 H1 제목에 날짜를 넣을 수 없습니다.`);
  }

  const executionSection = findSectionBody(content, /^##\s+실행 조건\s*$/) ?? "";
  for (const label of REQUIRED_REPORT_FIELDS) {
    const value = metadataValue(executionSection, label);
    if (value === undefined || isPlaceholder(value)) {
      errors.push(`${path}: 실행 조건의 '${label}' 메타데이터가 필요합니다.`);
    }
  }

  for (const [label, pattern] of REQUIRED_REPORT_SECTIONS) {
    const body = findSectionBody(content, pattern);
    if (body === undefined) {
      errors.push(`${path}: '## ${label}' 섹션이 필요합니다.`);
    } else if (isPlaceholder(body)) {
      errors.push(`${path}: '## ${label}' 섹션의 본문을 작성해야 합니다.`);
    }
  }

  const limitationsSection = findSectionBody(content, /^##\s+(?:해석|제한 사항)\s*$/);
  if (!limitationsSection) {
    errors.push(`${path}: '## 해석 또는 제한 사항' 섹션이 필요합니다.`);
  } else if (
    !/(?:한계|제한|단일|미측정|일반화|말할 수 없|판정할 수 없|자료가 없|근거가 없|증거가 아니다|필요)/.test(
      limitationsSection,
    )
  ) {
    errors.push(`${path}: 해석에 측정 한계나 아직 판정할 수 없는 내용을 적어야 합니다.`);
  }

  if (ABSOLUTE_LOCAL_PATH_PATTERN.test(content)) {
    errors.push(`${path}: 로컬 절대 경로를 포함할 수 없습니다.`);
  }

  const state = normalizeMarkdown(metadataValue(executionSection, "상태") ?? "");
  const isUnmeasured = /^미측정(?:\s|—|-|$)/.test(state);
  const claimsBaseline = hasAffirmativeClaim(
    content,
    /\bbaseline\b|베이스라인/i,
    /기능\s*(?:baseline|베이스라인)/i,
  );
  const claimsPass = hasAffirmativeClaim(content, /\bpass(?:ed)?\b|성능\s*통과/i);
  if (isUnmeasured && (claimsBaseline || claimsPass)) {
    errors.push(`${path}: 미측정 보고서를 baseline 또는 성능 통과로 표현할 수 없습니다.`);
  }

  return errors;
}

export function evaluatePerformanceReportPolicy({
  changedFiles,
  changedHeadFiles,
  trackedFiles,
  readFile,
}) {
  if (!Array.isArray(changedHeadFiles)) {
    throw new TypeError("changedHeadFiles는 필수 배열입니다.");
  }

  const runtimeChanges = changedFiles.filter(isUserFacingRuntimeChange);
  const changedReports = changedHeadFiles.filter(isPerformanceReport);
  const errors = [];

  if (runtimeChanges.length > 0 && changedReports.length === 0) {
    errors.push(
      "사용자 관찰 가능 앱 변경에는 docs/performance/reports/ 아래 성능 보고서가 하나 이상 필요합니다.",
    );
  }

  const rawCaptures = trackedFiles.filter(
    (path) => path.startsWith(REPORT_DIRECTORY) && /\.(?:json|ndjson)$/i.test(path),
  );
  for (const path of rawCaptures) {
    errors.push(`${path}: 원본 JSON/NDJSON 캡처를 커밋할 수 없습니다.`);
  }

  for (const path of changedReports) {
    const content = readFile(path);
    if (typeof content !== "string") {
      errors.push(`${path}: 보고서 내용을 읽을 수 없습니다.`);
      continue;
    }
    errors.push(...validateReport(path, content));
  }

  const applicable = runtimeChanges.length > 0;
  const ok = errors.length === 0;
  let message;
  if (!applicable && changedReports.length === 0 && rawCaptures.length === 0) {
    message = "성능 보고서 정책 적용 대상 아님: 사용자 관찰 가능 앱 변경이 없습니다.";
  } else if (ok) {
    message = `성능 보고서 정책 통과: 런타임 변경 ${runtimeChanges.length}개, 보고서 ${changedReports.length}개.`;
  } else {
    message = `성능 보고서 정책 실패: ${errors.length}개 위반.`;
  }

  return {
    applicable,
    changedReports,
    errors,
    message,
    ok,
    runtimeChanges,
  };
}
