// 친구 스토리 AI 생성(ADR-0192)을 실제 모델로 한 바퀴 돌려 보는 실행기 — 평가 전용, 운영 DB · 버킷에 닿지 않는다.
// 내장 Postgres에 마이그레이션을 올리고(인물 카드 · 빈도는 운영과 같다), 운영 함수의 핸들러를 그대로 부른다:
//   소재 조사(웹 검색) → 한 주 기획(중앙 배정 · 컷 배정 · 인물별 초안) → 기획 승인 → 그림 일꾼(장면 설계 · 엔진 · 검사 · 문구 맞추기) →
//   최종 승인(번역) → 그날 올림.
// 기준 그림 묶음은 로컬 폴더(`EVAL_REFS_DIR` — ops-dashboard가 만든 `v2/<slug>/…`)에서 읽고, 그린 그림은 `supabase/evals/out/friend-stories/`에 쓴다.
//
// ANTHROPIC_API_KEY=… OPENAI_API_KEY=… EVAL_REFS_DIR=… npx vitest run supabase/evals/friend-stories.eval
//   EVAL_WEEK(기본 2026-11-30) · EVAL_CHARACTERS(기본 duksu,mina,seoyeon,jaemin) · EVAL_PLAN_MODEL(기본 Sonnet 5.5) ·
//   EVAL_IMAGES(그릴 장 수, 기본 4 — 0이면 글만) · EVAL_RESEARCH(off면 조사 건너뜀) · EVAL_TAG(출력 파일 이름).

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { expect, test } from "vitest";

import type { ChatSendEnv } from "../functions/_shared/chat-send.contract.ts";
import type { MediaEnv } from "../functions/_shared/companion-media-env.ts";
import { anthropicStoryCaptioner } from "../functions/_shared/companion-story-caption.ts";
import { createStoryImagesHandler } from "../functions/_shared/companion-story-images-handler.ts";
import { createStudioHandler } from "../functions/_shared/companion-story-studio-handler.ts";
import {
  anthropicStudioLlm,
  defaultStoryPlanModel,
  defaultStoryTranslateModel,
} from "../functions/_shared/companion-story-studio-llm.ts";
import type { Outbound } from "../functions/_shared/delete-account.contract.ts";
import { startTestDatabase } from "../migrations/postgres.test-support";
import { apiKey, envList, envText } from "./eval-support.ts";

const SUPA = "https://eval.supabase.co";
const KEY = "eval-service-key";
const here = dirname(fileURLToPath(import.meta.url));
const tag = envText("EVAL_TAG", "run-1");
const outDir = join(here, "out", "friend-stories", tag);
const refsDir = envText("EVAL_REFS_DIR", "");
const openaiKey = process.env["OPENAI_API_KEY"]?.trim() ?? "";
const week = envText("EVAL_WEEK", "2026-11-30");
const characters = envList("EVAL_CHARACTERS", ["duksu", "mina", "seoyeon", "jaemin"]);
const planModel = envText("EVAL_PLAN_MODEL", defaultStoryPlanModel);
const imageCount = Number(envText("EVAL_IMAGES", "4"));
// 덕수쌤의 「카탈로그 단어」 표본 — 운영에서는 운영 도구가 실제 카탈로그를 준다.
const SAMPLE_CATALOG = [
  "물",
  "커피",
  "김치찌개",
  "지하철",
  "시장",
  "날씨",
  "춥다",
  "따뜻하다",
  "맛있다",
  "좋아하다",
  "공부하다",
  "주말",
  "친구",
  "선물",
  "눈",
].map((ko, index) => ({ ko, episodeId: "sample", ref: `voca:sample-${index}` }));

type Draft = {
  id: string;
  characterId: string;
  publishOn: string;
  status: string;
  topic: string;
  note: string;
  line: { ko: string; roman: string; meaning: Record<string, string> };
  replies: string[];
  word: { ko?: string } | null;
  shot: string;
  scene: string;
  imagePath: string | null;
  imageError: string | null;
  imageMeta: Record<string, unknown>;
};

