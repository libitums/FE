// 녹음 검사 — RIFF/WAVE 머리를 읽어 형식과 길이를 본다. 변환하지 않는다(앱이 16kHz mono 16-bit PCM으로 만들어 올린다).
// 대시보드 `speech_vendors.py`의 `wav_info` · `check_wav`와 같은 규칙. 순수 함수입니다.

import { MISSION_STT_MAX_SECONDS, MISSION_STT_SAMPLE_RATE } from "./companion-contract/index.ts";

export type WavInfo = {
  readonly format: number;
  readonly channels: number;
  readonly rate: number;
  readonly bits: number;
  readonly dataBytes: number;
  readonly seconds: number;
};

export type WavCheck =
  | { readonly ok: true; readonly info: WavInfo }
  | { readonly ok: false; readonly code: "invalid_audio" | "audio_too_long"; readonly why: string };

const ascii = (bytes: Uint8Array, at: number) =>
  String.fromCharCode(bytes[at]!, bytes[at + 1]!, bytes[at + 2]!, bytes[at + 3]!);

/** 머리 → 형식 · 길이. WAV가 아니면 null. `data` 크기가 실제보다 크면(스트리밍 녹음) 남은 바이트로 센다. */
export function wavInfo(bytes: Uint8Array): WavInfo | null {
  if (bytes.length < 44 || ascii(bytes, 0) !== "RIFF" || ascii(bytes, 8) !== "WAVE") return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let pos = 12;
  let fmt: Omit<WavInfo, "dataBytes" | "seconds"> | null = null;
  while (pos + 8 <= bytes.length) {
    const id = ascii(bytes, pos);
    const size = view.getUint32(pos + 4, true);
    const body = pos + 8;
    if (id === "fmt " && size >= 16 && body + 16 <= bytes.length) {
      fmt = {
        format: view.getUint16(body, true),
        channels: view.getUint16(body + 2, true),
        rate: view.getUint32(body + 4, true),
        bits: view.getUint16(body + 14, true),
      };
    } else if (id === "data") {
      if (fmt === null) return null;
      const dataBytes = Math.min(size, bytes.length - body);
      const frame = Math.max(1, (fmt.channels * fmt.bits) / 8);
      const seconds = fmt.rate > 0 ? dataBytes / frame / fmt.rate : 0;
      return { ...fmt, dataBytes, seconds: Math.round(seconds * 1000) / 1000 };
    }
    pos = body + size + (size & 1);
  }
  return null;
}

/** 16kHz · mono · 16-bit PCM이고 30초 이하인가. 짧은 녹음은 여기서 거르지 않는다(부르는 쪽이 `speech_empty`로). */
export function checkWav(bytes: Uint8Array): WavCheck {
  const info = wavInfo(bytes);
  if (info === null) return { ok: false, code: "invalid_audio", why: "not_wav" };
  if (
    info.format !== 1 ||
    info.bits !== 16 ||
    info.channels !== 1 ||
    info.rate !== MISSION_STT_SAMPLE_RATE
  )
    return { ok: false, code: "invalid_audio", why: "not_16k_mono_pcm16" };
  // 앱이 30초에서 멈추고 말끝 여유(0.3초)를 더할 수 있어 0.5초를 봐준다.
  if (info.seconds > MISSION_STT_MAX_SECONDS + 0.5)
    return { ok: false, code: "audio_too_long", why: "too_long" };
  return { ok: true, info };
}

/** 테스트 · 가짜용 — 무음 16kHz mono 16-bit WAV. */
export function silentWav(seconds: number, rate = MISSION_STT_SAMPLE_RATE): Uint8Array {
  const dataBytes = Math.round(seconds * rate) * 2;
  const out = new Uint8Array(44 + dataBytes);
  const view = new DataView(out.buffer);
  const put = (at: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) out[at + i] = text.charCodeAt(i);
  };
  put(0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  put(8, "WAVE");
  put(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  put(36, "data");
  view.setUint32(40, dataBytes, true);
  return out;
}
