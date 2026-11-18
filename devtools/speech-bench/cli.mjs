#!/usr/bin/env node
// 음성 벤더 비교 도구의 명령줄. 사용법은 README.md를 보세요.
//
//   node devtools/speech-bench/cli.mjs <validate|convert|sample|estimate|run|report> [옵션]
//
// 녹음 · 매니페스트 · 결과는 저장소 밖 경로를 받습니다. 결과 경로가 저장소 안이면 멈춥니다.

import { readFileSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { convertFolder } from "./aihub.mjs";
import { hasFfmpeg } from "./audio.mjs";
import { estimateAll, formatEstimate, loadPrices } from "./costs.mjs";
import { countBy, loadManifest, stratifiedSample, writeManifest } from "./manifest.mjs";
import { buildReport, loadRuns } from "./report.mjs";
import { readResults, resultsPath, runVendor } from "./runner.mjs";
import { ADAPTERS, adapterById, missingEnv } from "./vendors.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
export const REPO_ROOT = resolve(HERE, "../..");

const OPTIONS = {
  manifest: { type: "string" },
  labels: { type: "string" },
  audio: { type: "string" },
  mapping: { type: "string" },
  out: { type: "string" },
  n: { type: "string" },
  seed: { type: "string" },
  by: { type: "string" },
  vendors: { type: "string" },
  prices: { type: "string" },
  "env-file": { type: "string" },
  "via-stt": { type: "string" },
  via: { type: "boolean" },
  yes: { type: "boolean" },
  "retry-failed": { type: "boolean" },
  concurrency: { type: "string" },
  "interval-ms": { type: "string" },
  "max-attempts": { type: "string" },
};

/** 저장소 안 경로면 true. 오디오 · 결과를 저장소에 두지 않으려는 문입니다. */
export function insideRepo(path, root = REPO_ROOT) {
  const rel = relative(root, resolve(path));
  return rel === "" || (!rel.startsWith("..") && !rel.startsWith("/"));
}

function requireOutside(path, what) {
  if (!path) throw new Error(`--${what}가 필요합니다`);
  if (insideRepo(path))
    throw new Error(`${what} 경로가 저장소 안입니다(${path}). 녹음 · 결과는 저장소 밖에 두세요.`);
  return resolve(path);
}

function pickAdapters(list) {
  if (!list) return ADAPTERS;
  return list.split(",").map((id) => {
    const a = adapterById(id.trim());
    if (!a)
      throw new Error(`모르는 벤더: ${id}. 가능한 것: ${ADAPTERS.map((x) => x.id).join(", ")}`);
    return a;
  });
}

/** 명령 하나를 실행합니다. deps로 fetch · env · 출력 등을 바꿔 끼울 수 있습니다(테스트). */
export async function main(argv, deps = {}) {
  const print = deps.print ?? console.log;
  const env = deps.env ?? process.env;
  const [command, ...rest] = argv;
  const { values: o } = parseArgs({ args: rest, options: OPTIONS, allowPositionals: false });
  const pricesPath = o.prices ?? resolve(HERE, "prices.json");

  if (command === "validate") {
    const entries = loadManifest(o.manifest);
    print(`통과: 발화 ${entries.length}개 · 유형 ${JSON.stringify(countBy(entries, "type"))}`);
    return 0;
  }

  if (command === "convert") {
    const out = requireOutside(o.out, "out");
    const mapping = JSON.parse(
      readFileSync(o.mapping ?? resolve(HERE, "aihub-mapping.default.json"), "utf8"),
    );
    const { entries, problems, stats } = convertFolder({
      labelsDir: resolve(o.labels),
      audioDir: resolve(o.audio),
      mapping,
    });
    writeManifest(out, entries);
    writeFileSync(`${out}.problems.json`, JSON.stringify(problems, null, 2));
    print(
      `라벨 파일 ${stats.files} · 라벨 ${stats.labels} → 매니페스트 ${entries.length}줄 (${out})`,
    );
    print(
      `문제 ${problems.length}건(오디오 없음 ${stats.missingAudio}) → ${out}.problems.json · 유형을 추정한 라벨 ${stats.typeGuessed}`,
    );
    if (!o.mapping)
      print("주의: 기본 매핑은 추정입니다. 받은 라벨을 보고 --mapping으로 고친 매핑을 주세요.");
    return 0;
  }

  if (command === "sample") {
    const out = requireOutside(o.out, "out");
    const entries = loadManifest(o.manifest);
    const by = (o.by ?? "l1,proficiency,type").split(",").map((s) => s.trim());
    const picked = stratifiedSample(entries, {
      n: Number(o.n ?? 300),
      seed: Number(o.seed ?? 1),
      by,
    });
    // 표본 매니페스트가 다른 폴더에 있어도 오디오를 찾게 절대 경로로 씁니다.
    writeManifest(out, picked);
    print(`표본 ${picked.length}개 (시드 ${o.seed ?? 1}, 층: ${by.join(" × ")}) → ${out}`);
    for (const key of by) print(`  ${key}: ${JSON.stringify(countBy(picked, key))}`);
    return 0;
  }

  if (command === "estimate" || command === "run") {
    if (command === "run" && o.out) requireOutside(o.out, "out"); // 비용을 보이기 전에 먼저 막습니다.
    const entries = loadManifest(o.manifest);
    if (o["env-file"]) {
      if (insideRepo(o["env-file"])) throw new Error("키 파일은 저장소 밖에 두세요(--env-file).");
      (deps.loadEnvFile ?? process.loadEnvFile)(resolve(o["env-file"]));
    }
    const chosen = pickAdapters(o.vendors);
    const ready = [];
    for (const adapter of chosen) {
      const missing = missingEnv(adapter, env);
      if (missing.length) print(`건너뜀: ${adapter.id} — 빠진 환경 변수: ${missing.join(", ")}`);
      else ready.push(adapter);
    }
    const prices = loadPrices(pricesPath);
    const targets = command === "estimate" ? chosen : ready;
    print(
      `\n예상 비용 (${command === "estimate" ? "고른 벤더 전부" : "키가 있는 벤더"}, 단가: ${pricesPath})\n`,
    );
    print(
      formatEstimate(
        estimateAll(targets, entries, prices, { via: Boolean(o.via || o["via-stt"]) }),
        prices.currency,
      ),
    );
    if (command === "estimate") return 0;

    const ffmpeg = deps.ffmpeg ?? hasFfmpeg();
    print(
      `\nffmpeg: ${ffmpeg ? "있음 — 16kHz mono WAV가 아니면 변환합니다" : "없음 — 변환하지 않고, WAV 16kHz만 받는 벤더는 그 발화를 건너뜁니다"}`,
    );
    if (ready.length === 0) {
      print(
        "돌릴 벤더가 없습니다(키 없음). env.example을 보고 저장소 밖 키 파일을 --env-file로 주세요.",
      );
      return 1;
    }
    if (!o.yes) {
      print("\n실제 호출은 하지 않았습니다. 위 비용을 확인한 뒤 --yes를 붙여 다시 실행하세요.");
      return 0;
    }
    const outDir = requireOutside(o.out, "out");
    const common = {
      entries,
      outDir,
      env,
      fetch: deps.fetch ?? globalThis.fetch,
      ffmpeg,
      concurrency: Number(o.concurrency ?? 2),
      minIntervalMs: Number(o["interval-ms"] ?? 250),
      maxAttempts: Number(o["max-attempts"] ?? 3),
      retryFailed: Boolean(o["retry-failed"]),
      sleep: deps.sleep,
      now: deps.now,
      readAudio: deps.readAudio,
      log: deps.log ?? (() => {}),
    };
    // STT 먼저 — 우회 평가가 그 결과를 씁니다.
    const ordered = [
      ...ready.filter((a) => a.task === "stt"),
      ...ready.filter((a) => a.task === "pron"),
    ];
    for (const adapter of ordered) {
      const s = await runVendor({ ...common, adapter });
      print(
        `${s.id}: 새로 ${s.total}개 — 성공 ${s.ok} · 실패 ${s.failed} · 건너뜀 ${s.skipped} (이미 한 것 ${s.alreadyDone})`,
      );
    }
    if (o["via-stt"]) {
      const stt = readResults(resultsPath(outDir, o["via-stt"]));
      if (stt.size === 0) print(`우회 평가 생략: ${o["via-stt"]}의 STT 결과가 없습니다.`);
      const viaTranscripts = new Map(
        [...stt.values()].filter((r) => r.ok).map((r) => [r.id, r.transcript]),
      );
      for (const adapter of ready.filter((a) => a.task === "pron")) {
        if (stt.size === 0) break;
        const s = await runVendor({ ...common, adapter, viaStt: o["via-stt"], viaTranscripts });
        print(
          `${s.id}: 새로 ${s.total}개 — 성공 ${s.ok} · 실패 ${s.failed} · 건너뜀 ${s.skipped} (이미 한 것 ${s.alreadyDone})`,
        );
      }
    }
    print(
      `\n보고서: node devtools/speech-bench/cli.mjs report --manifest ${o.manifest} --out ${outDir}`,
    );
    return 0;
  }

  if (command === "report") {
    const outDir = requireOutside(o.out, "out");
    const md = buildReport({
      entries: loadManifest(o.manifest),
      runs: loadRuns(outDir),
      prices: loadPrices(pricesPath),
      generatedAt: new Date((deps.now ?? Date.now)()).toISOString(),
    });
    writeFileSync(resolve(outDir, "report.md"), md);
    print(`보고서 → ${resolve(outDir, "report.md")}`);
    return 0;
  }

  print("명령: validate | convert | sample | estimate | run | report  (README.md 참고)");
  return command ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (error) => {
      console.error(error.message);
      process.exit(1);
    },
  );
}
