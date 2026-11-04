import "background-only";

// 에피소드 매니페스트(`manifest-1`)의 와이어 스키마입니다. 정본은
// `docs/specs/episode-content-json-contract.md` §10. zod를 import하는 두 파일 가운데 하나입니다.
import { z } from "zod/mini";

const manifestEntrySchema = z.object({
  id: z.string(),
  order: z.int(),
  title: z.string(),
  schema: z.string(),
  version: z.string(),
  sha256: z.string().check(z.regex(/^[0-9a-f]{64}$/)),
  bytes: z.int(),
  // 선택 — 그 에피소드의 그림 · 음성 합계 바이트(ADR-0095 D3). 틀린 값이 매니페스트 전체를 버리지 않도록 여기서는
  // 무엇이든 받고 디코더가 0 이상 정수만 남깁니다.
  assets_bytes: z.optional(z.unknown()),
  url: z.string(),
  /** 표지 일러스트의 기준 상대 경로. 선택 — 옛 앱은 모르는 키로 버린다. */
  cover: z.optional(z.string()),
});

export const episodeManifestSchema = z.object({
  schema: z.literal("manifest-1"),
  generated_at: z.string(),
  min_client_level: z.optional(z.int()),
  episodes: z.array(manifestEntrySchema),
});

export type DeliveryManifest = z.infer<typeof episodeManifestSchema>;
