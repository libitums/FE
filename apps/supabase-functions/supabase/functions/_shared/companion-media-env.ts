// 스냅샷 · 음성 Edge Function(`companion-snapshot` · `companion-voice`)의 환경. Supabase 세 값이 없으면 null(500 `server_misconfigured`).
// 엔진 키는 없어도 된다 — 없으면 요청이 503 `not_configured`(어떤 이름이 빠졌는지만 알린다, 값은 싣지 않는다).

export type MediaEnvName =
  | "SUPABASE_URL"
  | "SUPABASE_ANON_KEY"
  | "SUPABASE_SERVICE_ROLE_KEY"
  | "ANTHROPIC_API_KEY"
  | "COMPANION_SNAPSHOT_MODEL"
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
  readonly openaiKey: string | null;
  readonly elevenKey: string | null;
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
