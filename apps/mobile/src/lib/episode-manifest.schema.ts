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
  url: z.string(),
});

export const episodeManifestSchema = z.object({
  schema: z.literal("manifest-1"),
  generated_at: z.string(),
  min_client_level: z.optional(z.int()),
  episodes: z.array(manifestEntrySchema),
});

export type DeliveryManifest = z.infer<typeof episodeManifestSchema>;
