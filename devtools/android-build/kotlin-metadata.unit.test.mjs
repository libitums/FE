// `unit` 계층: Gradle 출력에서 Kotlin metadata 판 불일치를 찾는다.
//
// lintVital*은 의존 jar의 metadata가 자기 Kotlin보다 두 판 이상 새로우면 `e:` 줄을 내고도 빌드를 통과시킨다
// (play-services-ads 25.5.0 = metadata 2.3.0, AGP 8.9.2의 lint = Kotlin 2.1.0). CI는 이 판정으로 그 줄을 실패로 바꾼다.

import assert from "node:assert/strict";
import test from "node:test";

import { findKotlinMetadataErrors } from "./kotlin-metadata.mjs";

const MISMATCH =
  "e: file:///home/runner/.gradle/caches/8.11.1/transforms/abc/transformed/play-services-ads-25.5.0/jars/classes.jar!/META-INF/x.kotlin_module Module was compiled with an incompatible version of Kotlin. The binary version of its metadata is 2.3.0, expected version is 2.1.0.";

test("KM1. lintVital이 낸 metadata 불일치 줄을 모두 입력 순서대로 찾는다", () => {
  const second = MISMATCH.replace("x.kotlin_module", "y.kotlin_module");
  const log = [
    "> Task :app:lintVitalAnalyzeBundled",
    MISMATCH,
    second,
    "BUILD SUCCESSFUL in 1m",
  ].join("\n");
  assert.deepEqual(findKotlinMetadataErrors(log), [MISMATCH, second]);
});

test("KM2. CRLF 줄바꿈이어도 줄 끝의 \\r을 남기지 않는다", () => {
  assert.deepEqual(
    findKotlinMetadataErrors(`> Task :app:lintVitalAnalyzeRelease\r\n${MISMATCH}\r\n`),
    [MISMATCH],
  );
});

test("KM3. 불일치가 없는 빌드 출력은 빈 목록이다", () => {
  const log = [
    "> Task :app:lintVitalAnalyzeBundled",
    "Note: Some input files use or override a deprecated API.",
    "BUILD SUCCESSFUL in 1m",
  ].join("\n");
  assert.deepEqual(findKotlinMetadataErrors(log), []);
  assert.deepEqual(findKotlinMetadataErrors(""), []);
});

test("KM4. 같은 문구가 `e:` 진단이 아닌 줄(로그 인용 · 설명)에 있으면 세지 않는다", () => {
  const quoted = `  note: earlier run printed "Module was compiled with an incompatible version of Kotlin"`;
  assert.deepEqual(findKotlinMetadataErrors(quoted), []);
});
