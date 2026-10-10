// 저장소 트리를 읽어 스크롤 바 규칙 위반을 모읍니다. 파일 시스템을 읽습니다.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { scrollBarPolicy, scrollBarViolationsFrom } from "./policy.mjs";
import { scrollElementsIn } from "./scan.mjs";

/**
 * @param {string} repoRoot 절대 경로
 * @param {any} ts typescript 모듈
 * @returns {{ files: number, elements: number, failures: string[] }}
 *   files = 읽은 `.tsx` 파일 수, elements = 찾은 스크롤 요소 수,
 *   failures 한 줄 = "<저장소 상대 경로>:<줄> <message>"
 */
export function scrollBarReport(repoRoot, ts) {
  let files = 0;
  let elements = 0;
  /** @type {string[]} */
  const failures = [];

  for (const root of scrollBarPolicy.roots) {
    const rootDir = path.join(repoRoot, root);
    if (!existsSync(rootDir)) {
      failures.push(`${root}: 스캔 루트 폴더가 없습니다.`);
      continue;
    }
    const names = readdirSync(rootDir, { withFileTypes: true, recursive: true })
      .filter(
        (entry) =>
          entry.isFile() &&
          entry.name.endsWith(".tsx") &&
          !scrollBarPolicy.excludedFile.test(entry.name),
      )
      .map((entry) =>
        path.relative(repoRoot, path.join(entry.parentPath, entry.name)).split(path.sep).join("/"),
      )
      .sort();

    for (const fileName of names) {
      files += 1;
      const found = scrollElementsIn(
        readFileSync(path.join(repoRoot, fileName), "utf8"),
        fileName,
        ts,
      );
      elements += found.length;
      for (const violation of scrollBarViolationsFrom(found)) {
        failures.push(`${fileName}:${violation.line} ${violation.message}`);
      }
    }
  }

  if (elements === 0) {
    failures.push("empty-scan: 스크롤 요소를 하나도 찾지 못했습니다. 스캔 루트를 확인하세요.");
  }

  return { files, elements, failures };
}
