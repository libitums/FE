// 미션 파일(`supabase/functions/_shared/missions/*.json`, 정본)을 검증해 서버 표로 올립니다 — `public.companion_upsert_mission`(서버 키 전용).
// 기본은 `--dry-run`(검증과 할 일 출력만, 네트워크 없음)이고, 실제로 쓰려면 `--write`가 필요합니다.
//
//   node apps/supabase-functions/scripts/upload-missions.ts              # 검증만(기본 dry-run)
//   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node apps/supabase-functions/scripts/upload-missions.ts --write
//
// 판(version)은 내용을 바꾸면 올립니다 — 같은 판에 다른 내용이면 SQL이 거절합니다(22023). 같은 내용이면 `changed: false`.
// **운영 적용은 사람이 합니다. 운영 DB에는 1단계 마이그레이션 기록이 정리될 때까지 2단계를 적용하지 않습니다(PRD §0.9).**

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { validateMission } from "../supabase/functions/_shared/mission-definition.ts";
import { serviceKeyHeaders } from "../supabase/functions/_shared/service-key.ts";

const { values } = parseArgs({
  options: {
    write: { type: "boolean", default: false },
    "dry-run": { type: "boolean", default: false },
    dir: { type: "string" },
  },
});
const dir =
  values.dir ?? fileURLToPath(new URL("../supabase/functions/_shared/missions/", import.meta.url));
const write = values.write === true && values["dry-run"] !== true;

const files = readdirSync(dir)
  .filter((name) => name.endsWith(".json"))
  .sort();
const missions = [];
let invalid = 0;
for (const name of files) {
  const result = validateMission(JSON.parse(readFileSync(join(dir, name), "utf8")));
  if (!result.ok) {
    invalid += 1;
    console.error(`✗ ${name}\n  ${result.errors.join("\n  ")}`);
    continue;
  }
  missions.push(result.mission);
  console.log(`✓ ${name} — ${result.mission.id} v${result.mission.version}`);
}
if (invalid > 0) {
  console.error(`미션 파일 ${invalid}개가 검증을 지나지 못했습니다. 아무것도 올리지 않습니다.`);
  process.exit(1);
}
if (!write) {
  console.log(`dry-run: ${missions.length}개를 올릴 수 있습니다. 실제로 쓰려면 --write.`);
  process.exit(0);
}

const url = process.env["SUPABASE_URL"]?.trim().replace(/\/+$/, "");
const key = process.env["SUPABASE_SERVICE_ROLE_KEY"]?.trim();
if (!url || !key) {
  console.error("SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY가 필요합니다.");
  process.exit(1);
}
for (const mission of missions) {
  const response = await fetch(`${url}/rest/v1/rpc/companion_upsert_mission`, {
    method: "POST",
    headers: { ...serviceKeyHeaders(key), "Content-Type": "application/json" },
    body: JSON.stringify({ p_definition: mission }),
  });
  const text = await response.text();
  if (!response.ok) {
    console.error(`✗ ${mission.id} v${mission.version} → ${response.status} ${text}`);
    process.exit(1);
  }
  console.log(`↑ ${mission.id} v${mission.version} → ${text}`);
}
