// 콘텐츠 버킷(Supabase public bucket `content`)의 그림 하나를 랜딩 사본 자리로 받습니다. 바이트 그대로, 재인코딩 없음.
//
//   node scripts/fetch-content-image.mjs images/u11-bookstore/pre-3.webp
//
// 받는 곳: src/assets/content/<경로>. 버킷 주소는 PUBLIC_SUPABASE_URL(없으면 apps/mobile/.env.local의 같은 키)에서 읽습니다.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const landingRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentPath = process.argv[2]?.replace(/^content\//, "");
if (!contentPath || !/^images\/[\w.-]+\/[\w.-]+\.webp$/.test(contentPath)) {
  console.error("usage: node scripts/fetch-content-image.mjs images/<unit>/<file>.webp");
  process.exit(2);
}

async function supabaseUrl() {
  if (process.env.PUBLIC_SUPABASE_URL) return process.env.PUBLIC_SUPABASE_URL;
  const envFile = path.resolve(landingRoot, "../mobile/.env.local");
  const text = await readFile(envFile, "utf8").catch(() => "");
  const match = /^PUBLIC_SUPABASE_URL=(\S+)/m.exec(text);
  if (!match) throw new Error(`PUBLIC_SUPABASE_URL is not set and ${envFile} has none`);
  return match[1];
}

const base = (await supabaseUrl()).replace(/\/$/, "");
const url = `${base}/storage/v1/object/public/content/${contentPath}`;
const response = await fetch(url);
if (!response.ok) throw new Error(`${response.status} ${response.statusText} — ${url}`);
const bytes = new Uint8Array(await response.arrayBuffer());
const target = path.join(landingRoot, "src/assets/content", contentPath);
await mkdir(path.dirname(target), { recursive: true });
await writeFile(target, bytes);
console.log(`${bytes.byteLength} bytes → ${path.relative(landingRoot, target)}`);
