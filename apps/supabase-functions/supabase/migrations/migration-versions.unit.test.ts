// 마이그레이션 판 번호는 파일 이름 앞 14자리이고 `supabase_migrations.schema_migrations`의 기본 키다 — 두 파일이 같은 번호를 쓰면
// 운영 기록에 하나만 남고, 뒤의 `supabase db push`가 다른 하나를 이미 적용된 것으로 보거나 다시 올린다(2026-11-25 0107 겹침).

import { readdirSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

const dir = resolve(import.meta.dirname, ".");
const files = readdirSync(dir).filter((name) => name.endsWith(".sql"));

describe("마이그레이션 판 번호", () => {
  test("MV1. 모든 파일이 14자리 번호 + 밑줄 + 이름이다", () => {
    expect(files.length).toBeGreaterThan(0); // 경로가 틀려 빈 목록이면 아무것도 보지 않고 통과하지 않게
    expect(files.filter((name) => !/^\d{14}_[a-z0-9_]+\.sql$/.test(name))).toEqual([]);
  });

  test("MV2. 두 파일이 같은 번호를 쓰지 않는다", () => {
    const seen = new Map<string, string[]>();
    for (const name of files) {
      const version = name.slice(0, 14);
      const names = seen.get(version) ?? [];
      names.push(name);
      seen.set(version, names);
    }
    expect([...seen.values()].filter((names) => names.length > 1)).toEqual([]);
  });
});
