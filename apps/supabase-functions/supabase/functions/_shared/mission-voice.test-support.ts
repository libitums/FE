// 미션 음성 핸들러 테스트의 가짜 — RPC · 인증(outbound)과 ElevenLabs · Storage(fetch). 실제 유료 호출 · 네트워크 없음.

import type { OutboundRequest } from "./delete-account.contract.ts";
import type { MissionVoiceDeps, MissionVoiceLog } from "./mission-voice-http.ts";
import { missionVoiceEnvFrom, type MissionVoiceEnv } from "./mission-voice-env.ts";
import { silentWav } from "./mission-voice-wav.ts";

export const voiceUser = "00000000-0000-4000-8000-0000000000aa";
export const voiceConversation = "00000000-0000-4000-8000-0000000000cc";
export const voiceMessage = "00000000-0000-4000-8000-0000000000dd";
export const userToken = "user-token";

export const voiceEnv = (extra: Record<string, string> = {}): MissionVoiceEnv => {
  const values: Record<string, string> = {
    SUPABASE_URL: "https://ref.supabase.co",
    SUPABASE_ANON_KEY: "anon",
    SUPABASE_SERVICE_ROLE_KEY: "service-key",
    ELEVENLABS_API_KEY: "eleven-key",
    ...extra,
  };
  return missionVoiceEnvFrom((name) => values[name])!;
};

/** Scribe 가짜 응답 하나 — 상태 · 본문, 또는 던질 오류 이름(TimeoutError · TypeError). */
export type ScribeReply = { status: number; body?: unknown } | { throws: string };

export const scribeOk = (text: string, logprobs: readonly number[]): ScribeReply => ({
  status: 200,
  body: {
    text,
    words: text.split(" ").flatMap((word, index) => [
      {
        text: word,
        type: "word",
        start: index * 0.4,
        end: index * 0.4 + 0.3,
        logprob: logprobs[index] ?? -0.01,
      },
      { text: " ", type: "spacing", start: null, end: null, logprob: 0 },
    ]),
  },
});

export type FakeVoice = {
  readonly deps: MissionVoiceDeps;
  readonly rpc: { fn: string; args: Record<string, unknown> }[];
  readonly vendor: { url: string; body: unknown }[];
  readonly logs: MissionVoiceLog[];
  readonly stored: Map<string, Uint8Array>;
};

export function fakeVoice(
  options: {
    env?: MissionVoiceEnv | null;
    begin?: Record<string, unknown>;
    scribe?: ScribeReply[];
    tts?: ({ status: number } | { throws: string })[];
    stored?: Map<string, Uint8Array>;
    signStatus?: number;
  } = {},
): FakeVoice {
  const rpc: FakeVoice["rpc"] = [];
  const vendor: FakeVoice["vendor"] = [];
  const logs: MissionVoiceLog[] = [];
  const stored = options.stored ?? new Map<string, Uint8Array>();
  const scribe = [...(options.scribe ?? [scribeOk("아메리카노 주세요", [-0.01, -0.02])])];
  const tts = [...(options.tts ?? [{ status: 200 }])];
  const reply = (status: number, body: unknown) => ({
    status,
    text: async () => (body === null ? "" : JSON.stringify(body)),
  });
  const outbound = async (request: OutboundRequest) => {
    if (request.url.endsWith("/auth/v1/user"))
      return request.headers["Authorization"] === `Bearer ${userToken}`
        ? reply(200, { id: voiceUser })
        : reply(401, {});
    const fn = /\/rpc\/([a-z_]+)$/.exec(request.url)?.[1] ?? "";
    const args = JSON.parse(request.body ?? "{}") as Record<string, unknown>;
    rpc.push({ fn, args });
    if (fn === "companion_mission_voice_begin")
      return reply(200, options.begin ?? { result: "ok", callId: "call-1", missionId: "u06-cafe" });
    return reply(200, null);
  };
  const thrown = (name: string) => Object.assign(new Error(name), { name });
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    if (url.includes("/speech-to-text")) {
      vendor.push({ url, body: init?.body });
      const next = scribe.shift() ?? { status: 500 };
      if ("throws" in next) throw thrown(next.throws);
      return new Response(next.body === undefined ? "" : JSON.stringify(next.body), {
        status: next.status,
      });
    }
    if (url.includes("/text-to-speech/")) {
      vendor.push({ url, body: JSON.parse(String(init?.body)) });
      const next = tts.shift() ?? { status: 500 };
      if ("throws" in next) throw thrown(next.throws);
      return next.status === 200
        ? new Response(new Uint8Array([0xff, 0xfb, 1, 2]), { status: 200 })
        : new Response("busy", { status: next.status });
    }
    const sign = /\/storage\/v1\/object\/sign\/companion-media\/(.+)$/.exec(url);
    if (sign !== null) {
      if (options.signStatus !== undefined) return new Response("", { status: options.signStatus });
      const path = decodeURIComponent(sign[1]!);
      return stored.has(path)
        ? Response.json({ signedURL: `/object/sign/companion-media/${sign[1]}?token=t` })
        : Response.json({ statusCode: "404", error: "not_found" }, { status: 400 });
    }
    const upload = /\/storage\/v1\/object\/companion-media\/(.+)$/.exec(url);
    if (upload !== null) {
      stored.set(decodeURIComponent(upload[1]!), new Uint8Array(init?.body as ArrayBuffer));
      return new Response("{}", { status: 200 });
    }
    return new Response("", { status: 404 });
  }) as typeof fetch;
  let now = 1_800_000_000_000;
  return {
    rpc,
    vendor,
    logs,
    stored,
    deps: {
      env: options.env === undefined ? voiceEnv() : options.env,
      outbound,
      fetch: fetchImpl,
      nowMs: () => (now += 5),
      log: (entry) => logs.push(entry),
    },
  };
}

export function sttRequest(
  options: {
    seconds?: number;
    audio?: Uint8Array;
    token?: string | null;
    conversation?: string;
  } = {},
): Request {
  const form = new FormData();
  form.append("contract_version", "1");
  form.append("conversation_id", options.conversation ?? voiceConversation);
  const audio = options.audio ?? silentWav(options.seconds ?? 1.6);
  form.append("audio", new Blob([audio as BlobPart], { type: "audio/wav" }), "clip.wav");
  return new Request("https://ref.supabase.co/functions/v1/mission-stt", {
    method: "POST",
    headers:
      options.token === null ? {} : { Authorization: `Bearer ${options.token ?? userToken}` },
    body: form,
  });
}

export function ttsRequest(body: Record<string, unknown>, token: string | null = userToken) {
  return new Request("https://ref.supabase.co/functions/v1/mission-tts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token === null ? {} : { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({ contract_version: 1, conversation_id: voiceConversation, ...body }),
  });
}