test.skipIf(apiKey === "")(
  "친구 스토리 한 주 — 조사 · 초안 · 그림 · 승인",
  { timeout: 1_800_000 },
  async () => {
    mkdirSync(outDir, { recursive: true });
    const db = await startTestDatabase();
    const server = await db.connect();
    await server.query("set role service_role");
    try {
      await db.admin.query("update companion.characters set active = true");
      await db.admin.query(
        "update companion.settings set friend_stories = 'on', story_schedule = 'cadence'",
      );
      // 기준 그림이 있는 것처럼 — 실제 파일은 아래 fetch가 로컬 폴더에서 준다.
      if (refsDir !== "") {
        await db.admin.query(
          "insert into storage.buckets (id, name) values ('companion-refs', 'companion-refs') on conflict do nothing",
        );
        await db.admin.query(
          `insert into storage.objects (bucket_id, name)
           select 'companion-refs', 'v2/' || case when id = 'duksu' then 'deoksu' else id end || '/manifest.json' from companion.characters`,
        );
      }
      const outbound: Outbound = async (request) => {
        const fn = request.url.split("/rest/v1/rpc/")[1];
        if (fn === undefined || !/^[a-z_]+$/.test(fn)) return { status: 404, text: async () => "" };
        const args = JSON.parse(request.body ?? "{}") as Record<string, unknown>;
        const names = Object.keys(args);
        const isJson = (value: unknown) => typeof value === "object" && value !== null;
        const sql = `select public.${fn}(${names
          .map((name, i) => `${name} => $${i + 1}${isJson(args[name]) ? "::jsonb" : ""}`)
          .join(", ")}) as r`;
        const result = await server.query(
          sql,
          names.map((name) => (isJson(args[name]) ? JSON.stringify(args[name]) : args[name])),
        );
        return { status: 200, text: async () => JSON.stringify(result.rows[0].r ?? null) };
      };
      const saved: string[] = [];
      const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.startsWith(`${SUPA}/storage/v1/object/companion-refs/`)) {
          const name = decodeURIComponent(
            url.slice(`${SUPA}/storage/v1/object/companion-refs/`.length),
          );
          if (name.includes("..")) return new Response("", { status: 400 });
          try {
            return new Response(new Blob([readFileSync(join(refsDir, name)) as BlobPart]), {
              status: 200,
            });
          } catch {
            return new Response("", { status: 404 });
          }
        }
        if (url.startsWith(`${SUPA}/storage/v1/object/content`)) {
          if (init?.method === "DELETE") return new Response("[]", { status: 200 });
          const name = url.split("/").slice(-2).join("-");
          const blob = init?.body;
          if (!(blob instanceof Blob)) return new Response("", { status: 400 });
          const bytes = new Uint8Array(await blob.arrayBuffer());
          writeFileSync(join(outDir, name), bytes);
          saved.push(name);
          return new Response("{}", { status: 200 });
        }
        if (url.startsWith(SUPA)) return new Response("", { status: 404 });
        return fetch(input, init);
      }) as typeof fetch;

      const env: ChatSendEnv = {
        supabaseUrl: SUPA,
        supabaseAnonKey: "anon",
        supabaseServiceRoleKey: KEY,
        llm: { kind: "fake" },
        translation: "every",
      };
      const usage: Record<string, number> = {};
      const studio = createStudioHandler({
        env,
        outbound,
        llm: anthropicStudioLlm({
          apiKey,
          planModel,
          translateModel: defaultStoryTranslateModel,
        }),
        nowMs: () => Date.now(),
        log: () => {},
        researchTimeoutMs: 300_000,
        writeTimeoutMs: 300_000,
        assignTimeoutMs: 300_000,
      });
      const call = async (body: Record<string, unknown>) => {
        const started = Date.now();
        const response = await studio(
          new Request("https://fn/companion-story-studio", {
            method: "POST",
            headers: { authorization: `Bearer ${KEY}` },
            body: JSON.stringify({ ...body, by: "eval" }),
          }),
        );
        const key = `${String(body["action"])}${body["characterId"] ? `:${String(body["characterId"])}` : ""}`;
        usage[key] = Date.now() - started;
        return (await response.json()) as Record<string, unknown>;
      };

      // 최종 승인한 초안이 그날 올라갔는가(그림을 그리지 않은 실행은 null).
      let postedGenerated: boolean | null = null;
      const lines: string[] = [
        `# 친구 스토리 한 주 — ${week} (${tag})`,
        "",
        `- 기획 모델: ${planModel} · 그림 노드: claude-haiku-5-5 · 인물: ${characters.join(", ")}`,
        "",
      ];

      // 1. 소재 조사
      if (envText("EVAL_RESEARCH", "on") !== "off") {
        const found = await call({ action: "research", week });
        const plan = found["plan"] as
          | { research?: string; sources?: { title: string; url: string }[] }
          | undefined;
        lines.push(
          `## 1. 소재 조사 (${found["result"]}, ${Math.round(usage["research"]! / 1000)}초)`,
          "",
        );
        lines.push(plan?.research ?? "(없음)", "", "출처:");
        for (const source of plan?.sources ?? []) lines.push(`- [${source.title}](${source.url})`);
        lines.push("");
      }

      // 2. 한 주 기획 — 중앙 배정 + 인물별 초안(컷은 코드가 비율대로)
      const planned = await call({
        action: "plan_week",
        from: week,
        days: 7,
        catalog: SAMPLE_CATALOG,
      });
      const all = ((planned["drafts"] ?? []) as Draft[]).filter((d) =>
        characters.includes(d.characterId),
      );
      const kinds = { selfie: 0, other: 0, scene: 0 } as Record<string, number>;
      for (const d of (planned["drafts"] ?? []) as Draft[])
        kinds[d.shot] = (kinds[d.shot] ?? 0) + 1;
      lines.push(
        `## 2. 한 주 기획 (${planned["result"]}, ${Math.round(usage["plan_week"]! / 1000)}초)`,
        "",
        `- 초안 ${((planned["drafts"] ?? []) as Draft[]).length}개 · 건너뜀 ${planned["skipped"]} · 실패한 인물 ${JSON.stringify(planned["failed"] ?? [])}`,
        `- 컷: 셀카 ${kinds["selfie"]} · 남이 찍어 준 컷 ${kinds["other"]} · 인물 없음 ${kinds["scene"]}`,
        "",
        "| 인물 | 날 | 한 줄 | 뜻 | 단어 | 컷 | 그림 주문 | 소재 · 메모 |",
        "| --- | --- | --- | --- | --- | --- | --- | --- |",
      );
      for (const d of (planned["drafts"] ?? []) as Draft[])
        lines.push(
          `| ${d.characterId} | ${d.publishOn.slice(5)} | ${d.line.ko}<br><sub>${d.line.roman}</sub> | ${d.line.meaning["en"]} | ${d.word?.ko ?? "-"} | ${d.shot} | ${d.scene} | ${d.topic} — ${d.note} |`,
        );
      lines.push("");
      expect(all.length).toBeGreaterThan(0);

      // 3. 기획 승인 → 그림
      const listed = (await call({ action: "drafts", from: week, to: "2026-12-31" }))[
        "drafts"
      ] as Draft[];
      // 컷 종류마다 고르게.
      const byKind = (kind: string) => listed.filter((d) => d.shot === kind);
      const want: Draft[] = [];
      for (let i = 0; want.length < imageCount && i < listed.length; i += 1)
        for (const kind of ["selfie", "other", "scene"]) {
          const pick = byKind(kind)[i];
          if (pick !== undefined && want.length < imageCount) want.push(pick);
        }
      if (want.length > 0 && openaiKey !== "") {
        for (const d of want) await call({ action: "review", id: d.id, step: "approve_plan" });
        const mediaEnv: MediaEnv = {
          supabaseUrl: SUPA,
          supabaseAnonKey: "anon",
          supabaseServiceRoleKey: KEY,
          anthropicKey: apiKey,
          snapshotModel: "claude-haiku-5-5",
          snapshotCheck: true,
          snapshotPartialImages: 0,
          snapshotRefs: "all",
          snapshotComplexity: null,
          snapshotPipeline: "v2m",
          openaiKey,
          elevenKey: null,
        };
        const images = createStoryImagesHandler({
          env: mediaEnv,
          bucket: "content",
          outbound,
          fetch: fetchImpl,
          caption: anthropicStoryCaptioner({ apiKey, model: planModel }),
          nowMs: () => Date.now(),
          log: (entry) => lines.push(`<!-- ${entry.outcome} -->`),
        });
        for (let round = 0; round < want.length * 2; round += 1) {
          const response = await images(
            new Request("https://fn/companion-story-images", {
              method: "POST",
              headers: { authorization: `Bearer ${KEY}` },
              body: "{}",
            }),
          );
          const body = (await response.json()) as { claimed?: number };
          if ((body.claimed ?? 0) === 0) break;
        }
        const after = (await call({ action: "drafts", from: week, to: "2026-12-31" }))[
          "drafts"
        ] as Draft[];
        lines.push("## 3. 그림", "");
        for (const d of after.filter((draft) => want.some((w) => w.id === draft.id))) {
          const meta = d.imageMeta as {
            pipeline?: string;
            fallback?: string;
            warnings?: string[];
            verdict?: { reasons?: string; pass?: boolean };
            timings?: Record<string, number>;
            plan?: { shot?: string; angle?: string; expression?: string; setting?: string };
            bytes?: number;
            prompt?: string;
            caption?: { changed?: boolean; draft?: { ko?: string } } | string;
          };
          const file = d.imagePath?.split("/").slice(-2).join("-");
          lines.push(
            `### ${d.characterId} ${d.publishOn.slice(5)} — ${d.status}${d.imageError ? ` (${d.imageError})` : ""}`,
            "",
            `- 한 줄: ${d.line.ko} — ${d.line.meaning["en"]}`,
            `- 문구 맞추기: ${
              typeof meta.caption === "object" && meta.caption?.changed
                ? `고침 (초안: ${meta.caption.draft?.ko})`
                : JSON.stringify(meta.caption ?? null)
            }`,
            `- 주문(${d.shot}): ${d.scene}`,
            `- 길: ${meta.pipeline ?? "-"}${meta.fallback ? ` (대체: ${meta.fallback})` : ""} · 설계: ${meta.plan ? `${meta.plan.shot}, ${meta.plan.angle}, ${meta.plan.expression}` : "-"}`,
            `- 검사: ${meta.verdict?.pass ? "통과" : "탈락"}${meta.warnings ? ` · 경고 ${meta.warnings.join(", ")}` : ""} — ${meta.verdict?.reasons ?? ""}`,
            `- 걸린 시간(ms): ${JSON.stringify(meta.timings ?? {})} · ${meta.bytes ? `${Math.round(meta.bytes / 1024)} KB` : ""}`,
            `- 프롬프트: ${meta.prompt ?? ""}`,
            file ? `\n![${d.characterId}](${file})\n` : "",
          );
        }

        // 4. 최종 승인(번역) → 그날 올림
        const first = after.find((d) => d.status === "ready");
        if (first !== undefined) {
          const approved = await call({ action: "review", id: first.id, step: "approve" });
          const draft = approved["draft"] as Draft | null;
          lines.push(
            "## 4. 최종 승인",
            "",
            `- ${first.characterId} ${first.publishOn}: ${approved["result"]} → ${draft?.status}`,
            `- 뜻: ${JSON.stringify(draft?.line.meaning ?? {})}`,
          );
          const posted = (
            await server.query("select public.companion_post_stories($1) as p", [
              `${first.publishOn}T23:00:00Z`,
            ])
          ).rows[0].p as { posted: { characterId: string; generated: boolean }[] };
          lines.push(`- 그날 23시(UTC)의 올림: ${JSON.stringify(posted.posted)}`, "");
          postedGenerated = posted.posted.some(
            (p) => p.characterId === first.characterId && p.generated,
          );
        }
      }
      lines.push("## 걸린 시간(ms)", "", "```json", JSON.stringify(usage, null, 1), "```", "");
      writeFileSync(join(outDir, "report.md"), lines.join("\n"));
      expect(listed.length).toBeGreaterThan(0);
      expect(postedGenerated).not.toBe(false);
    } finally {
      await server.end();
      await db.close();
    }
  },
);
