import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "vitest";

import { contractJsonSchemas } from "./json-schema";

const outDir = join(resolve(dirname(fileURLToPath(import.meta.url)), ".."), "json-schema");
const render = (schema: unknown) => `${JSON.stringify(schema, null, 2)}\n`;

// CJ1 — 커밋한 산출물이 계약과 같습니다. 스키마를 고치고 산출물을 다시 뽑지 않으면 ops-dashboard가 옛 계약을 받습니다.
// `UPDATE_COMPANION_JSON_SCHEMA=1`이면 검사 앞에 파일을 다시 씁니다(`json-schema` 스크립트). 글자가 아니라 내용을 견줍니다 —
// `pnpm format`이 JSON의 줄바꿈을 바꿉니다.
test("CJ1. json-schema/의 파일이 계약에서 뽑은 결과와 같다", () => {
  const expected = contractJsonSchemas();
  if (process.env["UPDATE_COMPANION_JSON_SCHEMA"] === "1") {
    mkdirSync(outDir, { recursive: true });
    for (const [name, schema] of Object.entries(expected)) {
      writeFileSync(join(outDir, `${name}.json`), render(schema));
    }
  }
  const files = readdirSync(outDir)
    .filter((file) => file.endsWith(".json"))
    .sort();
  expect(files).toEqual(Object.keys(expected).map((name) => `${name}.json`));
  for (const [name, schema] of Object.entries(expected)) {
    expect(JSON.parse(readFileSync(join(outDir, `${name}.json`), "utf8"))).toEqual(schema);
  }
});
