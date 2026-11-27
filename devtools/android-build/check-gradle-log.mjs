// CI의 Android build 잡이 Gradle 출력 파일을 넘겨 부르는 얇은 실행 파일입니다. 판정은 kotlin-metadata.mjs가 합니다.
// 사용: node devtools/android-build/check-gradle-log.mjs <gradle 출력 파일>

import { readFileSync } from "node:fs";

import { findKotlinMetadataErrors } from "./kotlin-metadata.mjs";

const path = process.argv[2];
if (!path) {
  console.error("사용: node devtools/android-build/check-gradle-log.mjs <gradle 출력 파일>");
  process.exit(2);
}

const errors = findKotlinMetadataErrors(readFileSync(path, "utf8"));
if (errors.length > 0) {
  console.error(
    `Kotlin metadata 판 불일치 ${errors.length}줄 — lint가 싣는 Kotlin이 의존보다 낮습니다(apps/android/gradle.properties의 lint 판을 보세요):`,
  );
  for (const line of errors) console.error(line);
  process.exit(1);
}
console.log("Kotlin metadata 판 불일치 없음");
