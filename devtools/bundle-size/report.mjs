// PR마다 다는 번들 크기 증감 보고입니다(ADR-0149). 게이트가 아니라 감지기 — 이 PR이 main보다
// 무엇을 얼마나 키웠는지 보입니다. 파일을 읽지 않고 크기 목록만 받습니다(`budget.mjs`와 같은 이유).

import { formatBytes } from "./budget.mjs";

/** PR 댓글을 찾아 고쳐 쓰는 표식입니다. 댓글 첫 줄에 둡니다. */
export const REPORT_MARKER = "<!-- bundle-size-report -->";

/**
 * 대상마다 main(`base`) · 이 PR(`head`) 크기와 증감, 천장(`maxBytes`)까지 남은 양을 냅니다.
 * `base`나 그 안의 값이 없으면 증감은 `null`입니다 — main 기록이 없을 때도 보고는 섭니다.
 */
export function compareSizes({ targets, base, head }) {
  return targets.map(({ path, maxBytes }) => {
    const baseBytes = typeof base?.[path] === "number" ? base[path] : null;
    const headBytes = typeof head?.[path] === "number" ? head[path] : null;
    const deltaBytes = baseBytes === null || headBytes === null ? null : headBytes - baseBytes;
    return {
      path,
      baseBytes,
      headBytes,
      deltaBytes,
      maxBytes,
      headroomBytes: headBytes === null ? null : maxBytes - headBytes,
    };
  });
}

function deltaText(deltaBytes) {
  if (deltaBytes === null) return "main 기록 없음";
  if (deltaBytes === 0) return "변화 없음";
  const sign = deltaBytes > 0 ? "+" : "−";
  return `${sign}${formatBytes(Math.abs(deltaBytes))}`;
}

function headroomText({ headroomBytes }) {
  if (headroomBytes === null) return "없음";
  return headroomBytes < 0
    ? `**천장 초과 ${formatBytes(-headroomBytes)}**`
    : formatBytes(headroomBytes);
}

/** PR 댓글 · 잡 요약에 쓰는 마크다운 표입니다. */
export function formatSizeReport(rows, { baseRef }) {
  const lines = [
    REPORT_MARKER,
    "### 번들 크기",
    "",
    baseRef
      ? `main(\`${baseRef}\`) 대비 이 PR의 증감입니다. 막는 것은 천장뿐입니다 — 천장은 저사양 기기 첫 실행 시간으로 정합니다(ADR-0149).`
      : "main 크기 기록을 찾지 못해 증감 없이 크기만 보입니다. 막는 것은 천장뿐입니다(ADR-0149).",
    "",
    "| 대상 | main | 이 PR | 증감 | 천장까지 |",
    "|---|--:|--:|--:|--:|",
  ];
  for (const row of rows) {
    lines.push(
      `| \`${row.path}\` | ${formatBytes(row.baseBytes)} | ${formatBytes(row.headBytes)} | ${deltaText(row.deltaBytes)} | ${headroomText(row)} |`,
    );
  }
  return `${lines.join("\n")}\n`;
}
