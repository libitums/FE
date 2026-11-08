import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

import { copyDir, expectedCopies, GENERATED_HEADER, toDenoSource } from "./sync.mjs";

// CC1 — 정본을 고치고 사본을 다시 쓰지 않으면 앱과 Edge Function이 다른 계약으로 돕니다. 타입 검사는 둘이 각자
// 일관되면 초록이라 이 어긋남을 잡지 못합니다.
test("CC1. Edge Function 사본이 정본에서 만든 결과와 글자까지 같다", async () => {
  const expected = await expectedCopies();
  const actual = (await readdir(copyDir)).sort();
  assert.deepEqual(actual, [...expected.keys()], "사본 파일 목록 — sync:functions를 다시 돌립니다");
  for (const [name, text] of expected) {
    assert.equal(
      await readFile(join(copyDir, name), "utf8"),
      text,
      `${name} — sync:functions를 다시 돌립니다`,
    );
  }
});

test("CC2. 상대 import에만 .ts를 붙이고 외부 import는 그대로 둔다", () => {
  const source =
    'import { z } from "zod/mini";\nimport { a } from "./a";\nexport { b } from "./b";\n';
  assert.equal(
    toDenoSource(source),
    `${GENERATED_HEADER}import { z } from "zod/mini";\nimport { a } from "./a.ts";\nexport { b } from "./b.ts";\n`,
  );
});

test("CC3. FE 전용 파일(fixture · JSON Schema)은 사본에 없다", async () => {
  const names = [...(await expectedCopies()).keys()];
  assert.ok(names.includes("sse-events.ts"));
  for (const excluded of ["fixtures.ts", "fixtures-streams.ts", "json-schema.ts"]) {
    assert.ok(!names.includes(excluded), excluded);
  }
});
