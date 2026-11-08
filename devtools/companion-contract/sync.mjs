// 컴패니언 계약 패키지의 정본(`packages/companion-contract/src`)을 Edge Function이 읽는 사본
// (`apps/supabase-functions/supabase/functions/_shared/companion-contract/`)으로 옮깁니다.
// Supabase 배포가 `supabase/functions` 밖 파일을 싣는다고 기대하지 않으려고 사본을 둡니다. 상대 import에는 Deno가
// 요구하는 `.ts`를 붙이고, 외부 import(`zod/mini`)는 그대로 둡니다 — Deno에서는 import map이 그 이름을 잇습니다.
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const sourceDir = join(root, "packages", "companion-contract", "src");
export const copyDir = join(
  root,
  "apps",
  "supabase-functions",
  "supabase",
  "functions",
  "_shared",
  "companion-contract",
);

// 서버가 쓰지 않는 파일입니다. fixture는 FE 재생용이고, JSON Schema 산출은 Node에서만 돕니다.
const SERVER_EXCLUDED = new Set(["fixtures.ts", "fixtures-streams.ts", "json-schema.ts"]);

export const GENERATED_HEADER =
  "// 생성 파일입니다 — 고치지 않습니다. 정본은 packages/companion-contract/src이고\n" +
  "// `pnpm --filter @libitums/companion-contract sync:functions`가 다시 씁니다.\n";

const isServerSource = (name) =>
  name.endsWith(".ts") && !name.endsWith(".test.ts") && !SERVER_EXCLUDED.has(name);

/** 정본 글자를 사본 글자로 바꿉니다. 순수 함수입니다. */
export function toDenoSource(text) {
  return GENERATED_HEADER + text.replace(/(from\s+["'])(\.\/[^"']+?)(["'])/g, "$1$2.ts$3");
}

/** 사본 파일 이름 → 기대 글자입니다. 이름 순입니다. */
export async function expectedCopies(dir = sourceDir) {
  const names = (await readdir(dir)).filter(isServerSource).sort();
  const out = new Map();
  for (const name of names) out.set(name, toDenoSource(await readFile(join(dir, name), "utf8")));
  return out;
}

export async function syncCompanionContract() {
  const copies = await expectedCopies();
  await rm(copyDir, { recursive: true, force: true });
  await mkdir(copyDir, { recursive: true });
  for (const [name, text] of copies) await writeFile(join(copyDir, name), text);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await syncCompanionContract();
}
