// 스냅샷 · 음성 Edge Function(`companion-snapshot` · `companion-voice`)의 환경. Supabase 세 값이 없으면 null(500 `server_misconfigured`).
// 엔진 키는 없어도 된다 — 없으면 요청이 503 `not_configured`(어떤 이름이 빠졌는지만 알린다, 값은 싣지 않는다).

export type MediaEnvName =
  | "SUPABASE_URL"
  | "SUPABASE_ANON_KEY"
  | "SUPABASE_SERVICE_ROLE_KEY"
  | "ANTHROPIC_API_KEY"
  | "COMPANION_SNAPSHOT_MODEL"
  | "COMPANION_SNAPSHOT_CHECK"
  | "COMPANION_SNAPSHOT_PARTIAL_IMAGES"
  | "COMPANION_SNAPSHOT_REFS"
  | "COMPANION_SNAPSHOT_COMPLEXITY"
  | "COMPANION_SNAPSHOT_PIPELINE"
  | "OPENAI_API_KEY"
  | "ELEVENLABS_API_KEY";

export type MediaEnv = {
  readonly supabaseUrl: string;
  readonly supabaseAnonKey: string;
  readonly supabaseServiceRoleKey: string;
  /** 프롬프트 · 검사 노드(Claude). 메시지와 같은 키. */
  readonly anthropicKey: string | null;
  /** 프롬프트 · 검사 노드 모델. 기본 Haiku(lab TEXT_MODEL). */
  readonly snapshotModel: string;
  /**
   * 검사 노드(그린 그림을 Claude 비전으로 한 번 더 보기)를 돌릴지. 기본은 끔입니다 — 한 장에 약 25초가 걸려 단계를 줄였고, 안전은
   * 프롬프트 노드의 판단과 이미지 엔진 자체의 거절이 맡습니다(ADR-0152). `COMPANION_SNAPSHOT_CHECK=on`으로 다시 켭니다.
   */
  readonly snapshotCheck: boolean;
  /**
   * 이미지 엔진에서 받을 중간 그림 수(0 ~ 3, 기본 0 — 편집 · Flare에서 중간 그림이 오지 않아 끔). 중간 그림은 `<user>/<media>.preview.png`로 올려
   * 앱이 만드는 중에 흐리게 먼저 보인다(`media.previewPath`). 한 장마다 이미지 출력 토큰 100개(약 $0.003)가 더 든다.
   */
  readonly snapshotPartialImages: number;
  /** 기준 그림 — `all`(시트 + 표정 시트, 기본) · `sheet`(시트 한 장만, 입력 토큰을 줄인다). */
  readonly snapshotRefs: "all" | "sheet";
  /**
   * 이미지 엔진의 `complexity`(그리기 전 계획 정도 — low · medium · high). 기본은 보내지 않음이다 — `gpt-image-2.5-flare`가 이 값을 받지
   * 않아 400(「Complexity 'medium' is not supported for this image model」)으로 모든 스냅샷이 실패했다(2026-11-17). 받는 엔진(2.6)에서만 켠다.
   */
  readonly snapshotComplexity: "low" | "medium" | "high" | null;
  /**
   * 스냅샷 방식(ADR-0179). `v1`(기본) · `v2m`(장면 설계 + 미리 합친 기준 그림, 모두) · `v2m-test`(시험 계정만 v2m, 나머지는 v1).
   * v2m이어도 그 인물의 묶음(`companion-refs/v2/<slug>/manifest.json`)이 없으면 v1으로 그린다.
   */
  readonly snapshotPipeline: SnapshotPipeline;
  readonly openaiKey: string | null;
  readonly elevenKey: string | null;
};

/** 기본 중간 그림 수. 빈 값 · 숫자 아님은 기본, 범위 밖은 0 ~ 3으로 자른다. */
export const defaultPartialImages = 0;
const partialImagesFrom = (raw: string | null) => {
  const n = raw === null ? Number.NaN : Number(raw);
  return Number.isFinite(n) ? Math.max(0, Math.min(3, Math.trunc(n))) : defaultPartialImages;
};

/** 기본 `complexity`(보내지 않음). 빈 값 · 모르는 값 · `off`는 보내지 않음. */
export const defaultComplexity = null;
const complexityFrom = (raw: string | null): "low" | "medium" | "high" | null => {
  const v = raw?.toLowerCase() ?? null;
  return v === "low" || v === "medium" || v === "high" ? v : defaultComplexity;
};

export type SnapshotPipeline = "v1" | "v2m" | "v2m-test";
/** 기본 v1. 모르는 값도 v1. */
export const defaultSnapshotPipeline: SnapshotPipeline = "v1";
const pipelineFrom = (raw: string | null): SnapshotPipeline => {
  const v = raw?.toLowerCase() ?? null;
  return v === "v2m" || v === "v2m-test" ? v : defaultSnapshotPipeline;
};

/** lab `TEXT_MODEL`과 같다. */
export const defaultSnapshotModel = "claude-haiku-5-5";

export function mediaEnvFrom(read: (name: MediaEnvName) => string | undefined): MediaEnv | null {
  const value = (name: MediaEnvName): string | null => {
    const trimmed = read(name)?.trim() ?? "";
    return trimmed === "" ? null : trimmed;
  };
  const rawUrl = value("SUPABASE_URL");
  const supabaseAnonKey = value("SUPABASE_ANON_KEY");
  const supabaseServiceRoleKey = value("SUPABASE_SERVICE_ROLE_KEY");
  if (rawUrl === null || supabaseAnonKey === null || supabaseServiceRoleKey === null) return null;
  // 로컬 스택(`supabase start`)은 http다. 운영은 https만 받는다(chat-send와 같은 규칙).
  if (
    !rawUrl.startsWith("https://") &&
    !/^http:\/\/(127\.0\.0\.1|localhost|kong)(:\d+)?/.test(rawUrl)
  )
    return null;
  return {
    supabaseUrl: rawUrl.replace(/\/+$/, ""),
    supabaseAnonKey,
    supabaseServiceRoleKey,
    anthropicKey: value("ANTHROPIC_API_KEY"),
    snapshotModel: value("COMPANION_SNAPSHOT_MODEL") ?? defaultSnapshotModel,
    snapshotCheck: value("COMPANION_SNAPSHOT_CHECK")?.toLowerCase() === "on",
    snapshotPartialImages: partialImagesFrom(value("COMPANION_SNAPSHOT_PARTIAL_IMAGES")),
    snapshotRefs: value("COMPANION_SNAPSHOT_REFS")?.toLowerCase() === "sheet" ? "sheet" : "all",
    snapshotComplexity: complexityFrom(value("COMPANION_SNAPSHOT_COMPLEXITY")),
    snapshotPipeline: pipelineFrom(value("COMPANION_SNAPSHOT_PIPELINE")),
    openaiKey: value("OPENAI_API_KEY"),
    elevenKey: value("ELEVENLABS_API_KEY"),
  };
}

/** 이 종류에 빠진 키 이름(값 아님). 스냅샷은 Claude + OpenAI, 음성은 ElevenLabs. */
export function missingKeys(env: MediaEnv, kind: "snapshot" | "voice"): string[] {
  if (kind === "voice") return env.elevenKey === null ? ["ELEVENLABS_API_KEY"] : [];
  return [
    ...(env.anthropicKey === null ? ["ANTHROPIC_API_KEY"] : []),
    ...(env.openaiKey === null ? ["OPENAI_API_KEY"] : []),
  ];
}
